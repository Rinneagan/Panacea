<script lang="ts">
  import { appData } from '$lib/stores';
  import { ChevronLeft, ChevronRight, Calendar as CalIcon } from '@lucide/svelte';
  
  let calendarMonth = $state(new Date(new Date().setDate(1)));

  let year = $derived(calendarMonth.getFullYear());
  let month = $derived(calendarMonth.getMonth());
  let monthLabel = $derived(calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  
  let firstDay = $derived(new Date(year, month, 1));
  let startWeekday = $derived(firstDay.getDay());
  let daysInMonth = $derived(new Date(year, month + 1, 0).getDate());
  
  let today = $derived(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });

  let combinedDeadlineEntries = $derived([
    ...$appData.jobs.map(j => ({ ...j, __type: 'job', __name: j.company, __meta: j.role })),
    ...$appData.colleges.map(c => ({ ...c, __type: 'college', __name: c.school, __meta: c.deadlineType }))
  ].filter(e => e.deadline));

  let byDay = $derived(() => {
    const map: Record<number, any[]> = {};
    combinedDeadlineEntries.forEach(e => {
      const d = new Date((e.deadline as string) + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!map[d.getDate()]) map[d.getDate()] = [];
        map[d.getDate()].push(e);
      }
    });
    return map;
  });

  function prevMonth() {
    calendarMonth = new Date(year, month - 1, 1);
  }
  function nextMonth() {
    calendarMonth = new Date(year, month + 1, 1);
  }
  function goToday() {
    calendarMonth = new Date(new Date().setDate(1));
  }

  function downloadICS() {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Panacea//App//EN\n";
    
    combinedDeadlineEntries.forEach(entry => {
      const dt = (entry.deadline as string).replace(/-/g, '');
      const type = entry.__type === 'job' ? 'Job' : 'College';
      const status = entry.status;
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${entry.id}@panacea.app\n`;
      icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icsContent += `DTSTART;VALUE=DATE:${dt}\n`;
      icsContent += `SUMMARY:[${type}] ${entry.__name} Deadline\n`;
      icsContent += `DESCRIPTION:Status: ${status}\\nType: ${entry.__meta}\\nPortal: ${entry.portalLink || 'N/A'}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panacea_deadlines.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<header class="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
  <div>
    <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Calendar</h1>
    <p class="text-slate-500 mt-2 text-lg font-medium">Every deadline, laid out by month.</p>
  </div>
  
  <div class="flex items-center gap-4 bg-slate-50 dark:bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm">
    <button class="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm rounded-xl transition-all flex items-center gap-2" onclick={downloadICS} title="Sync to Apple/Google Calendar">
      <CalIcon size={16} /> Export ICS
    </button>
    <div class="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1"></div>
    <button class="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm rounded-xl transition-all" onclick={prevMonth}>
      <ChevronLeft size={20} />
    </button>
    <div class="w-40 text-center font-bold text-lg text-slate-800 dark:text-white">
      {monthLabel}
    </div>
    <button class="p-2.5 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-xl transition-all" onclick={nextMonth}>
      <ChevronRight size={20} />
    </button>
    <div class="w-px h-8 bg-slate-200 mx-1"></div>
    <button class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-xl transition-all" onclick={goToday}>
      Today
    </button>
  </div>
</header>

<section class="glass-panel p-2 overflow-hidden">
  <div class="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
    <!-- Weekdays -->
    {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
      <div class="bg-slate-50 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-400">
        {day}
      </div>
    {/each}

    <!-- Empty start cells -->
    {#each Array(startWeekday) as _}
      <div class="bg-white min-h-[140px] opacity-40"></div>
    {/each}

    <!-- Days -->
    {#each Array(daysInMonth) as _, i}
      {@const day = i + 1}
      {@const isToday = new Date(year, month, day).getTime() === today().getTime()}
      {@const items = byDay()[day] || []}
      
      <div class="bg-white min-h-[140px] p-2 flex flex-col transition-colors {isToday ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}">
        <div class="mb-2">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold {isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}">
            {day}
          </span>
        </div>
        
        <div class="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {#each items.slice(0, 4) as item}
            <button class="text-left w-full px-2.5 py-1.5 rounded-lg text-xs font-bold truncate transition-all {item.__type === 'job' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'}" title="{item.__name}">
              {item.__name}
            </button>
          {/each}
          {#if items.length > 4}
            <div class="px-2.5 py-1 text-xs font-bold text-slate-400">
              +{items.length - 4} more
            </div>
          {/if}
        </div>
      </div>
    {/each}
    
    <!-- Empty end cells to complete the grid -->
    {#if (startWeekday + daysInMonth) % 7 !== 0}
      {#each Array(7 - ((startWeekday + daysInMonth) % 7)) as _}
        <div class="bg-white min-h-[140px] opacity-40"></div>
      {/each}
    {/if}
  </div>
</section>
