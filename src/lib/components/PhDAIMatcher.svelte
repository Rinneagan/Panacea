<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import { Search, Sparkles, GraduationCap, MapPin, DollarSign, Plus, Check, Microscope } from 'lucide-svelte';

  let field = $state('');
  let isGenerating = $state(false);
  let hasGenerated = $state(false);

  // Simulated PhD Database
  const MOCK_PHDS = [
    { school: "Stanford University", department: "Computer Science", prof: "Prof. Andrew Ng", focus: "AI/ML", stipend: "$48,000/yr", location: "Stanford, CA" },
    { school: "Massachusetts Institute of Technology (MIT)", department: "EECS", prof: "Prof. Daniela Rus", focus: "Robotics", stipend: "$45,000/yr", location: "Cambridge, MA" },
    { school: "University of California, Berkeley", department: "EECS", prof: "Prof. Pieter Abbeel", focus: "Deep RL", stipend: "$43,000/yr", location: "Berkeley, CA" },
    { school: "Carnegie Mellon University", department: "SCS", prof: "Prof. Tuomas Sandholm", focus: "Game Theory / AI", stipend: "$42,000/yr", location: "Pittsburgh, PA" },
    { school: "University of Washington", department: "CSE", prof: "Prof. Yejin Choi", focus: "NLP", stipend: "$41,000/yr", location: "Seattle, WA" },
    { school: "Harvard University", department: "Biomedical Informatics", prof: "Prof. Isaac Kohane", focus: "Bioinformatics", stipend: "$44,000/yr", location: "Cambridge, MA" },
    { school: "Princeton University", department: "Computer Science", prof: "Prof. Sanjeev Arora", focus: "Theoretical ML", stipend: "$46,000/yr", location: "Princeton, NJ" },
    { school: "Cornell University", department: "Computer Science", prof: "Prof. Thorsten Joachims", focus: "Machine Learning", stipend: "$43,000/yr", location: "Ithaca, NY" }
  ];

  let generatedResults = $state<typeof MOCK_PHDS>([]);

  function generateMatches() {
    if (!field) return;
    isGenerating = true;
    hasGenerated = false;

    setTimeout(() => {
      const shuffled = [...MOCK_PHDS].sort(() => 0.5 - Math.random());
      generatedResults = shuffled.slice(0, 5);
      isGenerating = false;
      hasGenerated = true;
    }, 1500);
  }

  function addPhD(phd: typeof MOCK_PHDS[0]) {
    const strategyObj = {
      category: 'Top Tier PhD Program (Fully Funded)',
      school: phd.school,
      program: phd.department + ' (' + phd.focus + ')',
      hook: `Focus on your research trajectory in ${field || phd.focus}. Highlight past publications, code repositories, or lab projects that demonstrate direct methodology fit with ${phd.prof}'s active research group.`,
      essayFocus: `In your Statement of Purpose for ${phd.school}, dedicate a dedicated paragraph to ${phd.prof}'s recent work in ${phd.focus}. Connect your research interests directly to their ongoing grants.`,
      actionChecklist: [
        `Send a cold email inquiry to ${phd.prof} regarding PhD openings`,
        `Tailor Statement of Purpose to ${phd.school}'s ${phd.department} lab requirements`,
        `Request 3 strong academic letters of recommendation`
      ]
    };

    const newApp = {
      id: crypto.randomUUID(),
      school: phd.school,
      program: phd.department + ' (' + phd.focus + ')',
      location: phd.location,
      status: 'Researching',
      degreeType: 'PhD' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiAdvice: JSON.stringify(strategyObj),
      supps: [
        { id: crypto.randomUUID(), prompt: "Statement of Purpose: Describe your research interests, academic background, and why you are applying to this program.", wordLimit: 1000, draft: "" },
        { id: crypto.randomUUID(), prompt: "Personal Statement: How have your background and life experiences contributed to your decision to pursue a graduate degree?", wordLimit: 500, draft: "" }
      ]
    };

    $appData.colleges = [newApp, ...$appData.colleges];
    saveUserData();
  }

  function isAdded(school: string, program: string) {
    return $appData.colleges.some(c => c.school === school && c.degreeType === 'PhD');
  }
</script>

<style>
  @keyframes sortingHatThink {
    0%, 100% { 
      transform: rotate(-5deg) scale(1); 
      filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.4)); 
    }
    50% { 
      transform: rotate(5deg) scale(1.15); 
      filter: drop-shadow(0 0 12px rgba(251, 191, 36, 1)); 
    }
  }
  .animate-sorting-hat {
    animation: sortingHatThink 1.2s ease-in-out infinite;
  }
</style>

<div class="max-w-4xl mx-auto space-y-8 fade-in">
  <!-- Input Section -->
  <div class="glass-panel p-8">
    <div class="flex items-start gap-4 mb-6">
      <div class="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
        <Microscope size={24} />
      </div>
      <div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white">PhD Program Matcher</h2>
        <p class="text-slate-500 font-medium">Input your research interest, and the AI will find top departments and notable PIs whose labs align with your background.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 mb-6">
      <div>
        <label for="field" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Research Field / Interest <span class="text-rose-500">*</span></label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input id="field" type="text" bind:value={field} placeholder="e.g. Natural Language Processing, Computational Biology" class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none" />
        </div>
      </div>
    </div>

    <button onclick={generateMatches} disabled={!field || isGenerating} class="w-full btn-primary py-3 flex items-center justify-center gap-2 {(!field || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}">
      {#if isGenerating}
        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        Matching Research Labs...
      {:else}
        <Sparkles size={18} /> Find Labs & PIs
      {/if}
    </button>
  </div>

  <!-- Results Section -->
  {#if hasGenerated}
    <div class="space-y-4 fade-in">
      <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
        Top {generatedResults.length} Labs for {field}
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each generatedResults as phd}
          <div class="glass-panel p-5 card-hover flex flex-col justify-between h-full">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1">{phd.school}</h4>
                <p class="text-sm font-bold text-indigo-500 mb-1">{phd.prof}</p>
                <p class="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                  <MapPin size={12} /> {phd.location} • {phd.department}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-1">
                    <DollarSign size={10} /> Fully Funded ({phd.stipend})
                  </span>
                  <span class="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    {phd.focus}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
              <span class="text-xs font-bold text-slate-500">2 Essays Required</span>
              {#if isAdded(phd.school, phd.department)}
                <button disabled class="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                  <Check size={14} /> Added
                </button>
              {:else}
                <button onclick={() => addPhD(phd)} class="flex items-center gap-1 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={14} /> Add to List
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
