<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import type { NetworkingContact } from '$lib/types';
  import { researchFaculty, type Faculty, type ResearchResult } from '$lib/facultyResearch';
  import { Microscope, Sparkles, Mail, Link as LinkIcon, Check, Plus, X, GraduationCap, Copy } from 'lucide-svelte';

  let { open = $bindable(false) } = $props<{ open?: boolean }>();

  const colleges = $derived($appData.colleges || []);
  const hasKey = $derived(!!$appData?.settings?.geminiApiKey);

  let school = $state('');
  let major = $state('');
  let isResearching = $state(false);
  let error = $state('');
  let result = $state<ResearchResult | null>(null);
  let addedKeys = $state<Set<string>>(new Set());
  let copiedKey = $state<string | null>(null);
  let expanded = $state<Set<string>>(new Set());

  function pickCollege(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    const c = colleges.find((x) => x.id === id);
    if (c) {
      school = c.school || '';
      major = c.program || '';
    }
  }

  async function runResearch() {
    if (!school.trim() || !major.trim()) {
      error = 'Enter a school and a major/field first.';
      return;
    }
    isResearching = true;
    error = '';
    result = null;
    addedKeys = new Set();
    try {
      result = await researchFaculty(school.trim(), major.trim(), {
        geminiKey: $appData?.settings?.geminiApiKey || undefined,
        limit: 10
      });
    } catch (e: any) {
      error = e?.message || 'Research failed. Check your connection and try again.';
    } finally {
      isResearching = false;
    }
  }

  function contactKey(f: Faculty): string {
    return f.openAlexId;
  }

  function alreadyAdded(f: Faculty): boolean {
    if (addedKeys.has(contactKey(f))) return true;
    const list = $appData.networkingContacts || [];
    const inst = (result?.institution.name || school).toLowerCase();
    return list.some(
      (c) => c.name.toLowerCase() === f.name.toLowerCase() && (c.company || '').toLowerCase() === inst
    );
  }

  function buildNotes(f: Faculty): string {
    const parts = [
      `Research: ${f.topics.join(', ') || f.department}`,
      `Fit: ${f.fitReason}`,
      f.emailStatus === 'unverified'
        ? '⚠ Email is a best-guess from the school pattern — confirm on their faculty page before sending.'
        : 'Email confirmed via web search.',
      f.profileUrl ? `Profile: ${f.profileUrl}` : '',
      '',
      '-- AI Outreach Draft --',
      f.outreachDraft
    ];
    return parts.filter((p) => p !== '').join('\n');
  }

  function addContact(f: Faculty) {
    const contact: NetworkingContact = {
      id: crypto.randomUUID(),
      name: f.name,
      role: f.department || 'Professor',
      company: result?.institution.name || school,
      status: 'To Reach Out',
      email: f.email || '',
      linkedInUrl: '',
      notes: buildNotes(f),
      createdAt: Date.now(),
      lastContactDate: Date.now(),
      source: 'research',
      profileUrl: f.profileUrl,
      researchArea: f.topics.join(', '),
      emailStatus: f.emailStatus
    };
    $appData.networkingContacts = [contact, ...($appData.networkingContacts || [])];
    saveUserData();
    addedKeys = new Set([...addedKeys, contactKey(f)]);
  }

  function addAll() {
    if (!result) return;
    for (const f of result.faculty) if (!alreadyAdded(f)) addContact(f);
  }

  function copyDraft(f: Faculty) {
    navigator.clipboard.writeText(f.outreachDraft);
    copiedKey = contactKey(f);
    setTimeout(() => {
      if (copiedKey === contactKey(f)) copiedKey = null;
    }, 2000);
  }

  function toggleDraft(f: Faculty) {
    const k = contactKey(f);
    const next = new Set(expanded);
    next.has(k) ? next.delete(k) : next.add(k);
    expanded = next;
  }

  function close() {
    open = false;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  >
    <div class="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
      <!-- Header -->
      <div class="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Microscope size={20} class="text-indigo-500" /> Research Faculty
          </h2>
          <p class="text-xs text-slate-500 font-medium mt-1">
            Real professors from the OpenAlex academic database{hasKey ? ', enriched by Gemini' : ''}.
          </p>
        </div>
        <button class="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onclick={close} aria-label="Close">
          <X size={22} />
        </button>
      </div>

      <div class="p-6 overflow-y-auto custom-scroll space-y-4">
        <!-- Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#if colleges.length > 0}
            <div class="sm:col-span-2">
              <label for="fr-college" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quick-fill from your college list</label>
              <select id="fr-college" class="input-field !py-2 !text-sm" onchange={pickCollege}>
                <option value="">Select a school you're applying to…</option>
                {#each colleges as c}
                  <option value={c.id}>{c.school}{c.program ? ` — ${c.program}` : ''}</option>
                {/each}
              </select>
            </div>
          {/if}
          <div>
            <label for="fr-school" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">School / University</label>
            <input id="fr-school" type="text" class="input-field !py-2 !text-sm" bind:value={school} placeholder="e.g. Stanford University" />
          </div>
          <div>
            <label for="fr-major" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Major / Research Field</label>
            <input id="fr-major" type="text" class="input-field !py-2 !text-sm" bind:value={major} placeholder="e.g. Computer Science" />
          </div>
        </div>

        <button
          type="button"
          class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          onclick={runResearch}
          disabled={isResearching}
        >
          {#if isResearching}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Researching real faculty…
          {:else}
            <Sparkles size={16} /> Find Professors
          {/if}
        </button>

        {#if !hasKey}
          <p class="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-lg px-3 py-2 font-medium">
            Add a Gemini API key in <a href="/settings" class="underline font-bold">Settings</a> to also get web-verified emails, fit ranking, and tailored outreach drafts. Without it, results use OpenAlex data with pattern-guessed emails.
          </p>
        {/if}

        {#if error}
          <p class="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 rounded-lg px-3 py-2 font-medium">{error}</p>
        {/if}

        {#if result}
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs font-bold text-slate-500">
              {result.faculty.length} researchers in {result.subfield.subfieldName} at {result.institution.name}
            </p>
            <button class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1" onclick={addAll}>
              <Plus size={12} /> Add all to CRM
            </button>
          </div>

          <!-- Accuracy legend -->
          <div class="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={10} /> Verified email</span>
            <span class="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">Unverified — confirm on profile</span>
          </div>

          <div class="space-y-3">
            {#each result.faculty as f (f.openAlexId)}
              <div class="bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <div class="flex justify-between items-start gap-3">
                  <div class="min-w-0">
                    <h4 class="font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                      <GraduationCap size={15} class="text-indigo-500 shrink-0" /> {f.name}
                    </h4>
                    <p class="text-xs text-slate-500 font-medium mt-0.5">{f.department}</p>
                  </div>
                  {#if alreadyAdded(f)}
                    <button disabled class="shrink-0 flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                      <Check size={14} /> Added
                    </button>
                  {:else}
                    <button onclick={() => addContact(f)} class="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus size={14} /> Add
                    </button>
                  {/if}
                </div>

                {#if f.topics.length > 0}
                  <div class="flex flex-wrap gap-1.5 mt-2.5">
                    {#each f.topics.slice(0, 4) as t}
                      <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-md">{t}</span>
                    {/each}
                  </div>
                {/if}

                <p class="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed italic">{f.fitReason}</p>

                <!-- Email + profile -->
                <div class="flex flex-wrap items-center gap-2 mt-3">
                  <a href="mailto:{f.email}" class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:text-indigo-500 transition-colors break-all">
                    <Mail size={13} /> {f.email || 'no email found'}
                  </a>
                  {#if f.emailStatus === 'verified'}
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={10} /> Verified</span>
                  {:else}
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">Confirm on profile</span>
                  {/if}
                  {#if f.profileUrl}
                    <a href={f.profileUrl} target="_blank" rel="noopener" class="text-[11px] font-bold text-indigo-500 hover:underline flex items-center gap-1">
                      <LinkIcon size={11} /> Profile
                    </a>
                  {/if}
                  <span class="text-[10px] text-slate-400 font-medium ml-auto">{f.citedByCount?.toLocaleString() ?? '—'} citations</span>
                </div>

                <!-- Outreach draft -->
                <div class="mt-3 border-t border-slate-100 dark:border-white/5 pt-2">
                  <div class="flex items-center justify-between">
                    <button class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1" onclick={() => toggleDraft(f)}>
                      <Sparkles size={11} /> {expanded.has(f.openAlexId) ? 'Hide' : 'View'} outreach draft
                    </button>
                    <button class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 transition-colors flex items-center gap-1" onclick={() => copyDraft(f)}>
                      {#if copiedKey === f.openAlexId}
                        <Check size={11} class="text-emerald-500" /> Copied
                      {:else}
                        <Copy size={11} /> Copy
                      {/if}
                    </button>
                  </div>
                  {#if expanded.has(f.openAlexId)}
                    <pre class="mt-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed custom-scroll max-h-52 overflow-y-auto">{f.outreachDraft}</pre>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end bg-slate-50/50 dark:bg-white/[0.02]">
        <button class="btn-secondary text-sm" onclick={close}>Done</button>
      </div>
    </div>
  </div>
{/if}
