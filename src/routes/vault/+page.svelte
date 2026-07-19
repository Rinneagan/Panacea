<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import type { VaultStory } from '$lib/types';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import { BookOpen, Plus, Trash2, Search, Target, Briefcase, GraduationCap, X } from 'lucide-svelte';

  // Fallback for older states
  if (!$appData.vaultStories) $appData.vaultStories = [];

  let activeStoryId = $state<string | null>(null);
  let activeStory = $derived(($appData.vaultStories || []).find(s => s.id === activeStoryId) || null);
  
  let searchQuery = $state('');

  function createNewStory() {
    const newStory: VaultStory = {
      id: crypto.randomUUID(),
      title: 'Untitled Story',
      content: '',
      tags: [],
      updatedAt: Date.now()
    };
    $appData.vaultStories = [newStory, ...($appData.vaultStories || [])];
    activeStoryId = newStory.id;
    saveUserData();
  }

  function deleteStory(id: string) {
    if (confirm('Are you sure you want to delete this story?')) {
      $appData.vaultStories = ($appData.vaultStories || []).filter(s => s.id !== id);
      if (activeStoryId === id) activeStoryId = null;
      saveUserData();
    }
  }

  function updateActiveStory(updates: Partial<VaultStory>) {
    if (!activeStoryId) return;
    $appData.vaultStories = ($appData.vaultStories || []).map(s => {
      if (s.id === activeStoryId) {
        return { ...s, ...updates, updatedAt: Date.now() };
      }
      return s;
    });
    saveUserData();
  }

  function handleTitleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateActiveStory({ title: target.value });
  }

  function handleContentChange(newContent: string) {
    if (activeStory && activeStory.content !== newContent) {
      updateActiveStory({ content: newContent });
    }
  }

  function toggleTag(tag: string) {
    if (!activeStory) return;
    const currentTags = activeStory.tags || [];
    if (currentTags.includes(tag)) {
      updateActiveStory({ tags: currentTags.filter(t => t !== tag) });
    } else {
      updateActiveStory({ tags: [...currentTags, tag] });
    }
  }

  const SUGGESTED_TAGS = ['Leadership', 'Failure', 'Teamwork', 'Technical', 'Why Us', 'Diversity', 'Impact'];

  const filteredStories = $derived(
    ($appData.vaultStories || []).filter(s => {
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(term) || (s.content && s.content.toLowerCase().includes(term));
    }).sort((a, b) => b.updatedAt - a.updatedAt)
  );
</script>

<div class="h-full flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#050505]">
  <!-- Sidebar for Stories -->
  <div class="w-full md:w-72 lg:w-80 border-r border-slate-200 dark:border-white/10 flex flex-col bg-white dark:bg-[#0A0A0A] shrink-0 h-1/3 md:h-full">
    <div class="p-4 border-b border-slate-200 dark:border-white/10">
      <div class="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400">
        <BookOpen size={20} strokeWidth={2.5} />
        <h1 class="font-black tracking-tight text-lg">Essay Vault</h1>
      </div>

      <button 
        onclick={createNewStory}
        class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mb-4"
      >
        <Plus size={16} strokeWidth={3} />
        New Core Story
      </button>

      <div class="relative">
        <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="Search stories..." 
          class="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white transition-all outline-none"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scroll p-3 flex flex-col gap-2">
      {#if filteredStories.length === 0}
        <div class="text-center py-8 px-4 text-slate-400">
          <BookOpen size={32} class="mx-auto mb-3 opacity-20" />
          <p class="text-sm font-medium">No stories found</p>
          <p class="text-xs mt-1">Create a core story to use with the AI Auto-Answer tool.</p>
        </div>
      {:else}
        {#each filteredStories as story}
          <div class="group relative">
            <button 
              class="w-full text-left p-3 rounded-xl border transition-all {activeStoryId === story.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-[#111] dark:border-white/5 dark:hover:border-white/10'}"
              onclick={() => activeStoryId = story.id}
            >
              <h3 class="font-bold text-sm text-slate-900 dark:text-white truncate pr-6">{story.title || 'Untitled Story'}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{story.content ? story.content.replace(/<[^>]*>?/gm, '').substring(0, 60) + '...' : 'Empty story...'}</p>
              
              {#if story.tags && story.tags.length > 0}
                <div class="flex gap-1 mt-2 flex-wrap">
                  {#each story.tags.slice(0, 3) as tag}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300 uppercase tracking-wider">{tag}</span>
                  {/each}
                  {#if story.tags.length > 3}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300 uppercase tracking-wider">+{story.tags.length - 3}</span>
                  {/if}
                </div>
              {/if}
            </button>
            <button 
              onclick={(e) => { e.stopPropagation(); deleteStory(story.id); }}
              class="absolute top-3 right-3 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete Story"
            >
              <Trash2 size={14} />
            </button>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Editor Area -->
  <div class="flex-1 flex flex-col h-2/3 md:h-full bg-white dark:bg-[#0A0A0A]">
    {#if activeStory}
      <div class="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full border-x border-slate-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A] shadow-sm">
        
        <!-- Header -->
        <div class="px-8 py-6 border-b border-slate-100 dark:border-white/5">
          <input 
            type="text" 
            value={activeStory.title} 
            oninput={handleTitleChange}
            placeholder="Story Title (e.g. The Time I Failed)"
            class="w-full text-3xl font-black text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-white/20 mb-4"
          />

          <!-- Tag Manager -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Tags</span>
            {#each SUGGESTED_TAGS as tag}
              <button 
                onclick={() => toggleTag(tag)}
                class="px-2.5 py-1 rounded-full text-xs font-bold border transition-all {(activeStory.tags || []).includes(tag) ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20'}"
              >
                {tag}
              </button>
            {/each}
          </div>
        </div>

        <!-- Rich Text Editor -->
        <div class="flex-1 overflow-y-auto custom-scroll relative group">
          <RichTextEditor 
            content={activeStory.content} 
            onContentChange={handleContentChange} 
            placeholder="Write your core story here... When you apply for a role, the AI will use this story to instantly answer custom essay prompts."
          />
        </div>
      </div>
    {:else}
      <div class="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50 dark:bg-[#050505]">
        <div class="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 shadow-sm border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
          <Target size={24} class="text-indigo-400" />
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">The Essay Vault</h2>
        <p class="text-sm max-w-md mb-6 leading-relaxed">
          Store your core "STAR" method stories here (Leadership, Failure, Impact). 
          The AI will automatically rewrite these stories to perfectly fit any application's custom questions and word limits.
        </p>
        <button 
          onclick={createNewStory}
          class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={3} />
          Add Your First Story
        </button>
      </div>
    {/if}
  </div>
</div>
