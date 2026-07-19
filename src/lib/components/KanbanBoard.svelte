<script lang="ts">
  import { statusVariant } from '$lib/utils';
  import EntryCard from './EntryCard.svelte';
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import type { BaseApplication } from '$lib/types';
  
  let { entries, type, onStatusChange, toggleSelect, selectedIds } = $props<{
    entries: any[];
    type: 'job' | 'college';
    onStatusChange: (id: string, status: string) => void;
    toggleSelect: (id: string) => void;
    selectedIds: Set<string>;
  }>();

  const columns = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'];

  function handleDragStart(e: DragEvent, id: string) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDrop(e: DragEvent, status: string) {
    e.preventDefault();
    const id = e.dataTransfer?.getData('text/plain');
    if (id) {
      onStatusChange(id, status);
    }
  }

  function getEntriesForCol(entries: any[], col: string) {
    return entries.filter(e => e.status === col || (col === 'Interview' && e.status === 'Interviewing'));
  }
</script>

<div class="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x custom-scroll">
  {#each columns as col}
    <div 
      class="w-[340px] shrink-0 bg-slate-100/50 dark:bg-white/5 rounded-3xl p-4 flex flex-col gap-3 snap-start border border-slate-200/50 dark:border-white/10"
      ondragover={(e) => e.preventDefault()}
      ondrop={(e) => handleDrop(e, col)}
      role="region"
      aria-label="{col} Column"
    >
      <div class="flex items-center justify-between mb-2 px-2">
        <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {col}
        </h3>
        <span class="text-xs font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-black px-2.5 py-1 rounded-full shadow-sm border border-slate-200 dark:border-white/10">
          {getEntriesForCol(entries, col).length}
        </span>
      </div>
      
      <div class="flex-1 flex flex-col gap-3 min-h-[150px]">
        {#each getEntriesForCol(entries, col) as entry, index (entry.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div animate:flip={{ duration: 300 }} in:fade={{ duration: 200 }} draggable="true" ondragstart={(evt) => handleDragStart(evt, entry.id)} class="cursor-grab active:cursor-grabbing min-w-0" role="listitem">
            <EntryCard {entry} {type} {index} {toggleSelect} isSelected={selectedIds.has(entry.id)} />
          </div>
        {/each}
        {#if getEntriesForCol(entries, col).length === 0}
          <div class="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300/50 dark:border-white/10 rounded-2xl">
            <span class="text-sm font-bold text-slate-400 dark:text-slate-600">Drop here</span>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .custom-scroll::-webkit-scrollbar { height: 8px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb { background: #333; }
</style>
