<script lang="ts">
  import { onMount } from 'svelte';
  import { appData, modalState } from '$lib/stores';
  import type { JobApplication } from '$lib/types';
  import EntryCard from '$lib/components/EntryCard.svelte';
  import KanbanBoard from '$lib/components/KanbanBoard.svelte';
  import { Search, ChevronDown, Plus, Inbox, Archive, LayoutList, KanbanSquare, Briefcase } from 'lucide-svelte';
  
  let activeJobs = $derived($appData.jobs.filter(j => j.status !== 'Wishlist').length);
  let interviewingJobs = $derived($appData.jobs.filter(j => ['Interview', 'Interviewing', 'Phone Screen'].includes(j.status)).length);
  let offers = $derived($appData.jobs.filter(j => j.status === 'Offer').length);

  let searchQuery = $state('');
  let statusFilter = $state('');
  let sortOption = $state('deadline');
  let viewMode = $state<'list' | 'board'>('list');
  let showArchived = $state(false);
  
  let selectedIds = $state<Set<string>>(new Set());

  onMount(() => {
    // Check for Chrome Extension Auto-Add Query Params
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto_add') === 'true') {
      const company = params.get('company') || '';
      const role = params.get('role') || '';
      const link = params.get('link') || '';
      
      const newJob: JobApplication = {
        id: crypto.randomUUID(),
        company,
        role,
        location: '',
        status: 'Wishlist',
        portalLink: link,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      $appData.jobs = [newJob, ...$appData.jobs];
      import('$lib/stores').then(({ saveUserData }) => saveUserData());
      
      // Clean up URL so it doesn't run again on refresh
      window.history.replaceState({}, '', window.location.pathname);
      
      // Open the modal for the newly created job
      setTimeout(() => {
        modalState.set({ isOpen: true, type: 'job', editId: newJob.id });
      }, 100);
    }
  });

  const JOB_STATUSES = ['Wishlist', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
  const SORT_OPTIONS = [
    { value: 'deadline', label: 'Sort: Deadline' },
    { value: 'alpha', label: 'Sort: A–Z' },
    { value: 'recent', label: 'Sort: Recently added' },
    { value: 'starred', label: 'Sort: Starred first' }
  ];

  let filteredJobs = $derived(() => {
    let list = [...$appData.jobs];
    
    // Archive filter
    list = list.filter(j => showArchived ? j.archived : !j.archived);

    // Status filter
    if (statusFilter !== 'All') list = list.filter(j => j.status === statusFilter);

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => (j.company || '').toLowerCase().includes(q) || (j.role || '').toLowerCase().includes(q));
    }
    
    if (sortOption === 'alpha') {
      list.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    } else if (sortOption === 'starred') {
      list.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    } else if (sortOption === 'recent') {
      list.reverse();
    } else {
      list.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    }
    
    return list;
  });

  function toggleSelect(id: string) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    selectedIds = new Set(selectedIds);
  }

  function toggleDropdown(id: string) {
    const el = document.getElementById(id);
    if (el) {
      if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.classList.add('block');
      } else {
        el.classList.remove('block');
        el.classList.add('hidden');
      }
    }
  }

  function setStatus(val: string) {
    statusFilter = val;
    toggleDropdown('jobStatusDD');
  }

  function setSort(val: string) {
    sortOption = val;
    toggleDropdown('jobSortDD');
  }

  function openAddModal() {
    import('$lib/stores').then(({ modalState }) => {
      modalState.set({ isOpen: true, type: 'job', editId: null });
    });
  }
</script>

<div class="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-white bg-[#0A0A0A] border border-white/10 shadow-2xl mb-10 fade-in">
  <!-- Animated Gradients (Indigo/Blue - Lighter) -->
  <div class="absolute -top-32 -left-32 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
  <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

  <div class="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
    <div>
      <p class="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
        <Briefcase size={14} class="text-blue-400" /> Career Tracking
      </p>
      <h1 class="text-4xl sm:text-5xl font-black tracking-tight mb-3">Job Applications</h1>
      <p class="text-slate-400 text-lg max-w-xl font-medium">Manage your corporate applications, monitor deadlines, and track interview progress.</p>
      
      <div class="mt-6 flex flex-wrap gap-4">
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
          <span class="text-sm font-bold text-white">{activeJobs} Active</span>
        </div>
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
          <span class="text-sm font-bold text-white">{interviewingJobs} Interviewing</span>
        </div>
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
          <span class="text-sm font-bold text-white">{offers} Offers</span>
        </div>
      </div>
    </div>
    
    <div class="w-full sm:w-auto shrink-0">
      <button class="w-full sm:w-auto bg-white hover:bg-slate-100 text-indigo-900 font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2" onclick={openAddModal}>
        <Plus size={20} />
        Add Application
      </button>
    </div>
  </div>
</div>

<section class="flex flex-col gap-6">
  <!-- Toolbar -->
  <div class="flex flex-col lg:flex-row gap-4 items-center bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200/60 shadow-sm">
    <div class="relative flex-1 w-full">
      <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input type="search" placeholder="Search company or role…" bind:value={searchQuery} class="w-full pl-11 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 font-medium outline-none" />
    </div>

    <div class="flex items-center gap-2 w-full lg:w-auto px-2 lg:px-0 pb-2 lg:pb-0">
      <div class="h-8 w-px bg-slate-200 hidden lg:block mx-2"></div>
      
      <!-- Status Filter -->
      <div class="relative w-full lg:w-48">
        <button type="button" class="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all" onclick={() => toggleDropdown('jobStatusDD')}>
          <span class="truncate">{statusFilter || 'All statuses'}</span>
          <ChevronDown size={16} class="text-slate-400" />
        </button>
        <div id="jobStatusDD" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <button type="button" class="w-full text-left px-4 py-3 text-sm font-bold {statusFilter === '' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}" onclick={() => setStatus('')}>All statuses</button>
          {#each JOB_STATUSES as status}
            <button type="button" class="w-full text-left px-4 py-3 text-sm font-bold {statusFilter === status ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}" onclick={() => setStatus(status)}>{status}</button>
          {/each}
        </div>
      </div>

      <!-- Secondary Actions -->
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-2 text-sm font-bold {showArchived ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'} px-3 py-1.5 rounded-xl transition-all" onclick={() => showArchived = !showArchived}>
          <Archive size={16} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>

        <div class="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button class="p-2 rounded-lg transition-all {viewMode === 'list' ? 'bg-white dark:bg-[#222] shadow-sm text-black dark:text-white' : 'text-slate-400 hover:text-black dark:hover:text-white'}" onclick={() => viewMode = 'list'}>
            <LayoutList size={18} />
          </button>
          <button class="p-2 rounded-lg transition-all {viewMode === 'board' ? 'bg-white dark:bg-[#222] shadow-sm text-black dark:text-white' : 'text-slate-400 hover:text-black dark:hover:text-white'}" onclick={() => viewMode = 'board'}>
            <KanbanSquare size={18} />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  {#if $appData.jobs.length === 0}
    <div class="glass-panel p-12 flex flex-col items-center justify-center text-center mt-4">
      <div class="w-16 h-16 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center mb-6">
        <Inbox size={32} />
      </div>
      <h3 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">No job applications yet</h3>
      <p class="text-slate-500 font-medium max-w-md mx-auto mb-8">Track every role you apply to — status, deadlines, resume & portal links, all in one card.</p>
      <button class="btn-primary" onclick={openAddModal}>Add your first job application</button>
    </div>
  {:else if filteredJobs().length === 0}
    <div class="p-12 text-center text-slate-400 font-medium bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 mt-4">
      No applications match your filters.
    </div>
  {:else if viewMode === 'list'}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {#each filteredJobs() as job, index (job.id)}
        <EntryCard entry={job} type="job" {index} isSelected={selectedIds.has(job.id)} {toggleSelect} />
      {/each}
    </div>
  {:else}
    <KanbanBoard 
      entries={filteredJobs()} 
      type="job" 
      {selectedIds} 
      {toggleSelect} 
      onStatusChange={(id: string, status: string) => {
        const finalStatus = status === 'Interview' ? 'Interviewing' : status;
        $appData.jobs = $appData.jobs.map(j => {
          if (j.id === id && j.status !== finalStatus) {
            const history = [...(j.history || []), { status: finalStatus, date: Date.now() }];
            return { ...j, status: finalStatus, history, updatedAt: Date.now() };
          }
          return j;
        });
        import('$lib/stores').then(({ saveUserData }) => saveUserData());
      }} 
    />
  {/if}
</section>
