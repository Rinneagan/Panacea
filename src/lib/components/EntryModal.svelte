<script lang="ts">
  import { onMount } from 'svelte';
  import { appData, saveUserData } from '$lib/stores';
  import type { JobApplication, CollegeApplication, BaseApplication, VaultStory } from '$lib/types';
  import { Wand2, Mail, Mic, FileSearch, Check, X, Sparkles, Activity, FilePenLine, Target, FileText, CheckCircle } from 'lucide-svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import confetti from 'canvas-confetti';
  import 'quill/dist/quill.snow.css';

  let { isOpen = $bindable(false), type = $bindable('job'), editId = $bindable(null), degreeType = $bindable('Undergrad') } = $props<{ isOpen?: boolean; type?: 'job' | 'college'; editId?: string | null; degreeType?: 'Undergrad' | 'PhD' }>();

  let entry = $state<Partial<JobApplication & CollegeApplication>>({});
  let editorNode = $state<HTMLElement>();
  let quill: any;
  
  // Power Tools State
  let schoolSuggestions = $state<{name: string, web_pages: string[]}[]>([]);
  let isSearchingSchools = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let wordCount = $state(0);
  
  // Program Autocomplete State
  let programSuggestions = $state<string[]>([]);
  const UNIVERSAL_PROGRAMS = [
    "B.S. Computer Science", "B.A. Computer Science", "B.S. Engineering", "B.S. Mechanical Engineering", "B.S. Electrical Engineering", "B.S. Civil Engineering", "B.S. Chemical Engineering", "B.S. Aerospace Engineering", "B.S. Biomedical Engineering",
    "B.A. Economics", "B.S. Economics", "B.A. Business Administration", "B.S. Business Administration", "B.S. Finance", "B.S. Accounting", "B.A. Marketing",
    "B.S. Biology", "B.S. Chemistry", "B.S. Physics", "B.S. Mathematics", "B.A. Mathematics", "B.A. Psychology", "B.S. Psychology", "B.A. Sociology", "B.A. Political Science", "B.A. International Relations", "B.A. History", "B.A. English", "B.A. Philosophy", "B.A. Fine Arts",
    "M.S. Computer Science", "M.S. Data Science", "Master of Business Administration (MBA)", "M.S. Engineering", "M.A. Economics", "M.A. Psychology",
    "Ph.D. Computer Science", "Ph.D. Physics", "Ph.D. Mathematics", "Ph.D. Biology", "Ph.D. Chemistry", "Ph.D. Economics", "Ph.D. Psychology", "Ph.D. History", "Ph.D. Engineering",
    "Pre-Med", "Pre-Law", "Undeclared / Exploratory"
  ];
  
  let sidebarTab = $state<'history' | 'browser'>('history');

  let parsedStrategy = $derived.by(() => {
    if (!entry.aiAdvice) return null;
    try {
      if (entry.aiAdvice.trim().startsWith('{')) {
        return JSON.parse(entry.aiAdvice);
      }
    } catch (e) {}
    return {
      category: 'Strategic Analysis',
      school: entry.school || 'Target Institution',
      program: entry.program || 'Application Program',
      hook: entry.aiAdvice,
      essayFocus: 'Focus your supplemental essay on specific courses, faculty, and research labs unique to this institution.',
      actionChecklist: [
        'Tailor your personal statement for institutional fit',
        'Review application deadlines and financial aid requirements',
        'Log key alumni or faculty contacts in your Networking CRM'
      ]
    };
  });

  $effect(() => {
    if (isOpen) {
      if (editId) {
        const list = type === 'job' ? $appData.jobs : $appData.colleges;
        const found = list.find(e => e.id === editId);
        entry = found ? JSON.parse(JSON.stringify(found)) : { status: type === 'job' ? 'Wishlist' : 'Researching' };
      } else {
        entry = type === 'job' 
        ? { id: crypto.randomUUID(), status: 'Wishlist', company: '' }
        : { id: crypto.randomUUID(), status: 'Researching', school: '', degreeType: degreeType || 'Undergrad' };
      }
      
      // Initialize Quill async after modal opens
      setTimeout(async () => {
        if (editorNode && !quill) {
          const QuillModule = await import('quill');
          const Quill = QuillModule.default;
          quill = new Quill(editorNode, {
            theme: 'snow',
            placeholder: 'Paste supplemental prompts, research notes, or interview prep thoughts...',
            modules: {
              toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'blockquote', 'code-block'],
                ['clean']
              ]
            }
          });
          
          quill.on('text-change', () => {
            const text = quill.getText().trim();
            wordCount = text ? text.split(/\s+/).length : 0;
            entry.notes = quill.root.innerHTML;
          });
        }
        
        if (quill && entry.notes) {
          quill.root.innerHTML = entry.notes;
          const text = quill.getText().trim();
          wordCount = text ? text.split(/\s+/).length : 0;
        } else if (quill) {
          quill.root.innerHTML = '';
          wordCount = 0;
        }

        // Auto-run ATS scan if editing a job with existing inputs
        if (type === 'job') scanATS();
      }, 50);
    } else {
      quill = null;
    }
  });

  function handleProgramInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    entry.program = val;
    if (val.trim().length > 0) {
      programSuggestions = UNIVERSAL_PROGRAMS.filter(p => p.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
    } else {
      programSuggestions = [];
    }
  }

  function selectProgram(prog: string) {
    entry.program = prog;
    programSuggestions = [];
  }

  function handleSchoolInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    entry.school = val;
    clearTimeout(searchTimeout);
    
    if (val.trim().length < 2) {
      schoolSuggestions = [];
      isSearchingSchools = false;
      return;
    }
    
    isSearchingSchools = true;
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`https://universities.hipolabs.com/search?name=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter duplicates
          const unique: {name: string, web_pages: string[]}[] = [];
          const names = new Set();
          for (const item of data) {
            if (!names.has(item.name)) {
              names.add(item.name);
              unique.push({ name: item.name, web_pages: item.web_pages });
            }
          }
          schoolSuggestions = unique.slice(0, 6);
        }
      } catch (err) {
        console.error('School search failed', err);
      } finally {
        isSearchingSchools = false;
      }
    }, 300);
  }

  function selectSchool(school: {name: string, web_pages: string[]}) {
    entry.school = school.name;
    if (school.web_pages && school.web_pages.length > 0 && !entry.portalLink) {
      entry.portalLink = school.web_pages[0];
    }
    schoolSuggestions = [];
  }

  // ATS Resume Matcher Logic
  let atsScore = $state(0);
  let missingKeywords = $state<string[]>([]);
  let foundKeywords = $state<string[]>([]);
  let activeTab = $state<'details' | 'ats' | 'supps' | 'advice'>('details');

  function scanATS() {
    const jd = (entry.jobDescription || '').toLowerCase();
    
    let resumeText = '';
    if ($appData.masterResume) {
      resumeText = JSON.stringify($appData.masterResume).toLowerCase();
    } else {
      resumeText = ($appData.globalResume || '').toLowerCase();
    }

    if (!jd || !resumeText) {
      atsScore = 0;
      missingKeywords = [];
      foundKeywords = [];
      return;
    }

    // Extraction of technical & professional keywords
    const commonWords = new Set(['the', 'and', 'to', 'of', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'have', 'new', 'more', 'an', 'was', 'we', 'will', 'can', 'us', 'about', 'if', 'page', 'my', 'has', 'search', 'free', 'but', 'our', 'one', 'other', 'do', 'no', 'information', 'time', 'they', 'site', 'he', 'up', 'may', 'what', 'which', 'their', 'news', 'out', 'use', 'any', 'there', 'see', 'only', 'so', 'his', 'when', 'contact', 'here', 'business', 'who', 'web', 'also', 'now', 'help', 'get', 'pm', 'view', 'online', 'first', 'am', 'been', 'would', 'how', 'were', 'me', 'services', 'some', 'these', 'click', 'its', 'like', 'service', 'than', 'find', 'price', 'date', 'back', 'top', 'people', 'had', 'should', 'well', 'am', 'into', 'just', 'over', 'state', 'design', 'only', 'year', 'two', 'sub', 'job', 'team', 'work', 'work', 'work', 'work']);
    
    const words = jd.match(/\b[a-zA-Z]{3,}\b/g) || [];
    const freq: Record<string, number> = {};
    
    words.forEach(w => {
      const lower = w.toLowerCase();
      if (!commonWords.has(lower)) {
        freq[lower] = (freq[lower] || 0) + 1;
      }
    });

    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(entry => entry[0]);

    const found: string[] = [];
    const missing: string[] = [];

    sorted.forEach(kw => {
      if (resumeText.includes(kw)) {
        found.push(kw);
      } else {
        missing.push(kw);
      }
    });

    foundKeywords = found;
    missingKeywords = missing;
    atsScore = sorted.length > 0 ? Math.round((found.length / sorted.length) * 100) : 0;
  }

  // AI Power Tool Generators
  function generateColdEmail() {
    if (!entry.company) {
      alert("Please enter a Company name first!");
      return;
    }
    const company = entry.company;
    const role = entry.role || 'Software Engineer';
    const email = `
    <h3><strong>AI Networking Cold Email Draft</strong></h3>
    <p><strong>Subject:</strong> Quick question regarding ${role} opportunities at ${company}</p>
    <p>Hi [Name],</p>
    <p>I noticed your work at ${company} and was really impressed by your team's recent initiatives. I'm a student passionate about building in this space and am currently applying for the ${role} position.</p>
    <p>I would love to learn more about your experience at ${company}. Would you be open to a quick 10-minute coffee chat sometime this week?</p>
    <p>Best regards,<br>[Your Name]</p>
    <p><br></p>`;

    if (quill) {
      let currentHTML = quill.root.innerHTML;
      quill.clipboard.dangerouslyPasteHTML(email + currentHTML);
      entry.notes = quill.root.innerHTML;
      
      const text = quill.getText().trim();
      wordCount = text ? text.split(/\s+/).length : 0;
    }
  }

  function generateInterviewPrep() {
    const role = (entry.role || '').toLowerCase();
    const company = entry.company || 'the company';
    
    let prep = `<h3><strong>Interview Prep: ${entry.role || 'General Role'} at ${company}</strong></h3>`;
    
    if (role.includes('software') || role.includes('engineer') || role.includes('developer')) {
      prep += `
      <h4><strong>Technical Focus Areas:</strong></h4>
      <ul>
        <li>Data Structures & Algorithms (Arrays, HashMaps, Trees, Graphs)</li>
        <li>System Design (Scalability, Databases, APIs)</li>
        <li>Language-specific trivia (JavaScript, Python, Java, C++, etc.)</li>
      </ul>
      <h4><strong>Common Questions:</strong></h4>
      <ol>
        <li>Walk me through a complex system you designed. What were the trade-offs?</li>
        <li>How do you handle disagreements on technical approaches with teammates?</li>
        <li>Explain [concept] as if I were a non-technical stakeholder.</li>
      </ol>
      `;
    } else if (role.includes('product') || role.includes('pm')) {
      prep += `
      <h4><strong>Product Focus Areas:</strong></h4>
      <ul>
        <li>Product Sense & Design (User empathy, identifying pain points)</li>
        <li>Execution & Metrics (A/B testing, success metrics, trade-offs)</li>
        <li>Strategy & Roadmapping</li>
      </ul>
      <h4><strong>Common Questions:</strong></h4>
      <ol>
        <li>Design a product for [Target Audience] to solve [Problem].</li>
        <li>What is your favorite product and how would you improve it?</li>
        <li>You noticed a 10% drop in a key metric. How do you investigate?</li>
      </ol>
      `;
    } else {
      prep += `
      <h4><strong>General Behavioral (STAR Method):</strong></h4>
      <ul>
        <li><strong>Situation:</strong> Set the scene and give necessary context.</li>
        <li><strong>Task:</strong> Describe your specific responsibility in that situation.</li>
        <li><strong>Action:</strong> Explain exactly what steps you took.</li>
        <li><strong>Result:</strong> Share the outcomes, quantifying if possible.</li>
      </ul>
      <h4><strong>Common Questions:</strong></h4>
      <ol>
        <li>Tell me about yourself and your background.</li>
        <li>Why do you want to work at ${company}?</li>
        <li>Tell me about a time you overcame a significant challenge.</li>
      </ol>
      `;
    }
    
    prep += `<p><br></p>`;
    
    if (quill) {
      let currentHTML = quill.root.innerHTML;
      currentHTML = currentHTML.replace(/<h3><strong>Interview Prep:[\s\S]*?<\/ol><p><br><\/p>/gi, '');
      quill.clipboard.dangerouslyPasteHTML(prep + currentHTML);
      entry.notes = quill.root.innerHTML;
      
      const text = quill.getText().trim();
      wordCount = text ? text.split(/\s+/).length : 0;
    }
  }

  let isGenerating = $state(false);

  async function simulateAIGeneration(content: string) {
    if (isGenerating) return;
    isGenerating = true;
    await new Promise(r => setTimeout(r, 1000));
    
    if (quill) {
      let currentHTML = quill.root.innerHTML;
      quill.clipboard.dangerouslyPasteHTML(content + currentHTML);
      entry.notes = quill.root.innerHTML;
      
      const text = quill.getText().trim();
      wordCount = text ? text.split(/\s+/).length : 0;
    }
    isGenerating = false;
  }

  async function generateAutoAnswer() {
    const stories = $appData.vaultStories || [];
    if (stories.length === 0) {
      alert("Your Essay Vault is empty! Please add a Core Story in the Essay Vault first.");
      return;
    }
    const story = stories[0];
    const html = `
      <div style="background: rgba(99, 102, 241, 0.1); padding: 16px; border-left: 4px solid #6366f1; margin-bottom: 16px;">
        <h4 style="color: #4f46e5; margin-bottom: 8px;"><strong>✨ AI Auto-Answer generated from Vault Story: "${story.title}"</strong></h4>
        <p>I recall a specific instance that deeply tested my resilience and problem-solving skills, which mirrors the core values of ${entry.company || entry.school || 'your organization'}. When faced with a critical obstacle, I immediately took ownership, reorganized the team's priorities, and executed a revised strategy. The result was a 40% improvement in efficiency and a lasting framework that our team still uses today.</p>
      </div><p><br></p>`;
    await simulateAIGeneration(html);
  }

  async function generateWhyUs() {
    const org = entry.company || entry.school || 'this organization';
    const html = `
      <div style="background: rgba(16, 185, 129, 0.1); padding: 16px; border-left: 4px solid #10b981; margin-bottom: 16px;">
        <h4 style="color: #059669; margin-bottom: 8px;"><strong>✨ AI "Why Us" Draft for ${org}</strong></h4>
        <p>I have been closely following ${org}'s recent strategic initiatives and core values. My background in rapid execution and analytical problem solving aligns perfectly with your growth trajectory. I am eager to bring my specific expertise to the team and help drive this mission forward.</p>
      </div><p><br></p>`;
    await simulateAIGeneration(html);
  }

  async function analyzeHealth() {
    let score = Math.floor(Math.random() * 20) + 70;
    let weakPoints = '';

    if (type === 'job') {
      scanATS();
      if (atsScore > 0) score = atsScore;
      if (missingKeywords.length > 0) {
        weakPoints += `<li>Your resume is missing key ATS words: <strong>${missingKeywords.slice(0, 5).join(', ')}</strong>.</li>`;
      } else if (atsScore === 0) {
        weakPoints += `<li>No Job Description provided to scan for ATS keywords.</li>`;
      }
      if (!entry.networkingNotes) {
        weakPoints += `<li>You haven't logged any networking contacts or referrals for ${entry.company || 'this company'}.</li>`;
      }
    } else {
      const missingDocs = [];
      if (!entry.statementOfPurpose) missingDocs.push('Statement of Purpose');
      if (!entry.lor1) missingDocs.push('Letter of Rec 1');
      if (!entry.lor2) missingDocs.push('Letter of Rec 2');
      if (entry.degreeType === 'PhD' && !entry.lor3) missingDocs.push('Letter of Rec 3');
      
      if (missingDocs.length > 0) {
        score -= missingDocs.length * 10;
        weakPoints += `<li>Missing core materials: <strong>${missingDocs.join(', ')}</strong>.</li>`;
      }
      if (!entry.networkingNotes) {
        weakPoints += `<li>No alumni or faculty networking logged for ${entry.school || 'this school'}.</li>`;
      }
    }

    if (!weakPoints) weakPoints = "<li>None! Your application looks exceptionally strong.</li>";

    const html = `
      <div style="background: rgba(245, 158, 11, 0.1); padding: 16px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
        <h4 style="color: #d97706; margin-bottom: 8px;"><strong>🏥 Application Health Score: ${score}/100</strong></h4>
        <p><strong>Likelihood of Success:</strong> ${score >= 80 ? 'High' : score >= 60 ? 'Moderate' : 'Needs Optimization'}</p>
        <p><strong>Weak Points Identified:</strong></p>
        <ul>
          ${weakPoints}
        </ul>
      </div><p><br></p>`;
    await simulateAIGeneration(html);
  }

  async function calculateCollegeStrategy() {
    if (isGenerating) return;
    isGenerating = true;
    await new Promise(r => setTimeout(r, 1000));

    const school = entry.school || 'Target University';
    const program = entry.program || 'Intended Program';
    const degree = entry.degreeType || 'Undergrad';

    const isIvyPlus = /Stanford|MIT|Harvard|Yale|Princeton|Columbia|Penn|Brown|Dartmouth|Cornell|Chicago|Duke|Caltech/i.test(school);
    const isTop20 = isIvyPlus || /Vanderbilt|Rice|WashU|USC|Northwestern|Johns Hopkins|Georgetown|Emory|Carnegie Mellon|UCLA|UC Berkeley/i.test(school);

    const category = isIvyPlus ? 'Reach (< 8% Acceptance)' : isTop20 ? 'Target / Reach (10-18%)' : 'Balanced Match (20-40%)';
    
    const strategyObj = {
      category,
      school,
      program,
      hook: degree === 'PhD' 
        ? `Frame your research narrative around interdisciplinary technical depth in ${program}. Highlight past research milestones and direct methodology fit with ${school}'s active faculty labs.` 
        : `Position your candidacy around intellectual vitality in ${program}. Connect your extracurricular leadership directly to ${school}'s unique undergraduate research and interdisciplinary honors programs.`,
      essayFocus: degree === 'PhD'
        ? `In your Statement of Purpose, explicitly cite 2-3 faculty members at ${school} whose recent grants and publications align with your proposed research direction.`
        : `In your 'Why ${school}' essay, avoid generic campus descriptions. Detail 2 specific upper-level seminars, faculty labs, and campus initiatives that align with your goals.`,
      actionChecklist: [
        `Align recommendation letters to emphasize analytical independence in ${program}`,
        degree === 'PhD' ? `Reach out to target Lab PIs at ${school} to inquire about funding` : `Draft supplemental essays early highlighting institutional fit`,
        `Log alumni or current student contacts in your Panacea Networking CRM`
      ]
    };

    entry.aiAdvice = JSON.stringify(strategyObj);
    isGenerating = false;
    // Not persisted here: `entry` is a local copy. It's written to $appData and saved on "Save Application".
  }

  async function autoTailorResume() {
    if (!entry.jobDescription || !$appData.masterResume) {
      alert("Please ensure you have built your Master Resume in the Resume Studio, and pasted a Job Description below.");
      return;
    }
    isGenerating = true;
    await new Promise(r => setTimeout(r, 1500));
    
    const tailored = JSON.parse(JSON.stringify($appData.masterResume));
    if (missingKeywords.length > 0) {
      if (tailored.skills) {
        tailored.skills += '\\nOptimized Skills: ' + missingKeywords.slice(0, 5).join(', ');
      } else {
        tailored.skills = 'Optimized Skills: ' + missingKeywords.slice(0, 5).join(', ');
      }
      if (tailored.experience.length > 0 && tailored.experience[0].bullets.length > 0) {
        tailored.experience[0].bullets[0] = `Leveraged ${missingKeywords[0] || 'core technologies'} to optimize workflows, increasing efficiency by 30%.`;
      }
    }
    
    entry.tailoredResume = tailored;
    isGenerating = false;
  }

  function save() {
    entry.updatedAt = Date.now();
    if (!entry.createdAt) entry.createdAt = Date.now();

    let triggerConfetti = false;

    if (type === 'job') {
      const idx = $appData.jobs.findIndex(j => j.id === entry.id);
      if (idx >= 0) {
        if ($appData.jobs[idx].status !== entry.status) {
          entry.history = [...(entry.history || []), { status: entry.status || '', date: Date.now() }];
          if (entry.status === 'Offer') triggerConfetti = true;
        }
        $appData.jobs[idx] = entry as JobApplication;
      } else {
        entry.history = [{ status: entry.status || '', date: Date.now() }];
        if (entry.status === 'Offer') triggerConfetti = true;
        $appData.jobs.push(entry as JobApplication);
      }
    } else {
      const idx = $appData.colleges.findIndex(c => c.id === entry.id);
      if (idx >= 0) {
        if ($appData.colleges[idx].status !== entry.status) {
          entry.history = [...(entry.history || []), { status: entry.status || '', date: Date.now() }];
          if (entry.status === 'Accepted' || entry.status === 'Enrolled') triggerConfetti = true;
        }
        $appData.colleges[idx] = entry as CollegeApplication;
      } else {
        entry.history = [{ status: entry.status || '', date: Date.now() }];
        if (entry.status === 'Accepted' || entry.status === 'Enrolled') triggerConfetti = true;
        $appData.colleges.push(entry as CollegeApplication);
      }
    }
    saveUserData();
    
    if (triggerConfetti) {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6']
      });
    }

    isOpen = false;
  }
  
  function close() {
    isOpen = false;
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md sm:p-6" transition:fade={{ duration: 200 }} onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="w-full h-[95vh] sm:h-auto sm:max-h-[90vh] max-w-5xl flex flex-col bg-white dark:bg-[#111] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10" in:fly={{ y: 50, duration: 400, easing: backOut }} out:scale={{ start: 0.95, duration: 200 }}>
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-extrabold text-black dark:text-white tracking-tight">{editId ? 'Edit' : 'New'} {type === 'job' ? 'Job' : 'College'} Application</h2>
          {#if editId && (entry.company || entry.school)}
            <a href="https://mail.google.com/mail/u/0/#search/{encodeURIComponent(entry.company || entry.school || '')}" target="_blank" rel="noopener" class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 transition-colors" title="Find related emails">
              <Mail size={14} /> Search Gmail
            </a>
          {/if}
        </div>
        <button class="p-2 text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all" onclick={close} title="Close">
          <svg viewBox="0 0 16 16" fill="none" class="w-5 h-5"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      
      <!-- Body Grid -->
      <div class="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
        
        <!-- Left: Form Inputs -->
        <div class="md:col-span-2 overflow-y-auto custom-scroll p-6 pb-24">
          {#if type === 'job'}
            <div class="flex items-center gap-6 mb-6 border-b border-slate-200 dark:border-white/10 pb-2">
              <button class="text-sm font-bold tracking-tight transition-colors {activeTab === 'details' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-[3px] pb-2' : 'text-slate-500 hover:text-black dark:hover:text-white pb-2'}" onclick={() => activeTab = 'details'}>Application Details</button>
              <button class="text-sm font-bold tracking-tight transition-colors {activeTab === 'ats' ? 'text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400 -mb-[3px] pb-2' : 'text-slate-500 hover:text-black dark:hover:text-white pb-2'}" onclick={() => activeTab = 'ats'}>ATS Resume Matcher</button>
            </div>
          {:else}
            <div class="flex items-center gap-6 mb-6 border-b border-slate-200 dark:border-white/10 pb-2">
              <button class="text-sm font-bold tracking-tight transition-colors {activeTab === 'details' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-[3px] pb-2' : 'text-slate-500 hover:text-black dark:hover:text-white pb-2'}" onclick={() => activeTab = 'details'}>Application Details</button>
              <button class="text-sm font-bold tracking-tight transition-colors {activeTab === 'supps' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 -mb-[3px] pb-2' : 'text-slate-500 hover:text-black dark:hover:text-white pb-2'}" onclick={() => activeTab = 'supps'}>Supplemental Essays</button>
              <button class="text-sm font-bold tracking-tight transition-colors {activeTab === 'advice' ? 'text-amber-500 border-b-2 border-amber-500 -mb-[3px] pb-2' : 'text-slate-500 hover:text-black dark:hover:text-white pb-2'}" onclick={() => activeTab = 'advice'}><span class="mr-1">✨</span> Optimize Strategy</button>
            </div>
          {/if}

          {#if activeTab === 'details'}
            <div class="form-grid">
            {#if type === 'job'}
              <div class="form-field full flex flex-wrap gap-2">
                <button type="button" onclick={generateAutoAnswer} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20">
                  {#if isGenerating}<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{:else}<Sparkles size={14} />{/if}
                  Vault Auto-Answer
                </button>
                <button type="button" onclick={generateWhyUs} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20">
                  <FilePenLine size={14} /> Why Us?
                </button>
                <button type="button" onclick={analyzeHealth} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-500/20">
                  <Activity size={14} /> Health Score
                </button>
                <button type="button" onclick={generateInterviewPrep} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all">
                  <Mic size={14} /> Auto-Prep
                </button>
                <button type="button" onclick={generateColdEmail} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all">
                  <Mail size={14} /> Networking Email
                </button>
              </div>
              <div class="form-field full mt-2">
                <label for="em-company" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Company</label>
                <input id="em-company" class="input-field" type="text" bind:value={entry.company} placeholder="e.g. Acme Corp" />
              </div>
              <div class="form-field">
                <label for="em-role" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Role</label>
                <input id="em-role" class="input-field" type="text" bind:value={entry.role} placeholder="e.g. Software Engineer" />
              </div>
              <div class="form-field">
                <label for="em-location" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Location</label>
                <input id="em-location" class="input-field" type="text" bind:value={entry.location} placeholder="e.g. Remote" />
              </div>
              <div class="form-field full mt-2">
                <div class="flex items-center justify-between mb-1.5 ml-1">
                  <label for="em-networking" class="block text-sm font-bold text-slate-700 dark:text-slate-300">Networking & Contacts</label>
                </div>
                <textarea id="em-networking" bind:value={entry.networkingNotes} placeholder="Track recruiters, alumni referrals, or coffee chats here..." class="input-field min-h-[120px]"></textarea>
              </div>
            {:else}
              <div class="form-field full flex flex-wrap gap-2">
                <button type="button" onclick={generateAutoAnswer} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20">
                  {#if isGenerating}<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{:else}<Sparkles size={14} />{/if}
                  Vault Auto-Answer
                </button>
                <button type="button" onclick={generateWhyUs} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20">
                  <FilePenLine size={14} /> Why Us?
                </button>
                <button type="button" onclick={analyzeHealth} disabled={isGenerating} class="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-500/20">
                  <Activity size={14} /> Health Score
                </button>
              </div>
              <div class="form-field full mt-2">
                <div class="flex bg-slate-100 dark:bg-white/10 p-1 rounded-xl w-full">
                  <button type="button" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all {entry.degreeType === 'Undergrad' || !entry.degreeType ? 'bg-white dark:bg-[#1A1A1A] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-black dark:hover:text-white'}" onclick={() => entry.degreeType = 'Undergrad'}>Undergraduate</button>
                  <button type="button" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all {entry.degreeType === 'PhD' ? 'bg-white dark:bg-[#1A1A1A] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-black dark:hover:text-white'}" onclick={() => entry.degreeType = 'PhD'}>PhD & Grad</button>
                </div>
              </div>
              <div class="form-field full relative">
                <label for="em-school" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">School</label>
                <input id="em-school" class="input-field" type="text" value={entry.school || ''} oninput={handleSchoolInput} placeholder="Start typing to search universities globally..." autocomplete="off" />
                
                {#if isSearchingSchools}
                  <div class="absolute right-4 top-10 w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                {/if}
                
                {#if schoolSuggestions.length > 0}
                  <div class="absolute z-50 w-full mt-2 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden overflow-y-auto max-h-60 custom-scroll">
                    {#each schoolSuggestions as school}
                      <button type="button" class="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors border-b border-slate-100 dark:border-white/5 last:border-0" onclick={() => selectSchool(school)}>
                        {school.name}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              <div class="form-field relative">
                <label for="em-program" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Program / Major</label>
                <input id="em-program" class="input-field" type="text" value={entry.program || ''} oninput={handleProgramInput} placeholder="e.g. Computer Science" autocomplete="off" />
                
                {#if programSuggestions.length > 0}
                  <div class="absolute z-50 w-full mt-2 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden overflow-y-auto max-h-60 custom-scroll">
                    {#each programSuggestions as prog}
                      <button type="button" class="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors border-b border-slate-100 dark:border-white/5 last:border-0" onclick={() => selectProgram(prog)}>
                        {prog}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              <div class="form-field">
                <label for="em-deadlinetype" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Deadline Type</label>
                <select id="em-deadlinetype" class="input-field" bind:value={entry.deadlineType}>
                  <option value="Regular Decision">Regular Decision</option>
                  <option value="Early Action">Early Action</option>
                  <option value="Early Decision">Early Decision</option>
                  <option value="Rolling">Rolling</option>
                </select>
              </div>
            {/if}

            <div class="form-field">
              <label for="em-status" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Status</label>
              <select id="em-status" class="input-field" bind:value={entry.status}>
                {#if type === 'job'}
                  <option>Wishlist</option><option>Applied</option><option>Phone Screen</option><option>Interview</option><option>Offer</option><option>Rejected</option><option>Withdrawn</option>
                {:else}
                  <option>Researching</option><option>In Progress</option><option>Submitted</option><option>Interview</option><option>Accepted</option><option>Rejected</option><option>Waitlisted</option><option>Deferred</option><option>Enrolled</option>
                {/if}
              </select>
            </div>
            <div class="form-field">
              <label for="em-deadline" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Deadline</label>
              <input id="em-deadline" class="input-field" type="date" bind:value={entry.deadline} />
            </div>
            <div class="form-field full">
              <label for="em-link" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Link ({type === 'job' ? 'Job Posting' : 'Portal'})</label>
              <input id="em-link" class="input-field break-all" type="url" bind:value={entry.portalLink} placeholder="https://..." />
            </div>

            {#if type === 'college'}
              <div class="form-field full mt-2 bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between items-center">
                  <span>Application Dependencies</span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-lg">{entry.degreeType || 'Undergrad'}</span>
                </h4>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Core Materials</p>
                    <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="checkbox" bind:checked={entry.statementOfPurpose} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                      <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Statement of Purpose</span>
                    </label>
                    <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="checkbox" bind:checked={entry.resume} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                      <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Resume / CV</span>
                    </label>
                    
                    {#if entry.degreeType === 'PhD'}
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.researchProposal} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Research Proposal</span>
                      </label>
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.publications} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Publications / Portfolio</span>
                      </label>
                    {:else}
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.caActivities} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">CA Activities List</span>
                      </label>
                    {/if}
                  </div>
                  
                  <div>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Letters of Rec</p>
                    <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="checkbox" bind:checked={entry.lor1} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                      <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Recommender 1</span>
                    </label>
                    <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="checkbox" bind:checked={entry.lor2} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                      <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Recommender 2</span>
                    </label>
                  </div>
                </div>
              </div>
            {/if}

            <div class="form-field full editor-container mt-6 relative">
              <div class="flex items-center justify-between mb-1.5 ml-1">
                <label for="em-notes" class="block text-sm font-bold text-slate-700 dark:text-slate-300">Notes, Essays & Scratchpad</label>
                <div class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                  {wordCount} words
                </div>
              </div>
              <div id="em-notes" bind:this={editorNode} class="min-h-[300px] bg-white dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-white/10"></div>
            </div>
            </div>
          {:else if activeTab === 'ats'}
            <!-- ATS Matcher View -->
            <div class="flex flex-col gap-6 fade-in">
              <div class="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
                <div class="w-10 h-10 shrink-0 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                  <FileSearch size={20} />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-indigo-900 dark:text-indigo-300">How it works</h3>
                  <p class="text-xs font-medium text-indigo-700/80 dark:text-indigo-400 mt-1 leading-relaxed">Paste the full Job Description below. Panacea will extract the most frequent keywords and cross-reference them against your Master Resume to generate an ATS Match Score.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Inputs & Auto-Tailor -->
                <div class="flex flex-col gap-4">
                  <div>
                    <label for="ats-jd" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Job Description</label>
                    <textarea id="ats-jd" bind:value={entry.jobDescription} oninput={scanATS} placeholder="Paste the full job posting here..." class="input-field min-h-[150px] custom-scroll text-xs"></textarea>
                  </div>
                  
                  <div class="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 mt-2">
                    <h4 class="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2"><Sparkles size={16} /> Auto-Tailor Engine</h4>
                    <button type="button" class="w-full btn-primary flex items-center justify-center gap-2 text-sm" onclick={autoTailorResume} disabled={isGenerating || !entry.jobDescription || !$appData.masterResume}>
                      {#if isGenerating}
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Tailoring Resume...
                      {:else}
                        Generate Tailored Resume
                      {/if}
                    </button>
                  </div>
                </div>

                <!-- Results -->
                <div class="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col relative overflow-hidden">
                  <div class="text-center mb-6 mt-2">
                    <p class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">ATS Match Score</p>
                    <div class="text-6xl font-extrabold {atsScore >= 75 ? 'text-emerald-500' : atsScore >= 50 ? 'text-amber-500' : 'text-rose-500'}">{atsScore}%</div>
                  </div>
                </div>
              </div>
            </div>
          {:else if activeTab === 'supps'}
            <div class="flex flex-col gap-6 fade-in">
              <div class="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4">
                <div class="w-10 h-10 shrink-0 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <FilePenLine size={20} />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-emerald-900 dark:text-emerald-300">Supplemental Writing Prompts</h3>
                  <p class="text-xs font-medium text-emerald-700/80 dark:text-emerald-400 mt-1 leading-relaxed">Track and draft your institution-specific supplemental essay responses.</p>
                </div>
              </div>
            </div>
          {:else if activeTab === 'advice'}
            <!-- AI Strategy Engine View -->
            <div class="flex flex-col gap-6 fade-in">
              <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-3xl p-6 relative overflow-hidden">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-xl font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <Sparkles size={20} class="text-amber-500" /> Optimize Strategy Engine
                  </h3>
                  {#if parsedStrategy?.category}
                    <span class="text-xs font-bold px-3 py-1 bg-amber-500 text-white rounded-full shadow-sm">
                      {parsedStrategy.category}
                    </span>
                  {/if}
                </div>
                
                {#if parsedStrategy}
                  <div class="space-y-4">
                    <!-- Hook Strategy -->
                    <div class="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-200/50 dark:border-amber-500/20">
                      <h4 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Target size={14} /> Application Pitch & Narrative Hook
                      </h4>
                      <p class="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                        {parsedStrategy.hook}
                      </p>
                    </div>

                    <!-- Essay Guidance -->
                    <div class="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-200/50 dark:border-amber-500/20">
                      <h4 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <FileText size={14} /> Essay Angle & Institutional Alignment
                      </h4>
                      <p class="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                        {parsedStrategy.essayFocus}
                      </p>
                    </div>

                    <!-- Action Items -->
                    {#if parsedStrategy.actionChecklist && parsedStrategy.actionChecklist.length > 0}
                      <div class="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-200/50 dark:border-amber-500/20">
                        <h4 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <CheckCircle size={14} /> Key Action Items
                        </h4>
                        <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                          {#each parsedStrategy.actionChecklist as item}
                            <li class="flex items-start gap-2">
                              <span class="text-amber-500 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-amber-200/50 dark:border-amber-500/20 text-center">
                    <p class="text-xs font-medium text-amber-900/60 dark:text-amber-200/60 italic leading-relaxed">
                      No strategic blueprint generated for {entry.school || 'this school'} yet. Click "Calculate Strategy Blueprint" below to run the AI analysis engine.
                    </p>
                  </div>
                {/if}
                
                <button 
                  type="button" 
                  class="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm" 
                  onclick={calculateCollegeStrategy}
                  disabled={isGenerating}
                >
                  {#if isGenerating}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Running AI Strategy Engine...
                  {:else}
                    <Sparkles size={16} /> Re-Calculate Strategy Blueprint
                  {/if}
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Right: Inspector Sidebar -->
        <div class="md:col-span-1 bg-slate-50 dark:bg-white/5 border-l border-slate-200 dark:border-white/10 p-6 overflow-y-auto custom-scroll flex flex-col">
          <div class="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-2">
            <button class="text-xs font-bold uppercase tracking-widest transition-colors {sidebarTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-[3px] pb-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pb-2'}" onclick={() => sidebarTab = 'history'}>History</button>
          </div>

          {#if sidebarTab === 'history'}
            <div class="relative pl-4 border-l-2 border-slate-200 dark:border-white/10 ml-2 space-y-6">
              {#if entry.history && entry.history.length > 0}
                {#each [...entry.history].reverse() as item}
                  <div class="relative">
                    <div class="absolute -left-[23px] top-1 w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-slate-50 dark:ring-[#1a1a1a]"></div>
                    <p class="text-sm font-bold text-black dark:text-white">{item.status}</p>
                    <p class="text-xs font-medium text-slate-500">{new Date(item.date).toLocaleString()}</p>
                  </div>
                {/each}
              {:else}
                <p class="text-xs text-slate-400">No status changes recorded yet.</p>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-white/5">
        <button class="btn-secondary text-sm" onclick={close}>Cancel</button>
        <button class="btn-primary text-sm" onclick={save}>Save Application</button>
      </div>
    </div>
  </div>
{/if}
