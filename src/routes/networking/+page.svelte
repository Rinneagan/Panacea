<script lang="ts">
  import { appData } from '$lib/stores';
  import type { NetworkingContact } from '$lib/types';
  import { Plus, Users, Link, Mail, Trash2, Calendar, Target, Sparkles, UserCheck, RefreshCw, Copy, Check, Microscope } from 'lucide-svelte';
  import FacultyResearchModal from '$lib/components/FacultyResearchModal.svelte';

  let contacts = $derived($appData.networkingContacts || []);

  let showResearch = $state(false);
  let showModal = $state(false);
  let editingId = $state<string | null>(null);
  let isGenerating = $state(false);
  let copiedText = $state(false);

  let outreachGoal = $state<'Coffee Chat' | 'Referral' | 'Alumni Insight' | 'Post-Interview'>('Coffee Chat');
  let outreachTone = $state<'Professional' | 'Casual' | 'Alumni'>('Professional');

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

  const SAMPLE_CONTACTS: Omit<NetworkingContact, 'id' | 'createdAt' | 'lastContactDate'>[] = [
    {
      name: 'Jane Doe',
      role: 'Senior Technical Recruiter',
      company: 'Google',
      status: 'To Reach Out',
      linkedInUrl: 'https://linkedin.com/in/janedoe-recruiter',
      email: 'jane.doe@google.com',
      notes: 'Focuses on SWE and Systems Roles. Met during Stanford Virtual Career Fair.'
    },
    {
      name: 'Alex Chen',
      role: 'Staff Software Engineer',
      company: 'Meta',
      status: 'Messaged',
      linkedInUrl: 'https://linkedin.com/in/alexchen-swe',
      email: 'alexchen@meta.com',
      notes: 'Stanford CS Alumni (\'20). Interested in distributed infrastructure.'
    },
    {
      name: 'Dr. Sarah Jenkins',
      role: 'Associate Dean of Admissions',
      company: 'Stanford University',
      status: 'Chat Scheduled',
      linkedInUrl: 'https://linkedin.com/in/sjenkins-admissions',
      email: 'sjenkins@stanford.edu',
      notes: 'Scheduled 15-min call to discuss research alignment in Computer Systems.'
    },
    {
      name: 'Michael Vance',
      role: 'Engagement Manager',
      company: 'McKinsey & Company',
      status: 'Referral Secured',
      linkedInUrl: 'https://linkedin.com/in/mvance-mckinsey',
      email: 'michael_vance@mckinsey.com',
      notes: 'Agreed to submit internal employee referral for Associate role!'
    },
    {
      name: 'Elena Rostova',
      role: 'Partner',
      company: 'Sequoia Capital',
      status: 'Ghosted',
      linkedInUrl: 'https://linkedin.com/in/elena-rostova-vc',
      email: 'elena@sequoiacap.com',
      notes: 'Sent cold LinkedIn message 3 weeks ago; no response yet.'
    }
  ];

  function seedSampleContacts() {
    $appData.networkingContacts = $appData.networkingContacts || [];
    const now = Date.now();
    const newItems = SAMPLE_CONTACTS.map((c, i) => ({
      ...c,
      id: crypto.randomUUID(),
      createdAt: now - i * 86400000,
      lastContactDate: now - i * 43200000
    })) as NetworkingContact[];

    $appData.networkingContacts = [...newItems, ...$appData.networkingContacts];
    import('$lib/stores').then(({ saveUserData }) => saveUserData());
  }

  async function generateIcebreaker() {
    if (!newContact.name || !newContact.company) {
      alert("Please enter the contact's Name and Company first!");
      return;
    }
    
    isGenerating = true;
    await new Promise(r => setTimeout(r, 1000));

    const firstName = newContact.name.split(' ')[0] || newContact.name;
    const company = newContact.company || 'your team';
    const role = newContact.role || 'your role';

    let draft = '';

    if (outreachGoal === 'Coffee Chat') {
      if (outreachTone === 'Casual') {
        draft = `Hi ${firstName},\n\nHope you're having a great week! I came across your profile and loved seeing your work as a ${role} at ${company}. As someone passionate about building in this space, I'd love to grab 10 minutes for a quick virtual coffee to learn more about your journey and any advice you'd share for breaking in.\n\nBest,\n[Your Name]`;
      } else if (outreachTone === 'Alumni') {
        draft = `Hi ${firstName},\n\nFellow university student here! I noticed you graduated from our school and transitioned into ${role} at ${company}. I'm currently preparing for upcoming application cycles and would really value hearing about your experience there if you have 10 minutes this week.\n\nWarm regards,\n[Your Name]`;
      } else {
        draft = `Dear ${firstName},\n\nI hope this message finds you well. I am currently exploring opportunities in ${company}'s domain and was particularly impressed by your track record as a ${role}. Would you be open to a brief 15-minute informational chat to discuss your team's current technical focus?\n\nSincerely,\n[Your Name]`;
      }
    } else if (outreachGoal === 'Referral') {
      draft = `Hi ${firstName},\n\nI recently applied for the open position at ${company} and wanted to reach out directly. Given your leadership as ${role}, I know how strong the engineering culture is at ${company}. If you feel comfortable, I would be deeply grateful for an employee referral or a brief moment to share my background.\n\nBest regards,\n[Your Name]`;
    } else if (outreachGoal === 'Post-Interview') {
      draft = `Hi ${firstName},\n\nThank you so much for taking the time to speak with me today about the ${role} position at ${company}! I really enjoyed our conversation regarding team priorities. Our chat reinforced my enthusiasm for joining ${company}. Looking forward to next steps!\n\nBest,\n[Your Name]`;
    } else {
      draft = `Hi ${firstName},\n\nI wanted to reach out as I've been closely following ${company}'s recent initiatives. I'd love to learn more about your perspective as ${role}.\n\nBest,\n[Your Name]`;
    }

    const separator = `-- AI Generated ${outreachGoal} (${outreachTone}) --`;
    newContact.notes = newContact.notes ? `${newContact.notes}\n\n${separator}\n${draft}` : `${separator}\n${draft}`;
    isGenerating = false;
  }

  function copyNotes() {
    if (!newContact.notes) return;
    navigator.clipboard.writeText(newContact.notes);
    copiedText = true;
    setTimeout(() => copiedText = false, 2000);
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
  <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-2">
    <div>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
        <Users class="text-indigo-500" size={32} />
        Networking CRM
      </h1>
      <p class="text-slate-500 font-medium mt-1">Track recruiters, alumni, and secure high-value referrals.</p>
    </div>
    
    <div class="flex items-center gap-3">
      {#if contacts.length === 0}
        <button
          class="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 font-bold rounded-xl text-sm transition-all border border-slate-200 dark:border-white/10"
          onclick={seedSampleContacts}
          title="Load 5 demo contacts to explore the board"
        >
          <UserCheck size={16} /> Load Demo
        </button>
      {/if}

      <button
        class="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-indigo-500/20"
        onclick={() => showResearch = true}
      >
        <Microscope size={16} /> Research Faculty
      </button>

      <button
        class="btn-primary"
        onclick={() => openModal()}
      >
        <Plus size={18} /> Add Contact
      </button>
    </div>
  </header>

  {#if contacts.length === 0}
    <!-- Empty State Seeder Banner -->
    <div class="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-3xl p-8 mb-6 text-center flex flex-col items-center max-w-2xl mx-auto">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
        <Microscope size={32} />
      </div>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Research Real Faculty, Not Mock Data</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
        Enter a school and major — Panacea pulls real professors in that field from the OpenAlex academic database, finds their research, contact, and drafts tailored outreach you can send.
      </p>
      <button
        class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all"
        onclick={() => showResearch = true}
      >
        <Microscope size={18} /> Research Faculty
      </button>
      <button
        class="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        onclick={seedSampleContacts}
      >
        or load 5 demo contacts to explore the board
      </button>
    </div>
  {/if}

  <!-- Kanban Board -->
  <div class="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scroll snap-x">
    {#each statuses as status}
      <div class="flex-none w-80 flex flex-col snap-start">
        <div class="flex items-center justify-between mb-4 px-2">
          <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">{status}</h3>
          <span class="text-xs font-bold px-2.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-full">
            {contacts.filter(c => c.status === status).length}
          </span>
        </div>
        
        <div class="flex-1 flex flex-col gap-4 min-h-[120px] p-2 bg-slate-50/50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
          {#each contacts.filter(c => c.status === status) as contact}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onclick={() => openModal(contact)}
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-500 transition-colors">{contact.name}</h4>
                  <p class="text-xs text-slate-500 font-medium">{contact.role}</p>
                </div>
                <button 
                  class="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  onclick={(e) => { e.stopPropagation(); deleteContact(contact.id); }}
                  title="Delete Contact"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3 bg-indigo-50 dark:bg-indigo-500/10 w-fit px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                <Target size={12} /> {contact.company}
              </div>

              {#if contact.notes}
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 bg-slate-50 dark:bg-white/5 p-2 rounded-lg font-medium">
                  {contact.notes.replace(/--[\s\S]*?--/g, '')}
                </p>
              {/if}

              <div class="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                {#if contact.linkedInUrl}
                  <a href={contact.linkedInUrl} target="_blank" onclick={e => e.stopPropagation()} class="text-slate-400 hover:text-[#0A66C2] transition-colors" title="LinkedIn Profile">
                    <Link size={16} />
                  </a>
                {/if}
                {#if contact.email}
                  <a href="mailto:{contact.email}" onclick={e => e.stopPropagation()} class="text-slate-400 hover:text-emerald-500 transition-colors" title="Email Contact">
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
    <div class="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div class="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
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
            <label for="nameInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Name <span class="text-rose-500">*</span></label>
            <input id="nameInput" type="text" class="input-field" bind:value={newContact.name} placeholder="e.g. Jane Doe" />
          </div>
          <div class="space-y-1">
            <label for="companyInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Company / University <span class="text-rose-500">*</span></label>
            <input id="companyInput" type="text" class="input-field" bind:value={newContact.company} placeholder="e.g. Google or Stanford" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="roleInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Role / Title</label>
            <input id="roleInput" type="text" class="input-field" bind:value={newContact.role} placeholder="e.g. Senior Recruiter" />
          </div>
          <div class="space-y-1">
            <label for="statusInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Pipeline Status</label>
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
            <label for="emailInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
            <input id="emailInput" type="email" class="input-field" bind:value={newContact.email} placeholder="jane@example.com" />
          </div>
        </div>

        <!-- AI Outreach Generator Controls -->
        <div class="bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 p-4 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} class="text-indigo-500" /> AI Cold Outreach Generator
            </h4>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="outreachGoalSelect" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Goal</label>
              <select id="outreachGoalSelect" class="input-field !py-1.5 !text-xs" bind:value={outreachGoal}>
                <option value="Coffee Chat">Coffee Chat Request</option>
                <option value="Referral">Employee Referral Request</option>
                <option value="Alumni Insight">Alumni Insight Chat</option>
                <option value="Post-Interview">Post-Interview Thank You</option>
              </select>
            </div>
            <div>
              <label for="outreachToneSelect" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tone</label>
              <select id="outreachToneSelect" class="input-field !py-1.5 !text-xs" bind:value={outreachTone}>
                <option value="Professional">Professional & Direct</option>
                <option value="Casual">Warm & Casual</option>
                <option value="Alumni">Alumni Connection</option>
              </select>
            </div>
          </div>

          <button 
            type="button" 
            class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm" 
            onclick={generateIcebreaker} 
            disabled={isGenerating}
          >
            {#if isGenerating}
              <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating Outreach...
            {:else}
              <Sparkles size={14} /> Generate Customized Draft
            {/if}
          </button>
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label for="notesInput" class="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes & Saved Drafts</label>
            {#if newContact.notes}
              <button class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 transition-colors flex items-center gap-1" onclick={copyNotes}>
                {#if copiedText}
                  <Check size={12} class="text-emerald-500" /> Copied!
                {:else}
                  <Copy size={12} /> Copy Notes
                {/if}
              </button>
            {/if}
          </div>
          <textarea id="notesInput" class="input-field min-h-[120px] resize-y custom-scroll" bind:value={newContact.notes} placeholder="Met at career fair. Key topics discussed..."></textarea>
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

<FacultyResearchModal bind:open={showResearch} />
