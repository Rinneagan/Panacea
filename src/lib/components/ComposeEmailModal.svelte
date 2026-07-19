<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { X, Send, Paperclip, Sparkles } from '@lucide/svelte';
  import { gmailAccessToken, appData } from '$lib/stores';

  let { isOpen = $bindable(false) } = $props();

  let to = $state('');
  let subject = $state('');
  let body = $state('');
  let sending = $state(false);
  let error = $state('');
  let success = $state(false);

  function close() {
    isOpen = false;
    // reset after close animation
    setTimeout(() => {
      to = '';
      subject = '';
      body = '';
      error = '';
      success = false;
    }, 300);
  }

  function autoDraft() {
    const jobs = $appData.jobs;
    const recent = jobs[jobs.length - 1]; // Get most recently added job
    if (recent) {
      subject = `Application Follow-up: ${recent.role || 'Open Position'} at ${recent.company || 'your company'}`;
      body = `Hi Team,\n\nI hope you're having a great week.\n\nI recently applied for the ${recent.role || 'Open Position'} role at ${recent.company || 'your company'} and wanted to quickly follow up. I'm very excited about the opportunity and would love to chat about how my background aligns with your team's goals.\n\nPlease let me know if you need any additional information.\n\nBest,\n[Your Name]`;
    } else {
      subject = "Application Follow-up";
      body = `Hi Team,\n\nI am writing to follow up on my recent application.\n\nBest,\n[Your Name]`;
    }
  }

  async function handleSend() {
    if (!to || !subject || !body) {
      error = 'Please fill out all fields.';
      return;
    }
    if (!$gmailAccessToken) {
      error = 'Not connected to Gmail. Please refresh the inbox.';
      return;
    }

    sending = true;
    error = '';
    
    try {
      // Create raw email string
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body.replace(/\n/g, '<br>')
      ];
      
      const emailRaw = btoa(emailLines.join('\r\n')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${$gmailAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: emailRaw })
      });

      if (!res.ok) {
        throw new Error('Failed to send email. Ensure you granted Send permissions.');
      }

      success = true;
      setTimeout(() => close(), 1500);
    } catch (err: any) {
      error = err.message;
    } finally {
      sending = false;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6"
       transition:fade={{ duration: 200 }}
       onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    
    <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-100"
         transition:scale={{ duration: 300, start: 0.95, opacity: 0 }}>
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 class="text-xl font-bold text-slate-800 tracking-tight">New Message</h2>
        <div class="flex items-center gap-3">
          <button class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-indigo-100" onclick={autoDraft}>
            <Sparkles size={14} /> AI Draft
          </button>
          <button class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all" onclick={close} aria-label="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col p-6 gap-4">
        {#if success}
          <div class="absolute inset-0 z-10 bg-white/90 backdrop-blur flex flex-col items-center justify-center text-emerald-600">
            <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Send size={28} />
            </div>
            <p class="text-xl font-bold">Sent successfully!</p>
          </div>
        {/if}

        <div class="flex items-center gap-4 pb-2 border-b border-slate-100">
          <label for="to" class="text-sm font-bold text-slate-400 w-12">To:</label>
          <input type="email" id="to" bind:value={to} placeholder="recruiter@company.com" class="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 font-medium placeholder-slate-300 outline-none p-0" />
        </div>
        
        <div class="flex items-center gap-4 pb-2 border-b border-slate-100">
          <label for="subject" class="text-sm font-bold text-slate-400 w-12">Subj:</label>
          <input type="text" id="subject" bind:value={subject} placeholder="Following up on my application..." class="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 font-bold placeholder-slate-300 outline-none p-0" />
        </div>

        <div class="flex-1 mt-2">
          <textarea bind:value={body} placeholder="Write your message here..." class="w-full h-64 sm:h-80 bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-300 outline-none p-0 resize-none font-medium"></textarea>
        </div>
        
        {#if error}
          <div class="p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-600">
            {error}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button class="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" aria-label="Attach file">
          <Paperclip size={20} />
        </button>
        <button class="btn-primary px-8" onclick={handleSend} disabled={sending}>
          {#if sending}
            Sending...
          {:else}
            <Send size={18} class="mr-2" />
            Send Email
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
