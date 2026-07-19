<script lang="ts">
  import type { BaseApplication } from '$lib/types';
  import { statusVariant, deadlineUrgencyClass, daysUntil, fmtDate, ensureUrl, needsFollowUp } from '$lib/utils';
  import { Star, Clock, Link2, ExternalLink, CheckCircle2, MoreHorizontal, User, Mail, AlertCircle } from '@lucide/svelte';
  
  let { entry, type, index, isSelected, toggleSelect } = $props<{
    entry: BaseApplication & { company?: string; school?: string; role?: string; location?: string; program?: string; deadlineType?: string; jobLink?: string };
    type: 'job' | 'college';
    index: number;
    isSelected: boolean;
    toggleSelect: (id: string) => void;
  }>();

  let isJob = $derived(type === 'job');
  let title = $derived(isJob ? entry.company : entry.school);
  let subParts = $derived(isJob ? [entry.role, entry.location] : [entry.program, entry.deadlineType]);
  let sub = $derived(subParts.filter(Boolean).join(' · '));
  
  let urgency = $derived(deadlineUrgencyClass(entry.deadline));
  let days = $derived(daysUntil(entry.deadline));
  
  let links = $derived(() => {
    const l = [];
    if (isJob && entry.jobLink) l.push({ label: 'Posting', url: entry.jobLink });
    if (entry.portalLink) l.push({ label: isJob ? 'Portal' : 'Portal / Common App', url: entry.portalLink });
    return l;
  });

  let clDone = $derived((entry.checklist || []).filter((c: any) => c.done).length);
  let sv = $derived(statusVariant(entry.status));
  let followUpNeeded = $derived(needsFollowUp(entry));

  import { appData, saveUserData, modalState } from '$lib/stores';
  import { Archive } from '@lucide/svelte';

  function handleArchive(e: Event) {
    e.stopPropagation();
    if (isJob) {
      const idx = $appData.jobs.findIndex(j => j.id === entry.id);
      if (idx >= 0) $appData.jobs[idx].archived = !$appData.jobs[idx].archived;
    } else {
      const idx = $appData.colleges.findIndex(c => c.id === entry.id);
      if (idx >= 0) $appData.colleges[idx].archived = !$appData.colleges[idx].archived;
    }
    saveUserData();
  }

  function openModal() {
    modalState.set({
      isOpen: true,
      type,
      editId: entry.id,
      degreeType: entry.degreeType
    });
  }
</script>

<div class="glass-panel card-hover p-5 sm:p-6 transition-all duration-300 relative group {isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}" style="animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: {Math.min(index || 0, 12) * 40}ms">
  
  <div class="flex items-start gap-4">
    <!-- Checkbox -->
    <button aria-label="Select {title}" class="mt-1 flex-shrink-0 w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center {isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400 text-transparent'}" onclick={(e) => { e.stopPropagation(); toggleSelect(entry.id); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </button>
    
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="flex-1 min-w-0 cursor-pointer" onclick={openModal}>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <h3 class="text-xl font-bold text-slate-900 truncate pr-2" title={title}>{title || 'Untitled'}</h3>
          {#if sub}
            <p class="text-sm font-medium text-slate-500 mt-1 truncate pr-2">{sub}</p>
          {/if}
        </div>
        <button aria-label="Toggle Star" class="flex-shrink-0 p-2 -mt-2 -mr-2 rounded-xl transition-all {entry.starred ? 'text-amber-400 bg-amber-50 hover:bg-amber-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}" onclick={(e) => { e.stopPropagation(); entry.starred = !entry.starred; saveUserData(); }}>
          <Star class={entry.starred ? "fill-current" : ""} size={20} />
        </button>
      </div>
      
      <!-- Meta Row -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider 
          {statusVariant(entry.status) === 'is-positive' ? 'bg-black text-white dark:bg-white dark:text-black' : statusVariant(entry.status) === 'is-negative' ? 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400' : statusVariant(entry.status) === 'is-pending' ? 'border-2 border-black text-black dark:border-white dark:text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-500'}">
          {entry.status || 'Not set'}
        </span>
        
        {#if entry.deadline}
          <div class="w-1 h-1 rounded-full bg-slate-300"></div>
          <span class="inline-flex items-center gap-1.5 text-sm font-bold {urgency === 'overdue' ? 'text-rose-500' : urgency === 'soon' ? 'text-rose-500' : 'text-slate-500'}">
            <Clock size={14} />
            {fmtDate(entry.deadline)}
            {#if urgency === 'overdue'}
               · <span class="text-xs uppercase tracking-wide">overdue</span>
            {:else if urgency === 'soon'}
               · {days}d
            {/if}
          </span>
        {/if}
        
        {#if followUpNeeded}
          <div class="w-1 h-1 rounded-full bg-slate-300"></div>
          <span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200" title="It's been 7+ days since your last status update.">
            <AlertCircle size={14} />
            Needs Follow-up
          </span>
        {/if}

        {#if isJob && entry.status === 'Applied' && (Date.now() - (entry.updatedAt || entry.createdAt || Date.now())) > 45 * 24 * 60 * 60 * 1000}
          <div class="w-1 h-1 rounded-full bg-slate-300"></div>
          <span class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200" title="No updates in 45 days. Consider marking as Ghosted.">
            👻 Auto-Ghosted
          </span>
        {/if}
      </div>

      <!-- Tags -->
      {#if entry.tags && entry.tags.length > 0}
        <div class="mt-4 flex flex-wrap gap-2">
          {#each entry.tags as tag}
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {tag}
            </span>
          {/each}
        </div>
      {/if}

      <!-- Links & Integrations -->
      <div class="mt-4 flex flex-wrap gap-2">
        {#each links() as link}
          <a href={ensureUrl(link.url)} target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()} class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#222] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shadow-sm">
            {#if link.label === 'Posting'}
              <ExternalLink size={14} />
            {:else}
              <Link2 size={14} />
            {/if}
            {link.label}
          </a>
        {/each}
        
        <!-- Smart Email Search -->
        <a href="https://mail.google.com/mail/u/0/#search/{encodeURIComponent(title || '')}" target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()} class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#222] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm" title="Search Gmail for {title}">
          <Mail size={14} />
          Find in Gmail
        </a>
      </div>

      <!-- Checklist -->
      {#if entry.checklist && entry.checklist.length > 0}
        <div class="mt-5 flex items-center gap-3">
          <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full transition-all duration-500" style="width: {Math.round(clDone / entry.checklist.length * 100)}%"></div>
          </div>
          <span class="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CheckCircle2 size={12} class={clDone === entry.checklist.length ? 'text-emerald-500' : ''} />
            {clDone}/{entry.checklist.length}
          </span>
        </div>
      {/if}

      <!-- Contact -->
      {#if entry.contact && (entry.contact.name || entry.contact.email)}
        <div class="mt-5 pt-5 border-t border-slate-100 flex items-center gap-2 text-sm font-medium text-slate-600">
          <User size={14} class="text-slate-400" />
          <span class="truncate">{entry.contact.name || entry.contact.email}</span>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
    <button aria-label={entry.archived ? "Unarchive" : "Archive"} class="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors" title={entry.archived ? "Unarchive" : "Archive"} onclick={handleArchive}>
      <Archive size={18} />
    </button>
  </div>
</div>
