<script lang="ts">
  import { onMount } from 'svelte';
  import { gmailAccessToken, appData } from '$lib/stores';
  import { auth, googleProvider } from '$lib/firebase';
  import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, linkWithRedirect } from 'firebase/auth';
  import { Mail, Search, RefreshCw, PenSquare, ArrowLeft, MoreVertical, Archive, Trash2, Reply, Paperclip } from '@lucide/svelte';
  import ComposeEmailModal from '$lib/components/ComposeEmailModal.svelte';

  let loading = $state(false);
  let connecting = $state(false);
  let error = $state('');
  let messages = $state<any[]>([]);
  let selectedMessage = $state<any>(null);
  let selectedMessageContent = $state('');
  let loadingMessage = $state(false);
  let isComposeOpen = $state(false);
  let searchQuery = $state('');

  // Extract header value helper
  function getHeader(headers: any[], name: string) {
    const h = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  }

  // Parse email body
  function getBody(payload: any): string {
    let body = '';
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html') {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          break;
        } else if (part.mimeType === 'text/plain') {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (part.parts) {
          body = getBody(part);
          if (body) break;
        }
      }
    } else if (payload.body && payload.body.data) {
      body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
    return body;
  }

  async function connectGmail() {
    connecting = true;
    error = '';
    try {
      if (auth.currentUser) {
        await linkWithRedirect(auth.currentUser, googleProvider);
      } else {
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (err: any) {
      if (err.code === 'auth/provider-already-linked' || err.code === 'auth/credential-already-in-use') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch(e: any) {
          error = e.message;
          connecting = false;
        }
      } else {
        console.error(err);
        error = err.message;
        connecting = false;
      }
    }
  }

  async function fetchInbox() {
    if (!$gmailAccessToken) return;
    loading = true;
    error = '';
    messages = [];
    selectedMessage = null;

    try {
      // Build dynamic query based on tracked colleges, fallback to general terms if none
      let defaultQuery = 'university OR college OR admissions OR "application"';
      if ($appData.colleges && $appData.colleges.length > 0) {
        const schoolNames = $appData.colleges.map(c => `"${c.school}"`);
        defaultQuery = `(${schoolNames.join(' OR ')}) OR admissions`;
      }
      const q = searchQuery ? encodeURIComponent(searchQuery) : encodeURIComponent(defaultQuery);

      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${q}`, {
        headers: { 'Authorization': `Bearer ${$gmailAccessToken}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 401) {
          gmailAccessToken.set(null); // Token expired
          throw new Error('Session expired: ' + errorText);
        }
        throw new Error('Failed to fetch messages (Status ' + res.status + '): ' + errorText);
      }

      const data = await res.json();
      if (!data.messages) {
        loading = false;
        return;
      }

      // Fetch metadata for each message
      const msgPromises = data.messages.map(async (m: any) => {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
          headers: { 'Authorization': `Bearer ${$gmailAccessToken}` }
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          return {
            id: msgData.id,
            threadId: msgData.threadId,
            snippet: msgData.snippet,
            internalDate: parseInt(msgData.internalDate),
            subject: getHeader(msgData.payload.headers, 'Subject') || '(No Subject)',
            from: getHeader(msgData.payload.headers, 'From'),
            date: getHeader(msgData.payload.headers, 'Date'),
            unread: msgData.labelIds.includes('UNREAD')
          };
        }
        return null;
      });

      const results = await Promise.all(msgPromises);
      messages = results.filter(Boolean).sort((a, b) => b.internalDate - a.internalDate);
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function openMessage(msg: any) {
    selectedMessage = msg;
    selectedMessageContent = '';
    loadingMessage = true;

    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { 'Authorization': `Bearer ${$gmailAccessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        let body = getBody(data.payload);
        
        // Remove tracking pixels and basic script sanitization
        body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        selectedMessageContent = body || data.snippet;

        // Mark as read
        if (msg.unread) {
          await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${$gmailAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
          });
          msg.unread = false;
        }
      }
    } catch (err: any) {
      console.error(err);
      selectedMessageContent = 'Failed to load email content.';
    } finally {
      loadingMessage = false;
    }
  }

  function formatTime(timestamp: number) {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function parseFrom(fromStr: string) {
    const match = fromStr.match(/^(.*?)\s*<.*>$/);
    return match ? match[1].replace(/"/g, '') : fromStr;
  }

  onMount(async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential && credential.accessToken) {
          gmailAccessToken.set(credential.accessToken);
          await fetchInbox();
        } else {
          error = 'Authentication successful, but Google did not return an Access Token. Please try again.';
        }
      } else if ($gmailAccessToken) {
        fetchInbox();
      }
    } catch (err: any) {
      if (err.code === 'auth/credential-already-in-use') {
         await signInWithRedirect(auth, googleProvider);
      } else {
        error = err.message;
      }
    }
  });
</script>

<header class="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
  <div>
    <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight">Inbox</h1>
    <p class="text-slate-500 mt-2 text-lg font-medium">Read and send application emails without leaving your dashboard.</p>
  </div>
  
  {#if $gmailAccessToken}
    <div>
      <button class="btn-primary w-full sm:w-auto" onclick={() => isComposeOpen = true}>
        <PenSquare size={20} />
        Compose
      </button>
    </div>
  {/if}
</header>

{#if !$gmailAccessToken}
  <div class="glass-panel p-16 flex flex-col items-center justify-center text-center mt-8">
    <div class="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-sm">
      <Mail size={40} strokeWidth={1.5} />
    </div>
    <h2 class="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Connect your Gmail</h2>
    <p class="text-slate-500 font-medium max-w-lg mx-auto mb-10 text-lg">
      Link your Google account to read responses from recruiters, send follow-ups, and manage your application communications securely.
    </p>
    {#if error}
      <div class="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100">{error}</div>
    {/if}
    <button class="btn-primary px-8 py-4 text-lg" onclick={connectGmail} disabled={connecting}>
      {#if connecting}
        <RefreshCw class="animate-spin" size={24} />
        Connecting...
      {:else}
        <svg viewBox="0 0 24 24" class="w-6 h-6 mr-2"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.064 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.823l-4.04 3.067A11.965 11.965 0 0012 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90E2" d="M23.983 12.279c0-.812-.07-1.583-.2-2.311H12v4.46h6.811c-.31 1.57-1.233 2.842-2.52 3.655l3.794 2.986c2.22-2.008 3.553-5.023 3.553-8.79Z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/></svg>
        Connect with Google
      {/if}
    </button>
    <p class="mt-6 text-sm font-semibold text-slate-400">Read-only access to messages + ability to send new emails.</p>
  </div>
{:else}
  <div class="glass-panel h-[800px] flex overflow-hidden border border-slate-200/60 shadow-xl shadow-slate-200/40">
    
    <!-- Left Sidebar: Message List -->
    <div class="w-full md:w-2/5 lg:w-[400px] flex flex-col border-r border-slate-100 bg-white/50 {selectedMessage ? 'hidden md:flex' : 'flex'}">
      
      <!-- List Header -->
      <div class="p-4 border-b border-slate-100">
        <div class="relative">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search emails..." bind:value={searchQuery} onkeydown={(e) => e.key === 'Enter' && fetchInbox()} class="w-full pl-10 pr-10 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 text-slate-700 outline-none transition-all" />
          <button class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg" onclick={fetchInbox} aria-label="Refresh">
            <RefreshCw size={14} class={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <!-- List Content -->
      <div class="flex-1 overflow-y-auto custom-scroll">
        {#if loading}
          <div class="p-8 text-center text-slate-400 font-medium">Loading messages...</div>
        {:else if messages.length === 0}
          <div class="p-8 text-center text-slate-400 font-medium">No messages found.</div>
        {:else}
          {#each messages as msg}
            <button class="w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-1 {selectedMessage?.id === msg.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}" onclick={() => openMessage(msg)}>
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold text-sm truncate {msg.unread ? 'text-slate-900' : 'text-slate-600'}">{parseFrom(msg.from)}</span>
                <span class="text-xs font-bold text-slate-400 whitespace-nowrap">{formatTime(msg.internalDate)}</span>
              </div>
              <div class="font-bold text-sm truncate {msg.unread ? 'text-slate-900' : 'text-slate-500'}">{msg.subject}</div>
              <div class="text-xs font-medium text-slate-400 truncate mt-0.5">{msg.snippet.replace(/&#39;/g, "'").replace(/&quot;/g, '"')}</div>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Right Pane: Message Viewer -->
    <div class="flex-1 flex flex-col bg-white {selectedMessage ? 'flex' : 'hidden md:flex'} relative">
      {#if !selectedMessage}
        <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <Mail size={48} strokeWidth={1} class="mb-4 text-slate-200" />
          <p class="font-medium text-lg">Select a message to read</p>
        </div>
      {:else}
        <!-- Reading Pane Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
          <div class="flex items-center gap-4">
            <button class="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors" onclick={() => selectedMessage = null}>
              <ArrowLeft size={20} />
            </button>
            <div class="flex gap-2">
              <button class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Reply">
                <Reply size={18} />
              </button>
              <button class="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors" title="Archive">
                <Archive size={18} />
              </button>
              <button class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          <button class="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>

        <!-- Reading Pane Content -->
        <div class="flex-1 overflow-y-auto custom-scroll p-6 lg:p-10">
          <h2 class="text-2xl font-extrabold text-slate-900 mb-6">{selectedMessage.subject}</h2>
          
          <div class="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl flex items-center justify-center">
                {parseFrom(selectedMessage.from).charAt(0).toUpperCase()}
              </div>
              <div>
                <p class="font-bold text-slate-900">{parseFrom(selectedMessage.from)}</p>
                <p class="text-sm font-medium text-slate-500">to me</p>
              </div>
            </div>
            <div class="text-sm font-bold text-slate-400 text-right">
              {new Date(selectedMessage.internalDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>

          {#if loadingMessage}
            <div class="animate-pulse space-y-4">
              <div class="h-4 bg-slate-100 rounded w-3/4"></div>
              <div class="h-4 bg-slate-100 rounded w-1/2"></div>
              <div class="h-4 bg-slate-100 rounded w-5/6"></div>
            </div>
          {:else}
            <!-- Render HTML body -->
            <div class="prose prose-slate prose-indigo max-w-none">
              {@html selectedMessageContent}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<ComposeEmailModal bind:isOpen={isComposeOpen} />

<style>
  .custom-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scroll::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  .custom-scroll::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  /* Target the HTML content inside the prose class to ensure it's readable */
  :global(.prose img) {
    max-width: 100%;
    height: auto;
  }
  :global(.prose a) {
    color: #4f46e5;
    text-decoration: underline;
  }
</style>
