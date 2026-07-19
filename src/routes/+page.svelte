<script lang="ts">
  import { appData } from '$lib/stores';
  import { Target, TrendingUp, Award, Zap, Calendar, Activity, ChevronRight, Briefcase, GraduationCap, Flame, ArrowUpRight, Check } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // Metrics
  let totalJobs = $derived($appData.jobs.length);
  let jobsApplied = $derived($appData.jobs.filter(j => j.status !== 'Wishlist').length);
  let jobsInterview = $derived($appData.jobs.filter(j => ['Interview', 'Interviewing', 'Phone Screen', 'Offer'].includes(j.status)).length);
  let jobsOffer = $derived($appData.jobs.filter(j => j.status === 'Offer').length);
  let jobConversion = $derived(jobsApplied > 0 ? Math.round((jobsInterview / jobsApplied) * 100) : 0);

  let totalColleges = $derived($appData.colleges.length);
  let collegesSubmitted = $derived($appData.colleges.filter(c => ['Submitted', 'Interview', 'Accepted', 'Waitlisted', 'Deferred', 'Enrolled'].includes(c.status)).length);
  let collegesAccepted = $derived($appData.colleges.filter(c => ['Accepted', 'Enrolled'].includes(c.status)).length);
  
  // Animated Counters
  let dispTotalApps = $state(0);
  let dispJobConv = $state(0);
  let dispJobsOffer = $state(0);
  let dispJobsInterview = $state(0);

  $effect(() => {
    // We only want to run this once when the derived metrics are calculated. 
    // Using $effect ensures it runs on mount and tracks changes.
    let frame: number;
    let start = Date.now();
    const duration = 1500;
    const targetApps = totalJobs + totalColleges;
    const targetConv = jobConversion;
    const targetOffer = jobsOffer;
    const targetInt = jobsInterview;
    
    function animate() {
      const now = Date.now();
      const progress = Math.min((now - start) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      dispTotalApps = Math.round(easeOut * targetApps);
      dispJobConv = Math.round(easeOut * targetConv);
      dispJobsOffer = Math.round(easeOut * targetOffer);
      dispJobsInterview = Math.round(easeOut * targetInt);
      
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });

  // Gamification (XP & Level)
  let xp = $derived.by(() => {
    let total = 0;
    for (const j of $appData.jobs) {
      total += 10;
      if (j.history) {
        for (const h of j.history) {
          if (['Interview', 'Interviewing', 'Phone Screen'].includes(h.status)) total += 50;
          if (h.status === 'Offer') total += 200;
        }
      }
    }
    for (const c of $appData.colleges) {
      total += 10;
      if (c.history) {
        for (const h of c.history) {
          if (h.status === 'Interview') total += 50;
          if (['Accepted', 'Enrolled'].includes(h.status)) total += 200;
        }
      }
    }
    return total;
  });
  let level = $derived(Math.floor(xp / 500) + 1);
  let xpToNextLevel = $derived(500 - (xp % 500));

  // Consistency Heatmap (Last 35 days)
  let consistencyData = $derived.by(() => {
    const days = 35;
    const now = new Date();
    now.setHours(0,0,0,0);
    const data = Array(days).fill(0);
    
    const allApps = [...$appData.jobs, ...$appData.colleges];
    for (const app of allApps) {
      if (app.createdAt) {
        const t = new Date(app.createdAt);
        t.setHours(0,0,0,0);
        const diffDays = Math.round((now.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < days) {
          data[days - 1 - diffDays]++;
        }
      }
    }
    return data;
  });

  // Next Best Action
  let nextBestAction = $derived.by(() => {
    const now = Date.now();
    for (const j of $appData.jobs) {
      if (j.status === 'Applied' && j.history && j.history.length > 0) {
        const lastUpdate = j.history[j.history.length - 1].date;
        if (now - lastUpdate > 7 * 24 * 60 * 60 * 1000) {
          return { type: 'Follow Up', target: j.company, msg: `It's been over a week since you applied to ${j.company}. Time to send a follow-up or find a referral!`, role: j.role };
        }
      }
      if (['Interview', 'Interviewing', 'Phone Screen'].includes(j.status) && j.history) {
         const lastUpdate = j.history[j.history.length - 1].date;
         if (now - lastUpdate > 3 * 24 * 60 * 60 * 1000) {
            return { type: 'Send Thank You', target: j.company, msg: `You recently interviewed at ${j.company}. Don't forget to send a customized thank-you note to your recruiters!`, role: j.role };
         }
      }
      if (j.status === 'Offer') {
        return { type: 'Negotiate', target: j.company, msg: `You have an offer from ${j.company}! Make sure to review the compensation package carefully and prepare to negotiate.`, role: j.role };
      }
    }
    return { type: 'Keep Pushing', target: 'Applications', msg: 'Your pipeline looks clean. Try sending out 2 more applications today to keep the momentum going.', role: '' };
  });

  // Streak
  let streak = $derived.by(() => {
    const stamps = [
      ...$appData.jobs.map(j => j.createdAt),
      ...$appData.colleges.map(c => c.createdAt)
    ].filter(Boolean) as number[];
    if (stamps.length === 0) return 0;
    const days = new Set(stamps.map(t => new Date(t).toDateString()));
    return days.size;
  });

  // Recent Activity Feed
  let recentActivity = $derived.by(() => {
    let activities: { title: string, subtitle: string, status: string, date: number, type: 'job' | 'college' }[] = [];
    for (const j of $appData.jobs) {
      if (j.history) {
        for (const h of j.history) {
          activities.push({ title: j.company, subtitle: j.role || 'Application', status: h.status, date: h.date, type: 'job' });
        }
      }
    }
    for (const c of $appData.colleges) {
      if (c.history) {
        for (const h of c.history) {
          activities.push({ title: c.school, subtitle: c.program || 'Application', status: h.status, date: h.date, type: 'college' });
        }
      }
    }
    return activities.sort((a, b) => b.date - a.date).slice(0, 8);
  });

  // Upcoming Deadlines
  let upcomingDeadlines = $derived.by(() => {
    let deadlines: { title: string, subtitle: string, dateStr: string, timestamp: number, type: 'job'|'college' }[] = [];
    const now = Date.now();
    const sevenDays = now + (7 * 24 * 60 * 60 * 1000);

    for (const j of $appData.jobs) {
      if (j.deadline && !['Offer', 'Rejected', 'Withdrawn'].includes(j.status)) {
        const ts = new Date(j.deadline + 'T23:59:59').getTime();
        if (ts >= now - (24 * 60 * 60 * 1000) && ts <= sevenDays) {
          deadlines.push({ title: j.company, subtitle: j.role || 'Deadline', dateStr: j.deadline, timestamp: ts, type: 'job' });
        }
      }
    }
    for (const c of $appData.colleges) {
      if (c.deadline && !['Accepted', 'Rejected', 'Enrolled', 'Submitted'].includes(c.status)) {
        const ts = new Date(c.deadline + 'T23:59:59').getTime();
        if (ts >= now - (24 * 60 * 60 * 1000) && ts <= sevenDays) {
          deadlines.push({ title: c.school, subtitle: c.deadlineType || 'Deadline', dateStr: c.deadline, timestamp: ts, type: 'college' });
        }
      }
    }
    return deadlines.sort((a, b) => a.timestamp - b.timestamp).slice(0, 6);
  });

  // Application Velocity Chart
  let velocityData = $derived.by(() => {
    const days = 14;
    const now = new Date();
    now.setHours(0,0,0,0);
    const data = Array(days).fill(0);
    const labels = Array(days).fill('');

    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - ((days - 1 - i) * 24 * 60 * 60 * 1000));
      labels[i] = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    const allApps = [...$appData.jobs, ...$appData.colleges];
    for (const app of allApps) {
      if (app.createdAt) {
        const t = new Date(app.createdAt);
        t.setHours(0,0,0,0);
        const diffDays = Math.round((now.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < days) {
          data[days - 1 - diffDays]++;
        }
      }
    }
    
    const maxVal = Math.max(...data, 5);
    const points = data.map((val, idx) => {
      const x = (idx / (days - 1)) * 100;
      const y = 100 - ((val / maxVal) * 100);
      return `${x},${y}`;
    }).join(' ');
    
    return { data, labels, points, maxVal };
  });

  // Dynamic Greeting
  let greeting = $derived.by(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  });
  
  // SVG Smooth Line Generator
  function createSmoothPath(dataPoints: number[], max: number) {
    if (dataPoints.length === 0) return '';
    const pts = dataPoints.map((val, idx) => ({
      x: (idx / (dataPoints.length - 1)) * 100,
      y: 100 - ((val / max) * 100)
    }));
    
    let d = `M ${pts[0].x},${pts[0].y} `;
    for (let i = 1; i < pts.length; i++) {
      const curr = pts[i];
      const prev = pts[i - 1];
      const cx = (prev.x + curr.x) / 2;
      d += `C ${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y} `;
    }
    return d;
  }

  let velocityChartPath = $derived.by(() => {
    return createSmoothPath(velocityData.data, velocityData.maxVal);
  });
  
  let velocityAreaPath = $derived.by(() => {
    return `${velocityChartPath} L 100,100 L 0,100 Z`;
  });
</script>

<svelte:head>
  <title>Command Center | Panacea</title>
</svelte:head>

<style>
  @keyframes ticker {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
  .animate-ticker {
    animation: ticker 20s linear infinite;
  }
  .animate-ticker:hover {
    animation-play-state: paused;
  }
</style>

<div class="grid grid-cols-1 md:grid-cols-6 gap-6 max-w-7xl mx-auto fade-in pb-12">
  
  <!-- Live Ticker (Spans all cols) -->
  <div class="glass-panel md:col-span-6 overflow-hidden flex items-center py-2 relative bg-gradient-to-r from-slate-900 to-black text-white border-white/10 card-hover !translate-y-0 !shadow-md h-10">
    <div class="flex items-center absolute left-0 z-10 bg-gradient-to-r from-slate-900 via-slate-900 to-transparent pr-8 pl-4 h-full">
      <div class="w-2 h-2 bg-rose-500 rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(244,63,94,1)]"></div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-slate-300">Live</span>
    </div>
    <div class="flex whitespace-nowrap animate-ticker pl-[100%] text-sm font-semibold text-slate-300 w-full hover:text-white transition-colors">
      {#each upcomingDeadlines as d}
        <span class="mx-8 flex items-center gap-2">
          <span class="text-amber-500">•</span>
          {d.title} ({d.subtitle}) - <span class="text-indigo-400">{new Date(d.timestamp).toLocaleDateString()}</span>
        </span>
      {/each}
      {#if upcomingDeadlines.length === 0}
        <span class="mx-8 flex items-center gap-2">
          <span class="text-amber-500">•</span>
          No immediate deadlines. Keep pushing!
        </span>
      {/if}
    </div>
  </div>

  <!-- Bento: Hero (Spans 4 cols on desktop) -->
  <div class="glass-panel md:col-span-4 p-8 relative overflow-hidden group card-hover text-white bg-[#0A0A0A] border-white/10 shadow-2xl flex flex-col justify-center min-h-[220px]">
    <!-- Animated Gradients -->
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 group-hover:scale-110 transition-transform duration-1000"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 group-hover:scale-110 transition-transform duration-1000 delay-100"></div>
    <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay pointer-events-none"></div>

    <div class="relative z-10">
      <p class="text-indigo-400 font-bold tracking-widest uppercase text-[10px] mb-2 flex items-center gap-1.5">
        <Zap size={14} class="text-amber-400" /> Command Center
      </p>
      <h1 class="text-3xl sm:text-4xl font-black tracking-tight mb-2">
        {greeting}.
      </h1>
      <p class="text-slate-400 text-sm sm:text-base font-medium max-w-md leading-relaxed">
        You have <strong class="text-white">{upcomingDeadlines.length} upcoming deadlines</strong> and an active streak of <strong class="text-white">{streak} days</strong>. Keep up the momentum!
      </p>
    </div>
  </div>

  <!-- Bento: Level / XP (Spans 2 cols) -->
  <div class="glass-panel md:col-span-2 p-6 card-hover relative overflow-hidden bg-gradient-to-br from-slate-900 to-black text-white border-white/10 flex flex-col justify-between min-h-[220px]">
    <div class="absolute top-0 right-0 p-4 opacity-10">
      <Award size={100} />
    </div>
    
    <div class="relative z-10 flex items-center justify-between mb-8">
      <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg">
        <Award size={20} />
      </div>
      <div class="text-right">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total XP</p>
        <p class="text-lg font-black text-amber-400">{xp.toLocaleString()}</p>
      </div>
    </div>
    
    <div class="relative z-10">
      <div class="flex items-end justify-between mb-2">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Level</p>
          <p class="text-3xl font-black">Lvl {level}</p>
        </div>
        <span class="text-[10px] font-bold text-slate-400">{500 - xpToNextLevel}/500 XP</span>
      </div>
      <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-out" style="width: {((500 - xpToNextLevel) / 500) * 100}%"></div>
      </div>
    </div>
  </div>

  <!-- Bento: Next Best Action (Spans 3 cols) -->
  <div class="glass-panel md:col-span-3 p-6 card-hover flex flex-col min-h-[200px] {nextBestAction.type === 'Follow Up' ? 'border-rose-200 dark:border-rose-500/30' : nextBestAction.type === 'Negotiate' ? 'border-emerald-200 dark:border-emerald-500/30' : nextBestAction.type === 'Send Thank You' ? 'border-indigo-200 dark:border-indigo-500/30' : 'border-amber-200 dark:border-amber-500/30'}">
    <div class="flex items-start gap-4 mb-auto">
      <div class="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center shadow-sm {nextBestAction.type === 'Follow Up' ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white' : nextBestAction.type === 'Negotiate' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : nextBestAction.type === 'Send Thank You' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 text-white' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'}">
        <Zap size={24} />
      </div>
      <div>
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">AI Recommendation</h3>
        <p class="text-xl font-black text-slate-900 dark:text-white leading-tight mb-1">{nextBestAction.type}</p>
        <p class="text-sm font-bold text-slate-600 dark:text-slate-300">{nextBestAction.target}</p>
      </div>
    </div>
    
    <div class="mt-4 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
      <p class="text-sm text-slate-600 dark:text-slate-300 font-medium">{nextBestAction.msg}</p>
    </div>
    
    {#if nextBestAction.type !== 'Keep Pushing'}
      <button class="mt-4 w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-sm hover:scale-[1.02] transition-transform" onclick={() => window.location.href = '/networking'}>
        Draft Email
      </button>
    {/if}
  </div>

  <!-- Bento: Velocity Chart (Spans 3 cols) -->
  <div class="glass-panel md:col-span-3 p-6 card-hover flex flex-col min-h-[200px]">
    <div class="flex justify-between items-start mb-6">
      <div>
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Application Velocity</h3>
        <p class="text-lg font-black text-slate-900 dark:text-white">14-Day Activity</p>
      </div>
      <div class="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-500/20">
        <TrendingUp size={14} class="inline mr-1" /> Trending
      </div>
    </div>
    
    <div class="flex-1 w-full relative min-h-[100px] mt-auto">
      {#if velocityData.data.reduce((a, b) => a + b, 0) === 0}
        <div class="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-400">No recent activity</div>
      {:else}
        <svg class="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="velocityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgb(99 102 241)" stop-opacity="0.3" />
              <stop offset="100%" stop-color="rgb(99 102 241)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d={velocityAreaPath} fill="url(#velocityGradient)" />
          <path d={velocityChartPath} fill="none" stroke="rgb(99 102 241)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-md" />
        </svg>
      {/if}
    </div>
  </div>

  <!-- Bento: Metrics Grid (Spans 2 cols) -->
  <div class="glass-panel md:col-span-2 p-6 card-hover flex flex-col gap-4 min-h-[200px] relative overflow-hidden group">
    <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-400/20 rounded-full mix-blend-screen filter blur-[40px] group-hover:scale-150 transition-transform duration-700"></div>
    <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 relative z-10">Global Metrics</h3>
    
    <div class="grid grid-cols-2 gap-3 flex-1 relative z-10">
      <div class="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/10 flex flex-col justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Apps</p>
        <p class="text-2xl font-black text-slate-900 dark:text-white">{dispTotalApps}</p>
      </div>
      <div class="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-3 border border-indigo-100 dark:border-indigo-500/20 flex flex-col justify-center hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
        <p class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Conversion</p>
        <p class="text-2xl font-black text-indigo-700 dark:text-indigo-300">{dispJobConv}%</p>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-500/20 flex flex-col justify-center hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
        <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Offers</p>
        <p class="text-2xl font-black text-emerald-700 dark:text-emerald-300">{dispJobsOffer}</p>
      </div>
      <div class="bg-rose-50 dark:bg-rose-500/10 rounded-xl p-3 border border-rose-100 dark:border-rose-500/20 flex flex-col justify-center hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
        <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Interviews</p>
        <p class="text-2xl font-black text-rose-700 dark:text-rose-300">{dispJobsInterview}</p>
      </div>
    </div>
  </div>

  <!-- Bento: Upcoming Deadlines (Spans 2 cols) -->
  <div class="glass-panel md:col-span-2 p-0 card-hover flex flex-col overflow-hidden min-h-[200px]">
    <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Calendar size={14} class="text-rose-500" /> Upcoming Deadlines</h3>
    </div>
    <div class="flex-1 overflow-y-auto custom-scroll p-2">
      {#if upcomingDeadlines.length === 0}
        <div class="h-full flex items-center justify-center text-sm font-bold text-slate-400">No deadlines this week</div>
      {:else}
        {#each upcomingDeadlines as d}
          <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
            <div class="w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white font-bold group-hover:bg-rose-50 dark:group-hover:bg-rose-500/20 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              <span class="text-[10px] uppercase leading-none">{new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short' })}</span>
              <span class="text-sm leading-none">{new Date(d.timestamp).getDate()}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{d.title}</p>
              <p class="text-[11px] font-semibold text-slate-500 truncate">{d.subtitle}</p>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Bento: Recent Activity (Spans 2 cols) -->
  <div class="glass-panel md:col-span-2 p-0 card-hover flex flex-col overflow-hidden min-h-[200px]">
    <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
      <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Activity size={14} class="text-emerald-500" /> Recent Activity</h3>
    </div>
    <div class="flex-1 flex flex-col gap-1 overflow-y-auto custom-scroll p-4">
      {#if recentActivity.length === 0}
        <div class="h-full flex items-center justify-center text-sm font-bold text-slate-400">No recent activity</div>
      {:else}
        {#each recentActivity as activity}
          <div class="flex items-start gap-3 relative mb-2 last:mb-0">
            <div class="w-2 h-2 rounded-full mt-1.5 {activity.type === 'job' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'} shrink-0"></div>
            <div class="min-w-0 pb-3 border-b border-slate-100 dark:border-white/5 w-full">
              <div class="flex justify-between items-start gap-2 mb-0.5">
                <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{activity.title}</p>
                <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(activity.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
              </div>
              <p class="text-[11px] font-medium text-slate-500 truncate"><strong class="text-indigo-600 dark:text-indigo-400">{activity.status}</strong> • {activity.subtitle}</p>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

</div>
