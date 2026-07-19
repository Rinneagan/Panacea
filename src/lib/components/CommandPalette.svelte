<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { appData, layoutState, modalState, activeDocId } from '$lib/stores';
  import { Search, Briefcase, GraduationCap, FileText, Settings, Moon, Sun } from '@lucide/svelte';

  let query = $state('');
  let inputElement = $state<HTMLInputElement>();
  let selectedIndex = $state(0);
  
  // Close when clicking outside
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function close() {
    layoutState.update(s => ({ ...s, isCommandPaletteOpen: false }));
    query = '';
    selectedIndex = 0;
  }

  // Generate combined list of searchable items
  let allItems = $derived.by(() => {
    const items: Array<{ id: string, title: string, subtitle: string, type: 'job' | 'college' | 'doc' | 'action', icon: any, action: () => void }> = [];
    
    const q = query.toLowerCase();

    // 1. Jobs
    for (const job of $appData.jobs || []) {
      const roleStr = job.role || '';
      if (!q || job.company.toLowerCase().includes(q) || roleStr.toLowerCase().includes(q)) {
        items.push({
          id: `job_${job.id}`,
          title: job.company,
          subtitle: `Job • ${roleStr || 'No role'}`,
          type: 'job',
          icon: Briefcase,
          action: () => {
            window.location.href = '/jobs';
            setTimeout(() => modalState.set({ isOpen: true, type: 'job', editId: job.id }), 100);
          }
        });
      }
    }

    // 2. Colleges
    for (const college of $appData.colleges || []) {
      if (!q || college.school.toLowerCase().includes(q)) {
        items.push({
          id: `col_${college.id}`,
          title: college.school,
          subtitle: `College App • ${college.status}`,
          type: 'college',
          icon: GraduationCap,
          action: () => {
            window.location.href = '/college';
            setTimeout(() => modalState.set({ isOpen: true, type: 'college', editId: college.id }), 100);
          }
        });
      }
    }

    // 3. Docs
    for (const doc of $appData.docs || []) {
      if (!q || doc.title.toLowerCase().includes(q)) {
        items.push({
          id: `doc_${doc.id}`,
          title: doc.title || 'Untitled Document',
          subtitle: 'Document',
          type: 'doc',
          icon: FileText,
          action: () => {
            $activeDocId = doc.id;
            window.location.href = '/docs';
          }
        });
      }
    }

    // 4. Actions
    const staticActions = [
      { id: 'act_theme', title: 'Toggle Dark Mode', subtitle: 'Action', type: 'action' as const, icon: Moon, action: () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
      }},
      { id: 'act_settings', title: 'Open Settings', subtitle: 'Action', type: 'action' as const, icon: Settings, action: () => layoutState.update(s => ({ ...s, isSettingsOpen: true })) },
      { id: 'act_newjob', title: 'Add Job Application', subtitle: 'Action', type: 'action' as const, icon: Briefcase, action: () => { window.location.href = '/jobs'; setTimeout(() => modalState.set({ isOpen: true, type: 'job', editId: null }), 100); } },
      { id: 'act_newcol', title: 'Add College Application', subtitle: 'Action', type: 'action' as const, icon: GraduationCap, action: () => { window.location.href = '/college'; setTimeout(() => modalState.set({ isOpen: true, type: 'college', editId: null }), 100); } },
    ];

    for (const act of staticActions) {
      if (!q || act.title.toLowerCase().includes(q)) {
        items.push(act);
      }
    }

    return items.slice(0, 8); // Max 8 results
  });

  $effect(() => {
    // Reset selected index when query changes or items list changes
    if (allItems && query !== null) {
        selectedIndex = 0;
    }
  });

  $effect(() => {
    if ($layoutState.isCommandPaletteOpen && inputElement) {
      // Small timeout to ensure it's rendered before focusing
      setTimeout(() => inputElement.focus(), 50);
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (!$layoutState.isCommandPaletteOpen) {
      // Trigger on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        layoutState.update(s => ({ ...s, isCommandPaletteOpen: true }));
      }
      return;
    }

    // When open
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % allItems.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + allItems.length) % allItems.length;
    } else if (e.key === 'Enter' && allItems.length > 0) {
      e.preventDefault();
      const item = allItems[selectedIndex];
      close();
      item.action();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $layoutState.isCommandPaletteOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4"
    onclick={handleBackdropClick}
    role="presentation"
    transition:fade={{ duration: 150 }}
  >
    <!-- Modal -->
    <div 
      class="w-full max-w-2xl bg-white dark:bg-[#111] rounded-2xl shadow-2xl dark:shadow-black overflow-hidden border border-slate-200/50 dark:border-white/10"
      transition:fly={{ y: 20, duration: 200 }}
    >
      <!-- Search Input -->
      <div class="relative flex items-center px-4 border-b border-slate-100 dark:border-white/10">
        <Search class="text-slate-400 absolute left-5" size={20} />
        <input 
          bind:this={inputElement}
          bind:value={query}
          type="text" 
          class="w-full bg-transparent border-none py-5 pl-10 pr-4 text-lg font-medium text-black dark:text-white placeholder-slate-400 focus:ring-0 outline-none"
          placeholder="Search jobs, colleges, docs, or type a command..."
        />
        <kbd class="hidden sm:block px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-xs font-bold text-slate-400 shadow-sm">ESC</kbd>
      </div>

      <!-- Results List -->
      <div class="max-h-[60vh] overflow-y-auto p-2">
        {#if allItems.length === 0}
          <div class="px-4 py-8 text-center text-slate-500 font-medium text-sm">
            No results found for "{query}"
          </div>
        {:else}
          {#each allItems as item, idx}
            {@const Icon = item.icon}
            <button 
              class="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-100 text-left {idx === selectedIndex ? 'bg-indigo-50 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}"
              onclick={() => { close(); item.action(); }}
              onmouseenter={() => selectedIndex = idx}
            >
              <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 {idx === selectedIndex ? 'bg-white dark:bg-black text-indigo-600 dark:text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}">
                <Icon size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</div>
                <div class="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</div>
              </div>
              {#if idx === selectedIndex}
                <span class="text-indigo-600 dark:text-white/50 text-xs font-bold px-2 flex items-center gap-1">
                  <span class="hidden sm:inline">Press</span> 
                  <kbd class="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded border border-indigo-100 dark:border-white/20 shadow-sm">↵</kbd>
                </span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
