<script lang="ts">
  import { onMount } from 'svelte';
  import { appData, saveUserData } from '$lib/stores';
  import type { CommonAppActivity } from '$lib/types';
  import { Plus, Trash2, GripVertical, AlertCircle, ArrowUp, ArrowDown, FileText } from 'lucide-svelte';

  // Make a local deep copy for optimistic UI updates, or just bind directly.
  let activities = $derived($appData.activities || []);

  const MAX_ACTIVITIES = 10;
  
  function addActivity() {
    if (activities.length >= MAX_ACTIVITIES) return;
    
    const newAct: CommonAppActivity = {
      id: crypto.randomUUID(),
      type: '',
      position: '',
      organization: '',
      description: '',
      gradeLevels: [],
      timing: '',
      hoursPerWeek: '',
      weeksPerYear: ''
    };
    
    $appData.activities = [...activities, newAct];
    saveUserData();
  }

  function removeActivity(id: string) {
    if (confirm('Are you sure you want to delete this activity?')) {
      $appData.activities = activities.filter(a => a.id !== id);
      saveUserData();
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const arr = [...activities];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    $appData.activities = arr;
    saveUserData();
  }

  function moveDown(index: number) {
    if (index === activities.length - 1) return;
    const arr = [...activities];
    [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    $appData.activities = arr;
    saveUserData();
  }

  function save() {
    saveUserData();
  }

  let openDropdownId = $state<string | null>(null);

  function toggleDropdown(e: Event, id: string) {
    e.stopPropagation();
    if (openDropdownId === id) openDropdownId = null;
    else openDropdownId = id;
  }

  const ACTIVITY_TYPES = [
    "Academic", "Art", "Athletics: Club", "Athletics: JV/Varsity", 
    "Career Oriented", "Community Service (Volunteer)", "Computer/Technology", 
    "Cultural", "Debate/Speech", "Environmental", "Family Responsibilities", 
    "Journalism/Publication", "Music: Instrumental", "Music: Vocal", 
    "Research", "Robotics", "Student Govt/Politics", "Work (Paid)", "Other"
  ];

  const TIMING_OPTIONS = ["School year", "School break", "All year"];

  function setActivityType(e: Event, act: CommonAppActivity, type: string) {
    e.stopPropagation();
    act.type = type;
    openDropdownId = null;
    save();
  }

  function setTiming(e: Event, act: CommonAppActivity, timing: string) {
    e.stopPropagation();
    act.timing = timing;
    openDropdownId = null;
    save();
  }
</script>

<svelte:window onclick={() => openDropdownId = null} />

<div class="max-w-5xl mx-auto pb-8 fade-in">
  <div class="flex justify-between items-end mb-8">
    <div>
      <h1 class="text-3xl font-extrabold text-black dark:text-white tracking-tight mb-2">Common App Activities</h1>
      <p class="text-slate-500 font-medium">Craft and order your maximum of 10 extracurriculars. Strict character limits applied.</p>
    </div>
    
    <div class="flex items-center gap-4">
      <div class="text-sm font-bold {activities.length === MAX_ACTIVITIES ? 'text-red-500' : 'text-slate-500'}">
        {activities.length} / {MAX_ACTIVITIES}
      </div>
      <button onclick={addActivity} disabled={activities.length >= MAX_ACTIVITIES} class="bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black font-bold py-2.5 px-5 rounded-xl transition-all shadow-xl shadow-black/10 dark:shadow-white/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        <Plus size={18} strokeWidth={2.5} />
        Add Activity
      </button>
    </div>
  </div>

  <div class="space-y-6">
    {#each activities as act, index (act.id)}
      <div class="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden relative group">
        <!-- Header Strip -->
        <div class="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 px-4 py-3 flex justify-between items-center relative">
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">{index + 1}</span>
            <div class="relative">
              <button onclick={(e) => toggleDropdown(e, act.id + '-type')} class="text-sm font-bold text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                {act.type || 'Select Activity Type...'}
                <svg class="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {#if openDropdownId === act.id + '-type'}
                <div class="absolute z-50 left-0 mt-2 w-64 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden overflow-y-auto max-h-64 custom-scroll" onclick={(e) => e.stopPropagation()}>
                  {#each ACTIVITY_TYPES as type}
                    <button onclick={(e) => setActivityType(e, act, type)} class="w-full text-left px-5 py-3 text-sm font-bold {act.type === type ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'} transition-colors border-b border-slate-100 dark:border-white/5 last:border-0">
                      {type}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick={() => moveUp(index)} disabled={index === 0} class="p-1.5 text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" title="Move Up"><ArrowUp size={16} /></button>
            <button onclick={() => moveDown(index)} disabled={index === activities.length - 1} class="p-1.5 text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" title="Move Down"><ArrowDown size={16} /></button>
            <div class="w-px h-4 bg-slate-300 dark:bg-white/20 mx-1"></div>
            <button onclick={() => removeActivity(act.id)} class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" title="Delete"><Trash2 size={16} /></button>
          </div>
        </div>
        
        <!-- Form Body -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="form-field">
              <div class="flex justify-between items-center mb-1.5">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Position/Leadership</label>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {act.position.length > 50 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}">
                  {act.position.length}/50
                </span>
              </div>
              <input type="text" bind:value={act.position} oninput={save} class="input-field {act.position.length > 50 ? 'border-red-400 focus:ring-red-500' : ''}" placeholder="e.g. Founder & President" />
            </div>
            
            <div class="form-field">
              <div class="flex justify-between items-center mb-1.5">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Organization Name</label>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {act.organization.length > 50 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}">
                  {act.organization.length}/50
                </span>
              </div>
              <input type="text" bind:value={act.organization} oninput={save} class="input-field {act.organization.length > 50 ? 'border-red-400 focus:ring-red-500' : ''}" placeholder="e.g. Model United Nations" />
            </div>
          </div>

          <div class="form-field mb-6">
            <div class="flex justify-between items-center mb-1.5">
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Description</label>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {act.description.length > 150 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}">
                {act.description.length}/150
              </span>
            </div>
            <textarea bind:value={act.description} oninput={save} class="input-field min-h-[80px] {act.description.length > 150 ? 'border-red-400 focus:ring-red-500' : ''}" placeholder="Describe your accomplishments and responsibilities..."></textarea>
            {#if act.description.length > 150}
              <p class="text-xs font-bold text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> Over the Common App 150 character limit.</p>
            {/if}
          </div>
          
          <!-- Metrics Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div class="form-field">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Grades</label>
              <input type="text" bind:value={act.gradeLevels} oninput={save} class="input-field !py-2 !text-sm" placeholder="9, 10, 11, 12" />
            </div>
            <div class="form-field relative">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Timing</label>
              <button onclick={(e) => toggleDropdown(e, act.id + '-timing')} class="input-field !py-2 !text-sm text-left flex justify-between items-center w-full">
                {act.timing || 'Select...'}
                <svg class="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {#if openDropdownId === act.id + '-timing'}
                <div class="absolute z-50 left-0 w-full mt-2 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden overflow-y-auto max-h-40 custom-scroll" onclick={(e) => e.stopPropagation()}>
                  {#each TIMING_OPTIONS as timing}
                    <button onclick={(e) => setTiming(e, act, timing)} class="w-full text-left px-4 py-2.5 text-sm font-bold {act.timing === timing ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'} transition-colors border-b border-slate-100 dark:border-white/5 last:border-0">
                      {timing}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
            <div class="form-field">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Hrs/Week</label>
              <input type="text" bind:value={act.hoursPerWeek} oninput={save} class="input-field !py-2 !text-sm" placeholder="e.g. 5" />
            </div>
            <div class="form-field">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Wks/Year</label>
              <input type="text" bind:value={act.weeksPerYear} oninput={save} class="input-field !py-2 !text-sm" placeholder="e.g. 30" />
            </div>
          </div>

        </div>
      </div>
    {/each}
    
    {#if activities.length === 0}
      <div class="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#111] border border-dashed border-slate-300 dark:border-white/20 rounded-3xl">
        <div class="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <FileText size={24} />
        </div>
        <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Activities Yet</h3>
        <p class="text-sm font-medium text-slate-500 max-w-sm mb-6">The Common App allows up to 10 activities. Click the button above to start crafting your list.</p>
        <button onclick={addActivity} class="bg-black dark:bg-white text-white dark:text-black font-bold py-2.5 px-6 rounded-xl hover:scale-105 transition-transform">
          Add First Activity
        </button>
      </div>
    {/if}
  </div>
</div>
