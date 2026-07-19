<script lang="ts">
  import { Sparkles, BrainCircuit, ListCollapse, Copy, Check } from 'lucide-svelte';
  import { slide, fade } from 'svelte/transition';

  let rawPrompts = $state('');
  let isAnalyzing = $state(false);
  let clumpedResults = $state<{theme: string, count: number, prompts: {school: string, text: string, words: number}[]}[] | null>(null);
  
  // For the copy buttons
  let copiedId = $state<string | null>(null);

  async function analyzePrompts() {
    if (!rawPrompts.trim()) return;
    
    isAnalyzing = true;
    
    // Simulate AI processing time
    await new Promise(r => setTimeout(r, 2000));
    
    // Hardcoded mock response demonstrating the clustering for Phase 1
    clumpedResults = [
      {
        theme: "The 'Diversity & Community' Core Essay",
        count: 4,
        prompts: [
          { school: "Stanford University", text: "Tell us about a time you engaged with a community different from your own.", words: 250 },
          { school: "University of Michigan", text: "Describe a community you belong to and your place within it.", words: 300 },
          { school: "Duke University", text: "We believe a diverse student body enhances the educational experience. Share a perspective you will bring.", words: 250 },
          { school: "UNC Chapel Hill", text: "Describe a peer who has made a difference in your life and how they influenced your perspective.", words: 250 }
        ]
      },
      {
        theme: "The 'Academic Curiosity / Why Major' Essay",
        count: 3,
        prompts: [
          { school: "Yale University", text: "Why do these academic areas appeal to you?", words: 125 },
          { school: "Cornell University", text: "How will your intended major at Cornell help you achieve your goals?", words: 650 },
          { school: "UC Berkeley", text: "What have you done to make your school or your community a better place?", words: 350 }
        ]
      },
      {
        theme: "The 'Extracurricular Deep Dive' Essay",
        count: 2,
        prompts: [
          { school: "Harvard University", text: "Please briefly elaborate on one of your extracurricular activities or work experiences.", words: 150 },
          { school: "Vanderbilt University", text: "Please briefly elaborate on one of your extracurricular activities or work experiences.", words: 250 }
        ]
      }
    ];
    
    isAnalyzing = false;
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copiedId = id;
    setTimeout(() => copiedId = null, 2000);
  }

  function reset() {
    clumpedResults = null;
    rawPrompts = '';
  }
</script>

<div class="max-w-5xl mx-auto h-full flex flex-col pt-6 pb-24">
  <div class="flex items-center gap-4 mb-8">
    <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
      <BrainCircuit size={24} strokeWidth={2.5} />
    </div>
    <div>
      <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Essay "Clumping" Engine</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Paste all your supplemental essay prompts. Panacea AI will group identical prompts so you only write 4 core essays instead of 30.</p>
    </div>
  </div>

  {#if !clumpedResults}
    <div class="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1" in:fade>
      <div class="bg-slate-50 dark:bg-black/20 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
        <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <ListCollapse size={16} class="text-indigo-500" />
          Raw Prompts Input
        </h3>
      </div>
      <div class="p-6 flex-1 flex flex-col">
        <textarea 
          bind:value={rawPrompts}
          placeholder={`Example:
Stanford: Tell us about a time you engaged with a community different from your own (250 words)
Michigan: Describe a community you belong to and your place within it (300 words)
Yale: Why do these academic areas appeal to you? (125 words)
Harvard: Please briefly elaborate on one of your extracurricular activities (150 words)...`}
          class="flex-1 w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700 dark:text-slate-300 resize-none custom-scroll placeholder:text-slate-400/60"
        ></textarea>
        
        <div class="mt-6 flex justify-end">
          <button 
            onclick={analyzePrompts}
            disabled={isAnalyzing || !rawPrompts.trim()}
            class="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            {#if isAnalyzing}
              <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyzing 30+ Prompts...
            {:else}
              <Sparkles size={18} />
              Analyze & Clump Prompts
            {/if}
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1 overflow-y-auto custom-scroll" in:fade>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-black text-slate-900 dark:text-white">AI Identified {clumpedResults.length} Core Essay Themes</h2>
        <button onclick={reset} class="text-sm font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Start Over</button>
      </div>

      <div class="space-y-6">
        {#each clumpedResults as cluster, i}
          <div class="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden" in:slide={{delay: i * 150}}>
            <div class="bg-indigo-50 dark:bg-indigo-500/10 px-6 py-4 border-b border-indigo-100 dark:border-indigo-500/20 flex justify-between items-center">
              <h3 class="font-bold text-indigo-900 dark:text-indigo-300">{cluster.theme}</h3>
              <span class="text-xs font-black bg-indigo-600 text-white px-2.5 py-1 rounded-full shadow-sm">Write 1 essay to cover {cluster.count} prompts</span>
            </div>
            
            <div class="p-6">
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                <strong>AI Strategy:</strong> Write one master essay of {Math.max(...cluster.prompts.map(p => p.words))} words. You can easily trim it down to {Math.min(...cluster.prompts.map(p => p.words))} words for the shorter prompts.
              </p>
              
              <div class="space-y-3">
                {#each cluster.prompts as prompt}
                  <div class="flex gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 group">
                    <div class="w-32 shrink-0">
                      <p class="text-xs font-bold text-slate-900 dark:text-white">{prompt.school}</p>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{prompt.words} words</p>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm text-slate-600 dark:text-slate-300 italic">"{prompt.text}"</p>
                    </div>
                    <button 
                      onclick={() => copyText(prompt.text, prompt.school)}
                      class="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Copy prompt"
                    >
                      {#if copiedId === prompt.school}
                        <Check size={16} class="text-emerald-500" />
                      {:else}
                        <Copy size={16} />
                      {/if}
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
