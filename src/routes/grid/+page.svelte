<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import { LayoutGrid, Save, Search, TableProperties } from 'lucide-svelte';

  let searchQuery = $state('');
  
  let filteredJobs = $derived(() => {
    let list = $appData.jobs || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => 
        (j.company || '').toLowerCase().includes(q) || 
        (j.role || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  function updateJob(id: string, field: string, value: any) {
    const idx = $appData.jobs.findIndex(j => j.id === id);
    if (idx >= 0) {
      // @ts-ignore
      $appData.jobs[idx][field] = value;
      $appData.jobs[idx].updatedAt = Date.now();
      
      if (field === 'status') {
        $appData.jobs[idx].history = [...($appData.jobs[idx].history || []), { status: value, date: Date.now() }];
      }
      saveUserData();
    }
  }

  const JOB_STATUSES = ['Wishlist', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted'];

</script>

<svelte:head>
  <title>Mass Update Grid | Panacea</title>
</svelte:head>

<div class="h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] flex flex-col fade-in">
  <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
    <div>
      <p class="text-indigo-500 dark:text-indigo-400 font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
        <TableProperties size={14} /> Spreadsheet Mode
      </p>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mass Update Grid</h1>
      <p class="text-slate-500 font-medium mt-1">Tab through cells to instantly update multiple applications without opening modals.</p>
    </div>
    
    <div class="relative w-full sm:w-64">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input type="search" placeholder="Search company or role..." bind:value={searchQuery} class="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium outline-none" />
    </div>
  </header>

  <div class="flex-1 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
    <div class="overflow-x-auto overflow-y-auto custom-scroll flex-1">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-white/5 text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
            <th class="p-4 border-b border-r border-slate-200 dark:border-white/10 min-w-[150px]">Company</th>
            <th class="p-4 border-b border-r border-slate-200 dark:border-white/10 min-w-[180px]">Role</th>
            <th class="p-4 border-b border-r border-slate-200 dark:border-white/10 min-w-[150px]">Status</th>
            <th class="p-4 border-b border-r border-slate-200 dark:border-white/10 min-w-[130px]">Deadline</th>
            <th class="p-4 border-b border-slate-200 dark:border-white/10 min-w-[150px]">Salary / Comp</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          {#each filteredJobs() as job (job.id)}
            <tr class="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
              <td class="p-0 border-r border-slate-100 dark:border-white/5">
                <input type="text" class="w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 dark:focus:bg-indigo-500/10 font-bold" value={job.company} onblur={(e) => updateJob(job.id, 'company', e.currentTarget.value)} />
              </td>
              <td class="p-0 border-r border-slate-100 dark:border-white/5">
                <input type="text" class="w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 dark:focus:bg-indigo-500/10 font-medium" value={job.role} onblur={(e) => updateJob(job.id, 'role', e.currentTarget.value)} />
              </td>
              <td class="p-0 border-r border-slate-100 dark:border-white/5">
                <select class="w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 dark:focus:bg-indigo-500/10 font-bold appearance-none cursor-pointer {job.status === 'Offer' ? 'text-emerald-600 dark:text-emerald-400' : job.status === 'Rejected' ? 'text-rose-600 dark:text-rose-400' : job.status === 'Ghosted' ? 'text-slate-400 line-through' : 'text-indigo-600 dark:text-indigo-400'}" value={job.status} onchange={(e) => updateJob(job.id, 'status', e.currentTarget.value)}>
                  {#each JOB_STATUSES as status}
                    <option value={status}>{status}</option>
                  {/each}
                </select>
              </td>
              <td class="p-0 border-r border-slate-100 dark:border-white/5">
                <input type="date" class="w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 dark:focus:bg-indigo-500/10 text-slate-600 dark:text-slate-400" value={job.deadline} onblur={(e) => updateJob(job.id, 'deadline', e.currentTarget.value)} />
              </td>
              <td class="p-0">
                <input type="text" class="w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 dark:focus:bg-indigo-500/10 font-medium text-emerald-600 dark:text-emerald-400" value={job.salary} onblur={(e) => updateJob(job.id, 'salary', e.currentTarget.value)} placeholder="$..." />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      {#if filteredJobs().length === 0}
        <div class="p-12 flex flex-col items-center justify-center text-center text-slate-400">
          <LayoutGrid size={32} class="mb-3 opacity-50" />
          <p class="font-bold">No jobs found in the grid.</p>
        </div>
      {/if}
    </div>
    
    <div class="bg-indigo-50 dark:bg-indigo-500/10 border-t border-indigo-100 dark:border-indigo-500/20 p-3 flex justify-between items-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
      <div class="flex items-center gap-2">
        <Save size={14} /> Edits save automatically on blur/tab
      </div>
      <div>{filteredJobs().length} Total Records</div>
    </div>
  </div>
</div>
