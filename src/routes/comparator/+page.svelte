<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import { Scale, Briefcase, GraduationCap, DollarSign, Calculator, Plus, Trash2 } from 'lucide-svelte';

  let mode = $state<'job' | 'college'>('job');
  
  let jobs = $derived($appData.jobs || []);
  let colleges = $derived($appData.colleges || []);

  let selectedJobIds = $state<string[]>([]);
  let selectedCollegeIds = $state<string[]>([]);

  let selectedJobs = $derived(jobs.filter(j => selectedJobIds.includes(j.id)));
  let selectedColleges = $derived(colleges.filter(c => selectedCollegeIds.includes(c.id)));

  function toggleJob(id: string) {
    if (selectedJobIds.includes(id)) selectedJobIds = selectedJobIds.filter(i => i !== id);
    else if (selectedJobIds.length < 4) selectedJobIds = [...selectedJobIds, id];
  }

  function toggleCollege(id: string) {
    if (selectedCollegeIds.includes(id)) selectedCollegeIds = selectedCollegeIds.filter(i => i !== id);
    else if (selectedCollegeIds.length < 4) selectedCollegeIds = [...selectedCollegeIds, id];
  }

  function calculateJobTotal(job: any) {
    const details = job.offerDetails || {};
    const base = details.baseSalary || 0;
    const bonus = details.bonus || 0;
    const rsu = details.rsu || 0;
    return base + bonus + rsu; // Ignoring sign-on for annual recurring, but we can show it separately
  }

  function calculateCollegeNetCost(college: any) {
    const details = college.offerDetails || {};
    const tuition = details.tuition || 0;
    const room = details.roomBoard || 0;
    const aid = (details.scholarships || 0) + (details.grants || 0);
    return (tuition + room) - aid;
  }

  function updateJobOffer(jobId: string, field: string, value: number) {
    $appData.jobs = jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          offerDetails: { ...(j.offerDetails || {}), [field]: value }
        };
      }
      return j;
    });
    saveUserData();
  }

  function updateCollegeOffer(collegeId: string, field: string, value: number) {
    $appData.colleges = colleges.map(c => {
      if (c.id === collegeId) {
        return {
          ...c,
          offerDetails: { ...(c.offerDetails || {}), [field]: value }
        };
      }
      return c;
    });
    saveUserData();
  }
</script>

<svelte:head>
  <title>Decision Matrix | Panacea</title>
</svelte:head>

<div class="h-full flex flex-col fade-in max-w-7xl mx-auto px-4 pb-8">
  <!-- Header -->
  <header class="flex items-center justify-between mb-8 mt-4">
    <div>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
        <Scale class="text-indigo-500" size={32} />
        Decision Matrix
      </h1>
      <p class="text-slate-500 font-medium mt-1">Calculate true total compensation and ROI to make the best choice.</p>
    </div>
    
    <div class="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
      <button class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 {mode === 'job' ? 'bg-white dark:bg-[#111] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" onclick={() => mode = 'job'}>
        <Briefcase size={16} /> Job Offers
      </button>
      <button class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 {mode === 'college' ? 'bg-white dark:bg-[#111] shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" onclick={() => mode = 'college'}>
        <GraduationCap size={16} /> College Options
      </button>
    </div>
  </header>

  <div class="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1">
    
    <!-- Sidebar: Selection -->
    <div class="xl:col-span-1 bg-slate-50/50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col h-[70vh]">
      <h3 class="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-widest mb-4">Select to Compare</h3>
      
      <div class="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
        {#if mode === 'job'}
          {#each jobs as job}
            <button class="w-full text-left p-3 rounded-xl border transition-all {selectedJobIds.includes(job.id) ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-[#111] dark:border-white/5 dark:hover:border-white/10'}" onclick={() => toggleJob(job.id)}>
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-900 dark:text-white text-sm">{job.company}</span>
                <div class="w-4 h-4 rounded border {selectedJobIds.includes(job.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-white/20'} flex items-center justify-center">
                  {#if selectedJobIds.includes(job.id)}<Plus size={12} class="rotate-45" />{/if}
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">{job.role}</p>
            </button>
          {/each}
        {:else}
          {#each colleges as college}
            <button class="w-full text-left p-3 rounded-xl border transition-all {selectedCollegeIds.includes(college.id) ? 'bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30' : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-[#111] dark:border-white/5 dark:hover:border-white/10'}" onclick={() => toggleCollege(college.id)}>
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-900 dark:text-white text-sm truncate pr-2">{college.school}</span>
                <div class="w-4 h-4 rounded border shrink-0 {selectedCollegeIds.includes(college.id) ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 dark:border-white/20'} flex items-center justify-center">
                  {#if selectedCollegeIds.includes(college.id)}<Plus size={12} class="rotate-45" />{/if}
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">{college.program}</p>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Main Content: Comparison Table -->
    <div class="xl:col-span-3 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col h-[70vh]">
      {#if mode === 'job' && selectedJobs.length === 0}
        <div class="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
          <Calculator size={48} class="mb-4 opacity-20" />
          <p class="text-sm font-medium">Select up to 4 jobs to compare their true compensation.</p>
        </div>
      {:else if mode === 'college' && selectedColleges.length === 0}
        <div class="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
          <Calculator size={48} class="mb-4 opacity-20" />
          <p class="text-sm font-medium">Select up to 4 colleges to compare total ROI and debt.</p>
        </div>
      {:else}
        <div class="flex-1 overflow-x-auto custom-scroll">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr>
                <th class="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111] w-48 shrink-0">Metrics</th>
                {#each (mode === 'job' ? selectedJobs : selectedColleges) as item}
                  <th class="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111] min-w-[200px] border-l">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-black text-lg text-slate-900 dark:text-white truncate">{mode === 'job' ? (item as any).company : (item as any).school}</p>
                        <p class="text-xs text-slate-500 font-medium truncate">{mode === 'job' ? (item as any).role : (item as any).program}</p>
                      </div>
                      <button class="text-slate-400 hover:text-rose-500 p-1" onclick={() => mode === 'job' ? toggleJob(item.id) : toggleCollege(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#if mode === 'job'}
                <tr>
                  <td class="p-4 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5">Base Salary ($)</td>
                  {#each selectedJobs as job}
                    <td class="p-4 border-b border-slate-100 dark:border-white/5 border-l border-slate-200 dark:border-white/10">
                      <input type="number" class="w-full bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white" placeholder="0" value={job.offerDetails?.baseSalary || ''} oninput={e => updateJobOffer(job.id, 'baseSalary', parseFloat(e.currentTarget.value) || 0)} />
                    </td>
                  {/each}
                </tr>
                <tr>
                  <td class="p-4 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5">Annual Bonus ($)</td>
                  {#each selectedJobs as job}
                    <td class="p-4 border-b border-slate-100 dark:border-white/5 border-l border-slate-200 dark:border-white/10">
                      <input type="number" class="w-full bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white" placeholder="0" value={job.offerDetails?.bonus || ''} oninput={e => updateJobOffer(job.id, 'bonus', parseFloat(e.currentTarget.value) || 0)} />
                    </td>
                  {/each}
                </tr>
                <tr>
                  <td class="p-4 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5">Annual RSU ($)</td>
                  {#each selectedJobs as job}
                    <td class="p-4 border-b border-slate-100 dark:border-white/5 border-l border-slate-200 dark:border-white/10">
                      <input type="number" class="w-full bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white" placeholder="0" value={job.offerDetails?.rsu || ''} oninput={e => updateJobOffer(job.id, 'rsu', parseFloat(e.currentTarget.value) || 0)} />
                    </td>
                  {/each}
                </tr>
                <tr>
                  <td class="p-4 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5">Sign-On Bonus ($)</td>
                  {#each selectedJobs as job}
                    <td class="p-4 border-b border-slate-100 dark:border-white/5 border-l border-slate-200 dark:border-white/10">
                      <input type="number" class="w-full bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white" placeholder="0" value={job.offerDetails?.signOn || ''} oninput={e => updateJobOffer(job.id, 'signOn', parseFloat(e.currentTarget.value) || 0)} />
                    </td>
                  {/each}
                </tr>
                <tr class="bg-indigo-50/50 dark:bg-indigo-900/10">
                  <td class="p-4 font-black text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-indigo-100 dark:border-indigo-500/20">Annual Total Comp</td>
                  {#each selectedJobs as job}
                    <td class="p-4 font-black text-lg text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-500/20 border-l border-slate-200 dark:border-white/10">
                      ${calculateJobTotal(job).toLocaleString()}
                    </td>
                  {/each}
                </tr>
              {:else}
                <tr>
                  <td class="p-4 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5">Annual Tuition ($)</td>
                  {#each selectedColleges as college}
                    <td class="p-4 border-b border-slate-100 dark:border-white/5 border-l border-slate-200 dark:border-white/10">
                      <input type="number" class="w-full bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white" placeholder="0" value={college.offerDetails?.tuition || ''} oninput={e => updateCollegeOffer(college.id, 'tuition', parseFloat(e.currentTarget.value) || 0)} />
                    </td>
                  {/each}
                </tr>
                <tr>
                  <td class="p-4 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5">Room & Board ($)</td>
                  {#each selectedColleges as college}
                    <td class="p-4 border-b border-slate-100 dark:border-white/5 border-l border-slate-200 dark:border-white/10">
                      <input type="number" class="w-full bg-transparent border-none outline-none font-medium text-slate-900 dark:text-white" placeholder="0" value={college.offerDetails?.roomBoard || ''} oninput={e => updateCollegeOffer(college.id, 'roomBoard', parseFloat(e.currentTarget.value) || 0)} />
                    </td>
                  {/each}
                </tr>
                <tr class="bg-emerald-50/50 dark:bg-emerald-900/10">
                  <td class="p-4 font-bold text-sm text-emerald-700 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-500/20">Scholarships & Grants ($)</td>
                  {#each selectedColleges as college}
                    <td class="p-4 border-b border-emerald-100 dark:border-emerald-500/20 border-l border-slate-200 dark:border-white/10">
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">-</span>
                        <input type="number" class="w-full bg-transparent border-none outline-none font-bold text-emerald-700 dark:text-emerald-400" placeholder="0" value={(college.offerDetails?.scholarships || 0) + (college.offerDetails?.grants || 0)} oninput={e => updateCollegeOffer(college.id, 'scholarships', parseFloat(e.currentTarget.value) || 0)} />
                      </div>
                    </td>
                  {/each}
                </tr>
                <tr class="bg-purple-50/50 dark:bg-purple-900/10">
                  <td class="p-4 font-black text-sm text-purple-700 dark:text-purple-400 uppercase tracking-widest border-b border-purple-100 dark:border-purple-500/20">Net Cost / Year</td>
                  {#each selectedColleges as college}
                    <td class="p-4 font-black text-lg text-purple-700 dark:text-purple-400 border-b border-purple-100 dark:border-purple-500/20 border-l border-slate-200 dark:border-white/10">
                      ${calculateCollegeNetCost(college).toLocaleString()}
                    </td>
                  {/each}
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>
