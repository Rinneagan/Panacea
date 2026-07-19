<script lang="ts">
  import { ShieldAlert, Timer, Play, Pause, RotateCcw, BrainCircuit, Sparkles } from 'lucide-svelte';

  let companyInput = $state('');
  let isGenerating = $state(false);
  
  let generatedQuestions = $state<{ q: string, type: 'behavioral' | 'technical' | 'curveball' }[]>([]);

  // Timer logic
  let timeLeft = $state(45 * 60); // 45 minutes
  let isRunning = $state(false);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function toggleTimer() {
    if (isRunning) {
      if (timerInterval) clearInterval(timerInterval);
      isRunning = false;
    } else {
      isRunning = true;
      timerInterval = setInterval(() => {
        if (timeLeft > 0) timeLeft--;
        else toggleTimer();
      }, 1000);
    }
  }

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = false;
    timeLeft = 45 * 60;
  }

  async function generateQuestions() {
    if (!companyInput) return;
    isGenerating = true;
    
    // Simulate AI Generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const lowercase = companyInput.toLowerCase();
    
    if (lowercase.includes('google') || lowercase.includes('meta') || lowercase.includes('amazon')) {
      generatedQuestions = [
        { type: 'behavioral', q: `Tell me about a time you had a fundamental disagreement with a senior engineer at ${companyInput}. How did you resolve it?` },
        { type: 'technical', q: "Design a distributed rate limiter that can handle 10 million requests per second across 50 data centers." },
        { type: 'curveball', q: `If ${companyInput} decided to shut down its primary revenue source tomorrow, what product would you build to replace it?` }
      ];
    } else if (lowercase.includes('stanford') || lowercase.includes('harvard') || lowercase.includes('mit')) {
      generatedQuestions = [
        { type: 'behavioral', q: "Describe a moment when you realized your core academic belief was completely wrong." },
        { type: 'curveball', q: `If you could add one mandatory class to the ${companyInput} curriculum that everyone must take, what would it be?` },
        { type: 'behavioral', q: "How do you handle being the least smartest person in the room?" }
      ];
    } else {
      generatedQuestions = [
        { type: 'behavioral', q: "Tell me about a time you failed to deliver on a critical project deadline." },
        { type: 'technical', q: `Walk me through how you would optimize the database queries for ${companyInput}'s main dashboard.` },
        { type: 'curveball', q: "What is a commonly accepted best practice in your industry that you strongly disagree with?" }
      ];
    }

    isGenerating = false;
  }
</script>

<svelte:head>
  <title>Interview Prep | Panacea</title>
</svelte:head>

<div class="h-full flex flex-col fade-in max-w-7xl mx-auto px-4 pb-8">
  <header class="flex items-center justify-between mb-8 mt-4">
    <div>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
        <BrainCircuit class="text-indigo-500" size={32} />
        Interview Prep Engine
      </h1>
      <p class="text-slate-500 font-medium mt-1">Simulate pressure and uncover your blind spots before the real thing.</p>
    </div>
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    
    <!-- Blind Spot Predictor -->
    <div class="glass-panel p-6 flex flex-col min-h-[500px]">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">"Blind Spot" Predictor</h2>
          <p class="text-xs text-slate-500">AI-generated curveball questions</p>
        </div>
      </div>

      <div class="flex gap-2 mb-6">
        <input type="text" class="input-field flex-1" bind:value={companyInput} placeholder="Enter Company or College (e.g. Google, Stanford)" onkeydown={e => e.key === 'Enter' && generateQuestions()} />
        <button class="btn-primary flex items-center gap-2" onclick={generateQuestions} disabled={isGenerating}>
          {#if isGenerating}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {:else}
            <Sparkles size={16} />
          {/if}
          Predict
        </button>
      </div>

      <div class="flex-1 overflow-y-auto custom-scroll pr-2 space-y-4">
        {#if generatedQuestions.length === 0}
          <div class="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
            <BrainCircuit size={48} class="mb-4 opacity-20" />
            <p class="text-sm font-medium">Enter a company name to generate predicted interview questions based on recent Glassdoor and Reddit data.</p>
          </div>
        {:else}
          {#each generatedQuestions as q}
            <div class="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full {q.type === 'curveball' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : q.type === 'technical' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}">
                  {q.type}
                </span>
              </div>
              <p class="text-slate-900 dark:text-white font-medium text-lg leading-snug">{q.q}</p>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Pressure Simulator Timer -->
    <div class="glass-panel p-6 flex flex-col items-center justify-center relative overflow-hidden group">
      <!-- Background pulse when running -->
      {#if isRunning}
        <div class="absolute inset-0 bg-rose-500/5 dark:bg-rose-500/10 animate-pulse"></div>
      {/if}

      <div class="relative z-10 flex flex-col items-center">
        <div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
          <Timer size={32} />
        </div>
        
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Pressure Simulator</h2>
        <p class="text-sm text-slate-500 text-center max-w-xs mb-8">Standard Technical Screen time limit. Practice answering the questions on the left under strict timing.</p>

        <div class="text-8xl font-black text-slate-900 dark:text-white tracking-tighter mb-12 font-mono drop-shadow-xl {timeLeft < 300 ? 'text-rose-500 dark:text-rose-400 animate-pulse' : ''}">
          {formatTime(timeLeft)}
        </div>

        <div class="flex items-center gap-4">
          <button class="w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl {isRunning ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-105'}" onclick={toggleTimer}>
            {#if isRunning}
              <Pause size={24} fill="currentColor" />
            {:else}
              <Play size={24} fill="currentColor" class="ml-1" />
            {/if}
          </button>
          
          <button class="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors" onclick={resetTimer} title="Reset Timer">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>
    </div>

  </div>
</div>
