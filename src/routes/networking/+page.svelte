<script lang="ts">
  import { appData } from '$lib/stores';
  import type { NetworkingContact } from '$lib/types';
  import { Plus, Users, Link, Mail, Trash2, Calendar, Target, Sparkles } from 'lucide-svelte';

  let contacts = $derived($appData.networkingContacts || []);
  
  let showModal = $state(false);
  let editingId = $state<string | null>(null);
  let isGenerating = $state(false);

  let newContact = $state<Partial<NetworkingContact>>({
    name: '',
    role: '',
    company: '',
    status: 'To Reach Out',
    linkedInUrl: '',
    email: '',
    notes: ''
  });

  const statuses = ['To Reach Out', 'Messaged', 'Chat Scheduled', 'Referral Secured', 'Ghosted'];

  async function generateIcebreaker() {
    if (!newContact.name || !newContact.company) {
      alert("Please enter the contact's Name and Company first!");
      return;
    }
    
    isGenerating = true;
    
    // Simulate AI delay
    await new Promise(r => setTimeout(r, 1500));
    
    const template = `Hi ${newContact.name.split(' ')[0]},\n\nI noticed your transition to ${newContact.role} at ${newContact.company} and was really impressed by the team's recent work. I'm currently exploring opportunities in this space and would love to ask you two quick questions about your experience at ${newContact.company} if you have 5 minutes this week.\n\nBest,\n[Your Name]`;
    
    newContact.notes = newContact.notes ? `${newContact.notes}\n\n-- AI Generated Icebreaker --\n${template}` : `-- AI Generated Icebreaker --\n${template}`;
    isGenerating = false;
  }

  function saveContact() {
    if (!newContact.name || !newContact.company) return;

    $appData.networkingContacts = $appData.networkingContacts || [];
    
    if (editingId) {
      $appData.networkingContacts = $appData.networkingContacts.map(c => 
        c.id === editingId ? { ...c, ...newContact, lastContactDate: Date.now() } as NetworkingContact : c
      );
    } else {
      $appData.networkingContacts = [
        {
          id: crypto.randomUUID(),
          ...newContact,
          createdAt: Date.now(),
          lastContactDate: Date.now()
        } as NetworkingContact,
        ...$appData.networkingContacts
      ];
    }

    import('$lib/stores').then(({ saveUserData }) => saveUserData());
    closeModal();
  }

  function deleteContact(id: string) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    $appData.networkingContacts = $appData.networkingContacts?.filter(c => c.id !== id) || [];
    import('$lib/stores').then(({ saveUserData }) => saveUserData());
  }

  function openModal(contact?: NetworkingContact) {
    if (contact) {
      editingId = contact.id;
      newContact = { ...contact };
    } else {
      editingId = null;
      newContact = {
        name: '',
        role: '',
        company: '',
        status: 'To Reach Out',
        linkedInUrl: '',
        email: '',
        notes: ''
      };
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingId = null;
  }
</script>

<svelte:head>
  <title>Networking CRM | Panacea</title>
</svelte:head>

<div class="h-full flex flex-col fade-in max-w-7xl mx-auto">
  <!-- Header -->
  <header class="flex items-center justify-between mb-8 px-2">
    <div>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
        <Users class="text-indigo-500" size={32} />
        Networking CRM
      </h1>
      <p class="text-slate-500 font-medium mt-1">Track recruiters, alumni, and secure those referrals.</p>
    </div>
    
    <button 
      class="btn-primary"
      onclick={() => openModal()}
    >
      <Plus size={18} /> Add Contact
    </button>
  </header>

  <!-- Kanban Board -->
  <div class="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scroll snap-x">
    {#each statuses as status}
      <div class="flex-none w-80 flex flex-col snap-start">
        <div class="flex items-center justify-between mb-4 px-2">
          <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">{status}</h3>
          <span class="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-full">
            {contacts.filter(c => c.status === status).length}
          </span>
        </div>
        
        <div class="flex-1 flex flex-col gap-4 min-h-[100px] p-2 bg-slate-50/50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
          {#each contacts.filter(c => c.status === status) as contact}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onclick={() => openModal(contact)}
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-bold text-slate-900 dark:text-white leading-tight">{contact.name}</h4>
                  <p class="text-xs text-slate-500">{contact.role}</p>
                </div>
                <button 
                  class="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onclick={(e) => { e.stopPropagation(); deleteContact(contact.id); }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div class="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3 bg-indigo-50 dark:bg-indigo-500/10 w-fit px-2 py-1 rounded-lg">
                <Target size={12} /> {contact.company}
              </div>

              <div class="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                {#if contact.linkedInUrl}
                  <a href={contact.linkedInUrl} target="_blank" onclick={e => e.stopPropagation()} class="text-slate-400 hover:text-[#0A66C2] transition-colors" title="LinkedIn">
                    <Link size={16} />
                  </a>
                {/if}
                {#if contact.email}
                  <a href="mailto:{contact.email}" onclick={e => e.stopPropagation()} class="text-slate-400 hover:text-emerald-500 transition-colors" title="Email">
                    <Mail size={16} />
                  </a>
                {/if}
                <div class="ml-auto text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {contact.lastContactDate ? new Date(contact.lastContactDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Never'}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Add/Edit Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div class="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div class="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {editingId ? 'Edit Contact' : 'New Contact'}
        </h2>
        <button class="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onclick={closeModal} aria-label="Close Modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div class="p-6 overflow-y-auto custom-scroll space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="nameInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Name</label>
            <input id="nameInput" type="text" class="input-field" bind:value={newContact.name} placeholder="e.g. Jane Doe" />
          </div>
          <div class="space-y-1">
            <label for="companyInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Company</label>
            <input id="companyInput" type="text" class="input-field" bind:value={newContact.company} placeholder="e.g. Google" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="roleInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Role</label>
            <input id="roleInput" type="text" class="input-field" bind:value={newContact.role} placeholder="e.g. Senior Recruiter" />
          </div>
          <div class="space-y-1">
            <label for="statusInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
            <select id="statusInput" class="input-field" bind:value={newContact.status}>
              {#each statuses as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="linkedinInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">LinkedIn URL</label>
            <input id="linkedinInput" type="url" class="input-field" bind:value={newContact.linkedInUrl} placeholder="https://linkedin.com/in/..." />
          </div>
          <div class="space-y-1">
            <label for="emailInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
            <input id="emailInput" type="email" class="input-field" bind:value={newContact.email} placeholder="jane@google.com" />
          </div>
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label for="notesInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes & Icebreaker</label>
            <button class="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-1" onclick={generateIcebreaker} disabled={isGenerating}>
              {#if isGenerating}
                <div class="w-3 h-3 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              {:else}
                <Sparkles size={12} />
              {/if}
              {isGenerating ? 'Generating...' : 'AI Icebreaker'}
            </button>
          </div>
          <textarea id="notesInput" class="input-field min-h-[100px] resize-y" bind:value={newContact.notes} placeholder="Met at career fair. Needs follow up next week..."></textarea>
        </div>
      </div>

      <div class="p-6 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
        <button class="btn-secondary" onclick={closeModal}>Cancel</button>
        <button class="btn-primary" onclick={saveContact}>
          {editingId ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </div>
  </div>
{/if}
