<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import { Search, Sparkles, GraduationCap, MapPin, DollarSign, Plus, Check } from 'lucide-svelte';

  let major = $state('');
  let satScore = $state('');
  let isGenerating = $state(false);
  let hasGenerated = $state(false);

  // Simulated College Database
  const MOCK_COLLEGES = [
    { school: "Stanford University", location: "Stanford, CA", rate: "4%", aid: "100% Need Met", supps: 5 },
    { school: "Massachusetts Institute of Technology (MIT)", location: "Cambridge, MA", rate: "4%", aid: "100% Need Met", supps: 4 },
    { school: "Vanderbilt University", location: "Nashville, TN", rate: "6%", aid: "100% Need Met", supps: 2 },
    { school: "Rice University", location: "Houston, TX", rate: "8%", aid: "100% Need Met", supps: 3 },
    { school: "Washington University in St. Louis", location: "St. Louis, MO", rate: "11%", aid: "100% Need Met", supps: 2 },
    { school: "University of Southern California", location: "Los Angeles, CA", rate: "12%", aid: "100% Need Met", supps: 2 },
    { school: "Duke University", location: "Durham, NC", rate: "6%", aid: "100% Need Met", supps: 3 },
    { school: "Northwestern University", location: "Evanston, IL", rate: "7%", aid: "100% Need Met", supps: 2 },
    { school: "Harvard University", location: "Cambridge, MA", rate: "3%", aid: "100% Need Met", supps: 3 },
    { school: "Yale University", location: "New Haven, CT", rate: "4%", aid: "100% Need Met", supps: 4 },
    { school: "Princeton University", location: "Princeton, NJ", rate: "4%", aid: "100% Need Met", supps: 3 },
    { school: "Columbia University", location: "New York, NY", rate: "4%", aid: "100% Need Met", supps: 6 },
    { school: "University of Pennsylvania", location: "Philadelphia, PA", rate: "6%", aid: "100% Need Met", supps: 2 },
    { school: "Brown University", location: "Providence, RI", rate: "5%", aid: "100% Need Met", supps: 3 },
    { school: "Dartmouth College", location: "Hanover, NH", rate: "6%", aid: "100% Need Met", supps: 2 },
    { school: "Cornell University", location: "Ithaca, NY", rate: "7%", aid: "100% Need Met", supps: 2 },
    { school: "University of Chicago", location: "Chicago, IL", rate: "5%", aid: "100% Need Met", supps: 2 },
    { school: "Johns Hopkins University", location: "Baltimore, MD", rate: "7%", aid: "100% Need Met", supps: 1 },
    { school: "California Institute of Technology", location: "Pasadena, CA", rate: "4%", aid: "100% Need Met", supps: 4 },
    { school: "University of Notre Dame", location: "Notre Dame, IN", rate: "12%", aid: "100% Need Met", supps: 2 },
    { school: "Georgetown University", location: "Washington, DC", rate: "12%", aid: "100% Need Met", supps: 2 },
    { school: "Emory University", location: "Atlanta, GA", rate: "11%", aid: "100% Need Met", supps: 2 },
    { school: "Carnegie Mellon University", location: "Pittsburgh, PA", rate: "11%", aid: "100% Need Met", supps: 3 },
    { school: "University of Virginia", location: "Charlottesville, VA", rate: "16%", aid: "100% Need Met", supps: 2 },
    { school: "University of Michigan", location: "Ann Arbor, MI", rate: "18%", aid: "100% Need Met", supps: 2 },
    { school: "Tufts University", location: "Medford, MA", rate: "10%", aid: "100% Need Met", supps: 2 },
    { school: "New York University", location: "New York, NY", rate: "8%", aid: "100% Need Met", supps: 1 },
    { school: "University of North Carolina at Chapel Hill", location: "Chapel Hill, NC", rate: "17%", aid: "100% Need Met", supps: 2 },
    { school: "Wake Forest University", location: "Winston-Salem, NC", rate: "21%", aid: "100% Need Met", supps: 3 },
    { school: "Boston College", location: "Chestnut Hill, MA", rate: "15%", aid: "100% Need Met", supps: 1 },
    { school: "Georgia Institute of Technology", location: "Atlanta, GA", rate: "16%", aid: "100% Need Met", supps: 1 }
  ];

  let generatedResults = $state<typeof MOCK_COLLEGES>([]);

  function generateMatches() {
    if (!major) return;
    isGenerating = true;
    hasGenerated = false;

    setTimeout(() => {
      const shuffled = [...MOCK_COLLEGES].sort(() => 0.5 - Math.random());
      generatedResults = shuffled.slice(0, 10);
      isGenerating = false;
      hasGenerated = true;
    }, 1500);
  }

  function addCollege(college: typeof MOCK_COLLEGES[0]) {
    const isReach = parseInt(college.rate) <= 8;
    const strategyObj = {
      category: isReach ? 'Reach (< 8% Acceptance)' : `Target / Match (${college.rate} Acceptance)`,
      school: college.school,
      program: major || 'Intended Major',
      hook: `Focus on demonstrating quantitative leadership and intellectual vitality in ${major || 'your major'}. ${college.school} highly values campus engagement and collaborative initiative.`,
      essayFocus: `For ${college.school}, highlight specific professors, undergraduate labs, or interdisciplinary seminars that directly align with your goals in ${major || 'your field'}.`,
      actionChecklist: [
        `Draft core supplemental essay prompts for ${college.school}`,
        `Align recommendation letters to highlight academic rigor in ${major || 'your field'}`,
        `Add networking contacts for ${college.school} in your Panacea CRM`
      ]
    };

    const newApp = {
      id: crypto.randomUUID(),
      school: college.school,
      program: major,
      location: college.location,
      status: 'Researching',
      degreeType: 'Undergrad' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiAdvice: JSON.stringify(strategyObj),
      supps: [
        { id: crypto.randomUUID(), prompt: "Please briefly elaborate on one of your extracurricular activities or work experiences.", wordLimit: 150, draft: "" },
        { id: crypto.randomUUID(), prompt: `Why are you interested in studying ${major} at ${college.school}?`, wordLimit: 250, draft: "" }
      ]
    };

    $appData.colleges = [newApp, ...$appData.colleges];
    saveUserData();
  }

  function isAdded(school: string) {
    return $appData.colleges.some(c => c.school === school && c.degreeType === 'Undergrad');
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
        <Sparkles size={24} />
      </div>
      <div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white">AI College Matcher</h2>
        <p class="text-slate-500 font-medium">Input your stats, and the AI will find the top programs matching your major that offer 100% demonstrated need or full-ride scholarships.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <label for="major" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Intended Major <span class="text-rose-500">*</span></label>
        <div class="relative">
          <GraduationCap class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input id="major" type="text" bind:value={major} placeholder="e.g. Computer Science, Finance" class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none" />
        </div>
      </div>
      <div>
        <label for="sat" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">SAT / ACT Score (Optional)</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input id="sat" type="text" bind:value={satScore} placeholder="e.g. 1520" class="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none" />
        </div>
      </div>
    </div>

    <button onclick={generateMatches} disabled={!major || isGenerating} class="w-full btn-primary py-3 flex items-center justify-center gap-2 {(!major || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}">
      {#if isGenerating}
        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        Consulting Match Engine...
      {:else}
        <Sparkles size={18} /> Find My Matches
      {/if}
    </button>
  </div>

  <!-- Results Section -->
  {#if hasGenerated}
    <div class="space-y-4 fade-in">
      <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
        Top {generatedResults.length} Matches for {major}
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each generatedResults as college}
          <div class="glass-panel p-5 card-hover flex flex-col justify-between h-full">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1">{college.school}</h4>
                <p class="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                  <MapPin size={12} /> {college.location}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-1">
                    <DollarSign size={10} /> {college.aid}
                  </span>
                  <span class="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    {college.rate} Acceptance
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
              <span class="text-xs font-bold text-slate-500">{college.supps} Supplemental Essays</span>
              {#if isAdded(college.school)}
                <button disabled class="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                  <Check size={14} /> Added
                </button>
              {:else}
                <button onclick={() => addCollege(college)} class="flex items-center gap-1 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
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
