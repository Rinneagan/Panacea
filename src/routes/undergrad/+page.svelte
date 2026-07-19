<script lang="ts">
  import { appData } from '$lib/stores';
  import { Search, ChevronDown, Plus, Link2, X, Inbox, List, LayoutGrid, Archive, GraduationCap } from 'lucide-svelte';
  import AIAssistant from '$lib/components/AIAssistant.svelte';
  import CAActivities from '$lib/components/CAActivities.svelte';
  import EssayClumper from '$lib/components/EssayClumper.svelte';
  import AIMatcher from '$lib/components/AIMatcher.svelte';
  import EntryCard from '$lib/components/EntryCard.svelte';
  import KanbanBoard from '$lib/components/KanbanBoard.svelte';
  
  let activeTrack: 'Undergrad' | 'PhD' = 'Undergrad';
  let undergradView = $state<'apps' | 'activities' | 'clumper' | 'matcher'>('apps');
  let trackColleges = $derived($appData.colleges.filter(c => (c.degreeType || 'Undergrad') === 'Undergrad'));

  let activeColleges = $derived(trackColleges.filter(c => !['Accepted', 'Rejected', 'Enrolled'].includes(c.status)).length);
  let submittedColleges = $derived(trackColleges.filter(c => ['Submitted', 'Interview', 'Waitlisted', 'Deferred'].includes(c.status)).length);
  let acceptedColleges = $derived(trackColleges.filter(c => ['Accepted', 'Enrolled'].includes(c.status)).length);
  
  let searchQuery = $state('');
  let statusFilter = $state('');
  let viewMode = $state<'list' | 'board'>('list');
  let sortOption = $state('deadline');
  let showArchived = $state(false);
  
  let selectedIds = $state<Set<string>>(new Set());

  const COLLEGE_STATUSES = ['Researching', 'In Progress', 'Submitted', 'Interview', 'Accepted', 'Rejected', 'Waitlisted', 'Deferred', 'Enrolled'];
  const SORT_OPTIONS = [
    { value: 'deadline', label: 'Sort: Deadline' },
    { value: 'alpha', label: 'Sort: A–Z' },
    { value: 'recent', label: 'Sort: Recently added' },
    { value: 'starred', label: 'Sort: Starred first' }
  ];

  let filteredColleges = $derived(() => {
    let list = [...trackColleges];
    
    // Archive filter
    list = list.filter(c => showArchived ? c.archived : !c.archived);
    
    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => (c.school || '').toLowerCase().includes(q) || (c.program || '').toLowerCase().includes(q));
    }
    
    if (sortOption === 'alpha') {
      list.sort((a, b) => (a.school || '').localeCompare(b.school || ''));
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
    toggleDropdown('collegeStatusDD');
  }

  function setSort(val: string) {
    sortOption = val;
    toggleDropdown('collegeSortDD');
  }

  function openAddModal() {
    import('$lib/stores').then(({ modalState }) => {
      modalState.set({ isOpen: true, type: 'college', editId: null, degreeType: activeTrack });
    });
  }
</script>

<div class="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-white bg-[#0A0A0A] border border-white/10 shadow-2xl mb-10 fade-in">
  <!-- Animated Gradients (Emerald/Teal - Lighter) -->
  <div class="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
  <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

  <div class="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
    <div class="min-w-0 flex-1 w-full">
      <p class="text-emerald-400 font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
        <GraduationCap size={14} class="text-teal-400" /> University Admissions
      </p>
      <h1 class="text-4xl sm:text-5xl font-black tracking-tight mb-3">College Applications</h1>
      <p class="text-emerald-100/80 text-sm max-w-xl font-medium leading-relaxed mb-6">Track your applications, essays, recommendations, and financial aid deadlines.</p>
      
      <!-- Track Switcher -->
      <div class="flex flex-col gap-4 w-full min-w-0">
        <div class="flex items-center p-1 bg-white/10 backdrop-blur-md rounded-xl w-fit border border-white/10 shadow-inner">
          <button class="px-6 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all bg-white text-[#0A0A0A] shadow-md">Undergraduate</button>
        </div>
        
        <div class="flex items-center gap-6 px-2 mt-2 overflow-x-auto custom-scroll pb-1 w-full snap-x">
            <button class="shrink-0 text-sm font-bold transition-all {undergradView === 'apps' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1 -mb-[2px]' : 'text-white/60 hover:text-white pb-1'}" onclick={() => undergradView = 'apps'}>Applications</button>
            <button class="shrink-0 text-sm font-bold transition-all {undergradView === 'activities' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1 -mb-[2px]' : 'text-white/60 hover:text-white pb-1'}" onclick={() => undergradView = 'activities'}>Common App Activities</button>
            <button class="shrink-0 text-sm font-bold transition-all {undergradView === 'clumper' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1 -mb-[2px]' : 'text-white/60 hover:text-white pb-1'}" onclick={() => undergradView = 'clumper'}><span class="text-indigo-400">✨</span> Essay Clumper</button>
            <button class="shrink-0 text-sm font-bold transition-all {undergradView === 'matcher' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1 -mb-[2px]' : 'text-white/60 hover:text-white pb-1'}" onclick={() => undergradView = 'matcher'}><span class="text-amber-400">✨</span> AI Matcher</button>
        </div>
      </div>
      
      <div class="mt-6 flex flex-wrap gap-4">
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.8)]"></div>
          <span class="text-sm font-bold text-white">{activeColleges} Active</span>
        </div>
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          <span class="text-sm font-bold text-white">{submittedColleges} Submitted</span>
        </div>
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
          <span class="text-sm font-bold text-white">{acceptedColleges} Accepted</span>
        </div>
      </div>
    </div>
    
    <div class="w-full sm:w-auto shrink-0">
      <button class="w-full sm:w-auto bg-white hover:bg-slate-100 text-emerald-900 font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2" onclick={openAddModal}>
        <Plus size={20} />
        Add Application
      </button>
    </div>
  </div>
</div>

{#if undergradView === 'apps'}
<section class="flex flex-col gap-6">
  <!-- Quicklinks bar -->
  <div class="flex flex-wrap items-center gap-3">
    <span class="text-sm font-bold text-slate-400 uppercase tracking-wider mr-2">Quick links</span>
    {#each $appData.quickLinks as link}
      <a class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm text-sm font-bold text-slate-700 transition-all" href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener">
        <Link2 size={14} class="text-indigo-400" />
        {link.label}
      </a>
    {/each}
    <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/50 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all">
      <Plus size={14} />
      Add link
    </button>
  </div>

  <!-- Toolbar -->
  <div class="flex flex-col lg:flex-row gap-4 items-center bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200/60 shadow-sm">
    <div class="relative flex-1 w-full">
      <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input type="search" placeholder="Search school or program…" bind:value={searchQuery} class="w-full pl-11 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 font-medium outline-none" />
    </div>

    <div class="flex items-center gap-2 w-full lg:w-auto px-2 lg:px-0 pb-2 lg:pb-0">
      <div class="h-8 w-px bg-slate-200 hidden lg:block mx-2"></div>
      
      <!-- Status Filter -->
      <div class="relative w-full lg:w-48">
        <button type="button" class="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all" onclick={() => toggleDropdown('collegeStatusDD')}>
          <span class="truncate">{statusFilter || 'All statuses'}</span>
          <ChevronDown size={16} class="text-slate-400" />
        </button>
        <div id="collegeStatusDD" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <button type="button" class="w-full text-left px-4 py-3 text-sm font-bold {statusFilter === '' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}" onclick={() => setStatus('')}>All statuses</button>
          {#each COLLEGE_STATUSES as status}
            <button type="button" class="w-full text-left px-4 py-3 text-sm font-bold {statusFilter === status ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}" onclick={() => setStatus(status)}>{status}</button>
          {/each}
        </div>
      </div>

      <!-- Sort -->
      <div class="relative w-full lg:w-48">
        <button type="button" class="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all" onclick={() => toggleDropdown('collegeSortDD')}>
          <span class="truncate">{SORT_OPTIONS.find(o => o.value === sortOption)?.label}</span>
          <ChevronDown size={16} class="text-slate-400" />
        </button>
        <div id="collegeSortDD" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
          {#each SORT_OPTIONS as opt}
            <button type="button" class="w-full text-left px-4 py-3 text-sm font-bold {sortOption === opt.value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}" onclick={() => setSort(opt.value)}>{opt.label}</button>
          {/each}
        </div>
      </div>

      <!-- Secondary Actions -->
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-2 text-sm font-bold {showArchived ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'} px-3 py-1.5 rounded-xl transition-all" onclick={() => showArchived = !showArchived}>
          <Archive size={16} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>

        <!-- View Toggle -->
        <div class="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button type="button" class="p-2 rounded-lg transition-all {viewMode === 'list' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}" onclick={() => viewMode = 'list'} title="List View">
            <List size={18} />
          </button>
          <button type="button" class="p-2 rounded-lg transition-all {viewMode === 'board' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}" onclick={() => viewMode = 'board'} title="Board View">
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  {#if $appData.colleges.length === 0}
    <div class="glass-panel p-12 flex flex-col items-center justify-center text-center mt-4">
      <div class="w-16 h-16 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center mb-6">
        <Inbox size={32} />
      </div>
      <h3 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">No college applications yet</h3>
      <p class="text-slate-500 font-medium max-w-md mx-auto mb-8">Keep track of your reach, match, and safety schools all in one place.</p>
      <button class="btn-primary" onclick={openAddModal}>Add your first college application</button>
    </div>
  {:else if filteredColleges().length === 0}
    <div class="p-12 text-center text-slate-400 font-medium bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 mt-4">
      No applications match your filters.
    </div>
  {:else if viewMode === 'list'}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {#each filteredColleges() as college, index (college.id)}
        <EntryCard entry={college} type="college" {index} isSelected={selectedIds.has(college.id)} {toggleSelect} />
      {/each}
    </div>
  {:else}
    <KanbanBoard 
      entries={filteredColleges()} 
      type="college" 
      {selectedIds} 
      {toggleSelect} 
      onStatusChange={(id: string, status: string) => {
        const finalStatus = status === 'Interview' ? 'Interviewing' : status;
        $appData.colleges = $appData.colleges.map(c => {
          if (c.id === id && c.status !== finalStatus) {
            const history = [...(c.history || []), { status: finalStatus, date: Date.now() }];
            return { ...c, status: finalStatus, history, updatedAt: Date.now() };
          }
          return c;
        });
        import('$lib/stores').then(({ saveUserData }) => saveUserData());
      }} 
    />
  {/if}
</section>
{:else if undergradView === 'activities'}
  <CAActivities />
{:else if undergradView === 'matcher'}
  <AIMatcher />
{:else}
  <EssayClumper />
{/if}

<AIAssistant degreeType={activeTrack} />
