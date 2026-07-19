<script lang="ts">
  import { appData, activeDocId, saveUserData } from '$lib/stores';
  import type { AppDocument } from '$lib/types';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import { FileText, Plus, Trash2, Link2, Search, MoreVertical, FileEdit } from '@lucide/svelte';

  // Fallback for older states
  if (!$appData.docs) $appData.docs = [];

  let activeDoc = $derived(($appData.docs || []).find(d => d.id === $activeDocId) || null);

  function createNewDoc() {
    const newDoc: AppDocument = {
      id: crypto.randomUUID(),
      title: 'Untitled Document',
      content: '',
      updatedAt: Date.now()
    };
    $appData.docs = [newDoc, ...($appData.docs || [])];
    $activeDocId = newDoc.id;
    saveUserData();
  }

  function deleteDoc(id: string) {
    if (confirm('Are you sure you want to delete this document?')) {
      $appData.docs = ($appData.docs || []).filter(d => d.id !== id);
      if ($activeDocId === id) $activeDocId = null;
      saveUserData();
    }
  }

  function updateActiveDoc(updates: Partial<AppDocument>) {
    if (!$activeDocId) return;
    $appData.docs = ($appData.docs || []).map(d => {
      if (d.id === $activeDocId) {
        return { ...d, ...updates, updatedAt: Date.now() };
      }
      return d;
    });
    saveUserData();
  }

  // Handle typing inside title
  function handleTitleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateActiveDoc({ title: target.value });
  }

  // Handle typing inside content
  function handleContentChange(newContent: string) {
    if (activeDoc && activeDoc.content !== newContent) {
      updateActiveDoc({ content: newContent });
    }
  }

  // Handle link changes
  function handleLinkChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const val = target.value;
    if (!val) {
      updateActiveDoc({ linkedAppId: undefined, linkedAppType: undefined });
      return;
    }
    
    const [type, id] = val.split('::');
    updateActiveDoc({ linkedAppId: id, linkedAppType: type as 'job' | 'college' });
  }
</script>

<div class="h-[calc(100vh-6rem)] -mt-4 -mx-4 lg:-mt-8 lg:-mx-8 flex overflow-hidden">


  <!-- Right Pane (Editor Workspace) -->
  <div class="flex-1 flex flex-col bg-slate-100 dark:bg-[#0A0A0A] relative overflow-hidden">
    {#if !activeDoc}
      <div class="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <FileText size={48} strokeWidth={1} class="mb-4 opacity-50" />
        <h3 class="text-xl font-bold text-black dark:text-white mb-2">Workspace</h3>
        <p class="font-medium text-sm">Select a document or create a new one.</p>
      </div>
    {:else}
      
      <!-- Top Toolbar (Sticky) -->
      <div class="h-16 px-6 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#111] z-30 shrink-0">
        
        <div class="flex-1 flex items-center gap-4 max-w-3xl">
          <input type="text" value={activeDoc.title} oninput={handleTitleChange} placeholder="Untitled Document" class="flex-1 text-xl font-bold text-black dark:text-white bg-transparent border-none focus:ring-0 outline-none p-0 placeholder-slate-400 dark:placeholder-slate-600 truncate" />
          
          <div class="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
          
          <div class="flex items-center gap-2 shrink-0">
            <Link2 size={14} class="text-slate-400" />
            <select class="bg-transparent border-none text-slate-500 dark:text-slate-400 text-xs font-bold focus:ring-0 outline-none cursor-pointer p-0" onchange={handleLinkChange}>
              <option value="" class="text-black dark:text-black">No Link</option>
              <optgroup label="Colleges" class="text-black dark:text-black">
                {#each $appData.colleges as college}
                  <option value="college::{college.id}" selected={activeDoc.linkedAppId === college.id}>
                    {college.school}
                  </option>
                {/each}
              </optgroup>
              <optgroup label="Jobs" class="text-black dark:text-black">
                {#each $appData.jobs as job}
                  <option value="job::{job.id}" selected={activeDoc.linkedAppId === job.id}>
                    {job.company}
                  </option>
                {/each}
              </optgroup>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" onclick={() => deleteDoc(activeDoc!.id)} title="Delete Document">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <!-- Scrollable Paper Container -->
      <div class="flex-1 overflow-y-auto custom-scroll p-4 sm:p-8 lg:p-12 flex justify-center">
        <!-- The "Paper" -->
        <div class="w-full max-w-[850px] bg-white dark:bg-[#111] shadow-xl dark:shadow-black/50 border border-slate-200/50 dark:border-white/10 min-h-[1056px] (8.5x11 ratio roughly) flex flex-col relative z-10">
          {#key activeDoc.id}
            <RichTextEditor content={activeDoc.content} onContentChange={handleContentChange} />
          {/key}
        </div>
      </div>
      
    {/if}
  </div>
</div>

<style>
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  :global(.dark) .custom-scroll::-webkit-scrollbar-thumb { background: #333; }
</style>
