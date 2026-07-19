<script lang="ts">
  import { appData, saveUserData } from '$lib/stores';
  import { FileText, Plus, Trash2, GripVertical, Settings2, Sparkles } from 'lucide-svelte';

  let resume = $derived({
    name: $appData.masterResume?.name || '',
    contactInfo: $appData.masterResume?.contactInfo || '',
    summary: $appData.masterResume?.summary || '',
    experience: $appData.masterResume?.experience || [],
    education: $appData.masterResume?.education || [],
    skills: $appData.masterResume?.skills || ''
  });

  function updateField(field: keyof typeof resume, value: any) {
    if (!$appData.masterResume) {
      $appData.masterResume = {
        name: '', contactInfo: '', summary: '', experience: [], education: [], skills: ''
      };
    }
    $appData.masterResume = { ...$appData.masterResume, [field]: value };
    saveUserData();
  }

  function addExperience() {
    const newExp = { id: crypto.randomUUID(), company: '', role: '', dateRange: '', bullets: [''] };
    updateField('experience', [...resume.experience, newExp]);
  }

  function removeExperience(id: string) {
    updateField('experience', resume.experience.filter(e => e.id !== id));
  }

  function addExpBullet(expId: string) {
    const newExp = resume.experience.map(e => {
      if (e.id === expId) return { ...e, bullets: [...e.bullets, ''] };
      return e;
    });
    updateField('experience', newExp);
  }

  function updateExpBullet(expId: string, idx: number, value: string) {
    const newExp = resume.experience.map(e => {
      if (e.id === expId) {
        const newBullets = [...e.bullets];
        newBullets[idx] = value;
        return { ...e, bullets: newBullets };
      }
      return e;
    });
    updateField('experience', newExp);
  }

  function removeExpBullet(expId: string, idx: number) {
    const newExp = resume.experience.map(e => {
      if (e.id === expId) {
        const newBullets = [...e.bullets];
        newBullets.splice(idx, 1);
        return { ...e, bullets: newBullets };
      }
      return e;
    });
    updateField('experience', newExp);
  }

  function addEducation() {
    const newEdu = { id: crypto.randomUUID(), school: '', degree: '', dateRange: '', gpa: '', bullets: [] };
    updateField('education', [...resume.education, newEdu]);
  }

  function removeEducation(id: string) {
    updateField('education', resume.education.filter(e => e.id !== id));
  }

  let activeTab = $state<'editor' | 'preview'>('editor');
</script>

<svelte:head>
  <title>Resume Studio | Panacea</title>
</svelte:head>

<div class="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col fade-in max-w-7xl mx-auto px-4 pb-4">
  <header class="flex items-center justify-between mb-6 mt-4">
    <div>
      <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
        <FileText class="text-indigo-500" size={32} />
        Resume Studio
      </h1>
      <p class="text-slate-500 font-medium mt-1">Build your Master Template. The AI will auto-tailor this for every job.</p>
    </div>
    
    <div class="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 lg:hidden">
      <button class="px-4 py-2 rounded-lg text-sm font-bold transition-all {activeTab === 'editor' ? 'bg-white dark:bg-[#111] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}" onclick={() => activeTab = 'editor'}>Edit</button>
      <button class="px-4 py-2 rounded-lg text-sm font-bold transition-all {activeTab === 'preview' ? 'bg-white dark:bg-[#111] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}" onclick={() => activeTab = 'preview'}>Preview</button>
    </div>
  </header>

  <div class="flex-1 flex gap-8 min-h-0">
    
    <!-- Editor Pane -->
    <div class="flex-1 overflow-y-auto custom-scroll pr-4 pb-12 space-y-8 {activeTab === 'editor' ? 'block' : 'hidden lg:block'}">
      
      <!-- Basic Info -->
      <section class="bg-white dark:bg-[#0A0A0A] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><Settings2 size={18} /> Basic Info</h2>
        <div class="space-y-4">
          <div>
            <label for="res-name" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
            <input id="res-name" type="text" class="input-field" value={resume.name} oninput={(e) => updateField('name', e.currentTarget.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label for="res-contact" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Info (Line)</label>
            <input id="res-contact" type="text" class="input-field" value={resume.contactInfo} oninput={(e) => updateField('contactInfo', e.currentTarget.value)} placeholder="San Francisco, CA • jane@doe.com • linkedin.com/in/jane" />
          </div>
          <div>
            <label for="res-summary" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Summary (Optional)</label>
            <textarea id="res-summary" class="input-field min-h-[80px]" value={resume.summary} oninput={(e) => updateField('summary', e.currentTarget.value)} placeholder="Brief professional summary..."></textarea>
          </div>
        </div>
      </section>

      <!-- Experience -->
      <section class="bg-white dark:bg-[#0A0A0A] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">Experience</h2>
          <button class="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3" onclick={addExperience}><Plus size={14} /> Add Role</button>
        </div>
        
        <div class="space-y-6">
          {#each resume.experience as exp, i}
            <div class="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <div class="flex justify-between gap-4 mb-3">
                <input type="text" class="input-field flex-1 font-bold" value={exp.role} oninput={(e) => { const x = structuredClone(resume.experience); x[i].role = e.currentTarget.value; updateField('experience', x); }} placeholder="Role (e.g. Senior Software Engineer)" />
                <button class="text-slate-400 hover:text-red-500 p-2" onclick={() => removeExperience(exp.id)}><Trash2 size={16} /></button>
              </div>
              <div class="flex gap-4 mb-4">
                <input type="text" class="input-field flex-1" value={exp.company} oninput={(e) => { const x = structuredClone(resume.experience); x[i].company = e.currentTarget.value; updateField('experience', x); }} placeholder="Company Name" />
                <input type="text" class="input-field flex-1" value={exp.dateRange} oninput={(e) => { const x = structuredClone(resume.experience); x[i].dateRange = e.currentTarget.value; updateField('experience', x); }} placeholder="Dates (e.g. Jun 2021 - Present)" />
              </div>

              <!-- Bullets -->
              <div class="space-y-2">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Bullet Points</label>
                {#each exp.bullets as bullet, bIdx}
                  <div class="flex items-start gap-2">
                    <div class="mt-2 text-slate-400"><GripVertical size={14} /></div>
                    <textarea class="input-field flex-1 text-sm min-h-[60px]" value={bullet} oninput={(e) => updateExpBullet(exp.id, bIdx, e.currentTarget.value)} placeholder="Spearheaded development of..."></textarea>
                    <button class="mt-2 text-slate-400 hover:text-red-500 p-1" onclick={() => removeExpBullet(exp.id, bIdx)}><Trash2 size={14} /></button>
                  </div>
                {/each}
                <button class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 mt-2 pl-6" onclick={() => addExpBullet(exp.id)}>
                  <Plus size={12} /> Add Bullet
                </button>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Education -->
      <section class="bg-white dark:bg-[#0A0A0A] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">Education</h2>
          <button class="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3" onclick={addEducation}><Plus size={14} /> Add Degree</button>
        </div>

        <div class="space-y-6">
          {#each resume.education as edu, i}
            <div class="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <div class="flex justify-between gap-4 mb-3">
                <input type="text" class="input-field flex-1 font-bold" value={edu.degree} oninput={(e) => { const x = structuredClone(resume.education); x[i].degree = e.currentTarget.value; updateField('education', x); }} placeholder="Degree (e.g. B.S. Computer Science)" />
                <button class="text-slate-400 hover:text-red-500 p-2" onclick={() => removeEducation(edu.id)}><Trash2 size={16} /></button>
              </div>
              <div class="flex gap-4">
                <input type="text" class="input-field flex-1" value={edu.school} oninput={(e) => { const x = structuredClone(resume.education); x[i].school = e.currentTarget.value; updateField('education', x); }} placeholder="School Name" />
                <input type="text" class="input-field flex-[0.5]" value={edu.dateRange} oninput={(e) => { const x = structuredClone(resume.education); x[i].dateRange = e.currentTarget.value; updateField('education', x); }} placeholder="Dates" />
                <input type="text" class="input-field flex-[0.5]" value={edu.gpa} oninput={(e) => { const x = structuredClone(resume.education); x[i].gpa = e.currentTarget.value; updateField('education', x); }} placeholder="GPA (Optional)" />
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Skills -->
      <section class="bg-white dark:bg-[#0A0A0A] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">Skills</h2>
        <textarea class="input-field min-h-[100px]" value={resume.skills} oninput={(e) => updateField('skills', e.currentTarget.value)} placeholder="Languages: Python, JavaScript&#10;Frameworks: React, Svelte, Node.js&#10;Tools: Git, Docker, AWS"></textarea>
      </section>

    </div>

    <!-- Preview Pane (ATS Format) -->
    <div class="flex-1 flex justify-center {activeTab === 'preview' ? 'block' : 'hidden lg:flex'}">
      <div class="bg-white w-full max-w-[800px] h-full overflow-y-auto shadow-2xl rounded-sm border border-slate-200 relative">
        <div class="absolute top-4 right-4 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 opacity-80 pointer-events-none">
          <Sparkles size={12} /> ATS Optimized
        </div>
        
        <!-- Live Rendered Resume -->
        <div class="p-12 text-black font-serif text-[11pt] leading-snug">
          <!-- Header -->
          <div class="text-center border-b-[1.5px] border-black pb-3 mb-4">
            <h1 class="text-2xl font-bold uppercase tracking-wide mb-1">{resume.name || 'YOUR NAME'}</h1>
            <p class="text-[10pt]">{resume.contactInfo || 'City, State • email@example.com • linkedin.com/in/username'}</p>
          </div>

          {#if resume.summary}
            <div class="mb-4">
              <p>{resume.summary}</p>
            </div>
          {/if}

          <!-- Experience -->
          {#if resume.experience.length > 0}
            <div class="mb-4">
              <h2 class="text-[12pt] font-bold uppercase border-b border-black mb-2 pb-0.5">Experience</h2>
              {#each resume.experience as exp}
                <div class="mb-3">
                  <div class="flex justify-between items-baseline font-bold">
                    <span>{exp.role || 'Role Title'}</span>
                    <span class="text-[10pt] font-normal">{exp.dateRange || 'Dates'}</span>
                  </div>
                  <div class="italic text-[10.5pt] mb-1">{exp.company || 'Company Name'}</div>
                  <ul class="list-disc pl-5 m-0 space-y-0.5">
                    {#each exp.bullets as bullet}
                      {#if bullet.trim()}
                        <li class="pl-1">{bullet}</li>
                      {/if}
                    {/each}
                  </ul>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Education -->
          {#if resume.education.length > 0}
            <div class="mb-4">
              <h2 class="text-[12pt] font-bold uppercase border-b border-black mb-2 pb-0.5">Education</h2>
              {#each resume.education as edu}
                <div class="mb-2">
                  <div class="flex justify-between items-baseline font-bold">
                    <span>{edu.school || 'School Name'}</span>
                    <span class="text-[10pt] font-normal">{edu.dateRange || 'Dates'}</span>
                  </div>
                  <div class="flex justify-between items-baseline text-[10.5pt]">
                    <span>{edu.degree || 'Degree'}</span>
                    {#if edu.gpa}<span>GPA: {edu.gpa}</span>{/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Skills -->
          {#if resume.skills}
            <div>
              <h2 class="text-[12pt] font-bold uppercase border-b border-black mb-2 pb-0.5">Skills</h2>
              <div class="whitespace-pre-wrap">{resume.skills}</div>
            </div>
          {/if}
        </div>
      </div>
    </div>

  </div>
</div>
