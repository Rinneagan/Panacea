<script lang="ts">
  import { appData } from '$lib/stores';
  import { Sparkles, ArrowRight, GraduationCap, X } from 'lucide-svelte';
  import { marked } from 'marked';
  
  let { degreeType = 'Undergrad' } = $props<{ degreeType?: 'Undergrad' | 'PhD' }>();
  
  let isLoading = $state(false);
  let suggestions = $state<string>('');
  
  async function generateSuggestions() {
    const key = $appData?.settings?.geminiApiKey;
    if (!key) {
      alert("Please add your Gemini API Key in the Settings page first.");
      return;
    }
    
    isLoading = true;
    try {
      const colleges = $appData.colleges.filter(c => (c.degreeType || 'Undergrad') === degreeType).map(c => ({ school: c.school, program: c.program, status: c.status }));
      
      let prompt = `You are Panacea, an expert ${degreeType === 'PhD' ? 'Graduate School' : 'College'} Admissions counselor. My profile data is: ${JSON.stringify(colleges)}. `;
      
      if (colleges.length > 0) {
        prompt += ` Based on these, suggest 3 more ${degreeType === 'PhD' ? 'universities with strong research programs' : 'colleges'} that would be good reach, match, and safety schools.`;
      } else {
        prompt += ` What are 5 great ${degreeType === 'PhD' ? 'research universities for pursuing a PhD' : 'universities for a well-rounded undergraduate education'}? Keep it brief and format the response nicely.`;
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) {
        suggestions = data.candidates[0].content.parts[0].text;
      } else {
        suggestions = "Sorry, I couldn't generate suggestions at this time. Please check your API key.";
      }
    } catch (e) {
      console.error(e);
      suggestions = "An error occurred while connecting to Gemini AI.";
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="mt-8 glass-panel p-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/20 relative overflow-hidden">
  <div class="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[60px] pointer-events-none"></div>
  
  <div class="relative z-10">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-xl bg-white dark:bg-black/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/30">
        <Sparkles size={20} class={isLoading ? 'animate-spin' : ''} />
      </div>
      <h3 class="text-xl font-bold text-indigo-900 dark:text-indigo-100">AI College Matchmaker</h3>
    </div>
    
    {#if !suggestions && !isLoading}
      <p class="text-indigo-800/70 dark:text-indigo-200/70 font-medium mb-6 max-w-2xl">
        Not sure where else to apply? Let Google's Gemini AI analyze your current college list and suggest similar reach, match, and safety schools that fit your profile.
      </p>
      
      {#if !$appData?.settings?.geminiApiKey}
        <a href="/settings" class="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-black/50 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-500/30 hover:bg-indigo-50 transition-colors">
          Configure AI in Settings <ArrowRight size={16} />
        </a>
      {:else}
        <button onclick={generateSuggestions} class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all">
          Generate Suggestions <Sparkles size={16} />
        </button>
      {/if}
    {/if}
    
    {#if isLoading}
      <div class="relative overflow-hidden flex items-center justify-center p-10 mt-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 max-w-2xl shadow-inner">
        <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-70 animate-scan"></div>
        <div class="flex flex-col items-center gap-4 relative z-10">
          <div class="relative w-14 h-14">
            <div class="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-500/30"></div>
            <div class="absolute inset-0 rounded-full border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin"></div>
            <Sparkles class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 animate-pulse" size={20} />
          </div>
          <span class="text-sm font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 animate-pulse uppercase tracking-[0.2em]">
            Synthesizing Matches...
          </span>
        </div>
      </div>
    {/if}
    
    {#if suggestions && !isLoading}
      <div class="bg-white/80 dark:bg-black/40 backdrop-blur p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 max-w-3xl prose prose-sm dark:prose-invert prose-indigo">
        <div class="flex justify-between items-start mb-4">
          <h4 class="font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-widest text-xs flex items-center gap-2">
            <GraduationCap size={14} /> AI Suggestions
          </h4>
          <button onclick={() => suggestions = ''} class="text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div class="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed markdown-content">
          {@html suggestions ? marked.parse(suggestions) : ''}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.markdown-content p) { margin-bottom: 0.75rem; }
  :global(.markdown-content p:last-child) { margin-bottom: 0; }
  :global(.markdown-content strong) { font-weight: 700; color: #312e81; }
  :global(.dark .markdown-content strong) { color: #e0e7ff; }
  :global(.markdown-content ul) { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 0.75rem; }
  :global(.markdown-content ol) { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 0.75rem; }
  :global(.markdown-content li) { margin-bottom: 0.25rem; }
  :global(.markdown-content h1, .markdown-content h2, .markdown-content h3) { font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e1b4b; }
  :global(.dark .markdown-content h1, .dark .markdown-content h2, .dark .markdown-content h3) { color: #e0e7ff; }
  :global(.markdown-content a) { color: #4f46e5; text-decoration: underline; }
  :global(.dark .markdown-content a) { color: #818cf8; }

  @keyframes scan {
    0% { transform: translateY(-50px); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(150px); opacity: 0; }
  }
  .animate-scan { animation: scan 2.5s ease-in-out infinite; }
</style>
