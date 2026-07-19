<script lang="ts">
  import { onMount } from 'svelte';
  import { appData, saveUserData } from '$lib/stores';
  import type { JobApplication, CollegeApplication, BaseApplication, VaultStory } from '$lib/types';
  import { Wand2, Mail, Mic, FileSearch, Check, X, Sparkles, Activity, FilePenLine } from 'lucide-svelte';
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
      
      if (quill) {
        quill.root.innerHTML = entry.notes || '';
      }
    }
  });

  onMount(async () => {
    if (editorNode) {
      const { default: Quill } = await import('quill');
      quill = new Quill(editorNode, {
        theme: 'snow',
        placeholder: 'Add any notes, essay drafts, or scratchpad content here...',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'header': [1, 2, 3, false] }],
            ['link', 'clean']
          ]
        }
      });
      quill.on('text-change', () => {
        entry.notes = quill.root.innerHTML;
        const text = quill.getText().trim();
        wordCount = text ? text.split(/\s+/).length : 0;
      });
      // Initial word count
      const text = quill.getText().trim();
      wordCount = text ? text.split(/\s+/).length : 0;
    }
  });

  function handleSchoolInput(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    entry.school = q;
    if (!q || q.length < 3) {
      schoolSuggestions = [];
      return;
    }
    isSearchingSchools = true;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`http://universities.hipolabs.com/search?country=United+States&name=${encodeURIComponent(q)}`);
        let data = await res.json();
        
        const intlSchools = [
          { name: 'University of Oxford', web_pages: ['http://www.ox.ac.uk/'] },
          { name: 'University of Cambridge', web_pages: ['http://www.cam.ac.uk/'] },
          { name: 'ETH Zurich', web_pages: ['https://ethz.ch/'] },
          { name: 'Max Planck Institute', web_pages: ['https://www.mpg.de/'] },
          { name: 'University of Toronto', web_pages: ['https://www.utoronto.ca/'] }
        ];
        const extra = intlSchools.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
        
        // Remove duplicates by name
        const combined = [...data, ...extra];
        const unique = Array.from(new Map(combined.map(item => [item.name, item])).values());
        
        schoolSuggestions = unique.slice(0, 8);
      } catch (e) {
        console.error(e);
      } finally {
        isSearchingSchools = false;
      }
    }, 300);
  }

  function selectSchool(school: any) {
    entry.school = school.name;
    if (!entry.portalLink && school.web_pages && school.web_pages.length > 0) {
      entry.portalLink = school.web_pages[0];
    }
    schoolSuggestions = [];
    
    // Auto-fetch essays immediately
    const s = school.name.toLowerCase();
    let prompts = `<h3><strong>General Prompts for ${school.name}</strong></h3><ul><li>Why are you interested in attending ${school.name}? (250 words)</li><li>Please briefly elaborate on one of your extracurricular activities or work experiences. (150 words)</li></ul><p><br></p>`;
    
    if (s.includes('stanford')) {
      prompts = `<h3><strong>Stanford Supplemental Essays</strong></h3><ul><li>What is the most significant challenge that society faces today? (50 words)</li><li>Write a note to your future roommate that reveals something about you or that will help your roommate - and us - get to know you better. (250 words)</li><li>Tell us about something that is meaningful to you and why. (250 words)</li></ul><p><br></p>`;
    } else if (s.includes('yale')) {
      prompts = `<h3><strong>Yale Supplemental Essays</strong></h3><ul><li>What is it about Yale that has led you to apply? (125 words)</li><li>Reflect on a time you discussed an issue with someone holding an opposing view. (400 words)</li></ul><p><br></p>`;
    } else if (s.includes('uchicago') || s.includes('chicago')) {
      prompts = `<h3><strong>UChicago Supplemental Essays</strong></h3><ul><li>How does the University of Chicago satisfy your desire for a particular kind of learning? (250 words)</li><li>Find x. (500 words)</li></ul><p><br></p>`;
    } else if (s.includes('mit') || s.includes('massachusetts institute of technology')) {
      prompts = `<h3><strong>MIT Supplemental Essays</strong></h3><ul><li>Describe the world you come from; for example, your family, clubs, school, community, city, or town. (250 words)</li><li>Tell us about the most significant challenge you've faced or something important that didn't go according to plan. (250 words)</li></ul><p><br></p>`;
    }
    
    if (quill) {
      let currentHTML = quill.root.innerHTML;
      
      // Clean up previously injected prompts so they don't stack
      currentHTML = currentHTML.replace(/<p><br><\/p><h3><strong>(?:General Prompts for|.*?Supplemental Essays)[\s\S]*?<\/strong><\/h3><ul>[\s\S]*?<\/ul><p><br><\/p>/gi, '');
      currentHTML = currentHTML.replace(/<h3><strong>(?:General Prompts for|.*?Supplemental Essays)[\s\S]*?<\/strong><\/h3><ul>[\s\S]*?<\/ul>/gi, '');
      
      quill.clipboard.dangerouslyPasteHTML(prompts + currentHTML);
      entry.notes = quill.root.innerHTML;
      
      // Update word count
      const text = quill.getText().trim();
      wordCount = text ? text.split(/\s+/).length : 0;
    }
  }

  function handleProgramInput(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    entry.program = q;
    if (!q) {
      programSuggestions = [];
      return;
    }
    const lower = q.toLowerCase();
    programSuggestions = UNIVERSAL_PROGRAMS.filter(p => p.toLowerCase().includes(lower)).slice(0, 8);
  }

  function selectProgram(prog: string) {
    entry.program = prog;
    programSuggestions = [];
  }

  let activeTab = $state<'details' | 'ats' | 'supps' | 'advice'>('details');

  // ATS Logic
  let atsScore = $state(0);
  let missingKeywords = $state<string[]>([]);
  let foundKeywords = $state<string[]>([]);

  function scanATS() {
    if (!entry.jobDescription) return;
    
    let resumeText = $appData.globalResume || '';
    if ($appData.masterResume) {
      resumeText += ' ' + $appData.masterResume.skills;
      for (const e of $appData.masterResume.experience) {
        resumeText += ' ' + e.bullets.join(' ');
      }
    }
    if (!resumeText) return;

    const stopWords = new Set(['about', 'after', 'again', 'against', 'because', 'before', 'being', 'below', 'between', 'cannot', 'could', 'doing', 'down', 'during', 'each', 'further', 'having', 'here', 'herself', 'himself', 'into', 'itself', 'more', 'most', 'myself', 'once', 'only', 'other', 'ought', 'ourselves', 'over', 'same', 'should', 'some', 'such', 'than', 'that', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'until', 'very', 'what', 'when', 'where', 'which', 'while', 'whom', 'with', 'would', 'your', 'yours', 'yourself', 'yourselves', 'experience', 'years', 'working', 'team', 'skills', 'ability', 'will', 'have', 'must', 'work', 'with']);
    
    const jdWords = entry.jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const resumeWords = resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    
    const jdFreq = new Map<string, number>();
    for (const w of jdWords) {
      if (!stopWords.has(w)) jdFreq.set(w, (jdFreq.get(w) || 0) + 1);
    }
    
    const sortedKeywords = Array.from(jdFreq.entries()).sort((a,b) => b[1] - a[1]).slice(0, 15).map(e => e[0]);
    const resumeSet = new Set(resumeWords);
    
    foundKeywords = sortedKeywords.filter(k => resumeSet.has(k));
    missingKeywords = sortedKeywords.filter(k => !resumeSet.has(k));
    
    atsScore = sortedKeywords.length ? Math.round((foundKeywords.length / sortedKeywords.length) * 100) : 0;
  }
  
  $effect(() => {
    if (activeTab === 'ats') {
      scanATS();
    }
  });

  function generateColdEmail() {
    const company = entry.company || '[Company Name]';
    const role = entry.role || '[Role Name]';
    
    const email = `Subject: Quick question about the ${role} role at ${company}\n\nHi [Name],\n\nI hope this email finds you well!\n\nI'm reaching out because I recently applied for the ${role} position at ${company}. I've been following the team's recent work and would love to learn more about your experience there.\n\nDo you have 10 minutes next week for a quick virtual coffee chat? I'd love to hear your perspective on the culture.\n\nBest,\n[Your Name]`;
    
    entry.networkingNotes = (entry.networkingNotes ? entry.networkingNotes + '\n\n---\n\n' : '') + email;
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
    } else if (role.includes('consulting') || role.includes('strategy') || role.includes('analyst')) {
      prep += `
      <h4><strong>Consulting Focus Areas:</strong></h4>
      <ul>
        <li>Case Studies (Profitability, Market Entry, M&A)</li>
        <li>Market Sizing (Guesstimates)</li>
        <li>Data Analysis & Synthesis</li>
      </ul>
      <h4><strong>Common Questions:</strong></h4>
      <ol>
        <li>Walk me through your framework for assessing a new market entry.</li>
        <li>How many ping pong balls fit in a Boeing 747?</li>
        <li>Tell me about a time you had to persuade a difficult client or stakeholder.</li>
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
        <li>Describe a situation where you failed. What did you learn?</li>
      </ol>
      `;
    }
    
    prep += `<p><br></p>`;
    
    if (quill) {
      let currentHTML = quill.root.innerHTML;
      // Prevent stacking if clicked multiple times
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
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1200));
    
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
        <p>I recall a specific instance that deeply tested my resilience and problem-solving skills, which mirrors the core values of ${entry.company || entry.school || 'your organization'}. When faced with a critical obstacle, I immediately took ownership, reorganized the team's priorities, and executed a revised strategy. The result was not only a 40% improvement in efficiency but also a lasting framework that our team still uses today. I believe this direct bias-for-action and strategic thinking makes me a perfect fit for the ${entry.role || entry.program || 'open'} position.</p>
      </div><p><br></p>`;
    await simulateAIGeneration(html);
  }

  async function generateWhyUs() {
    const org = entry.company || entry.school || 'this organization';
    const html = `
      <div style="background: rgba(16, 185, 129, 0.1); padding: 16px; border-left: 4px solid #10b981; margin-bottom: 16px;">
        <h4 style="color: #059669; margin-bottom: 8px;"><strong>✨ AI "Why Us" Draft for ${org}</strong></h4>
        <p>I have been closely following ${org}'s recent strategic initiatives, particularly the launch of your latest product line and your commitment to sustainability. My background in rapid scaling and cross-functional leadership aligns perfectly with the growth trajectory you outlined in last quarter's earnings call. I am eager to bring my specific expertise to the team and help drive this mission forward.</p>
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

    if (!weakPoints) weakPoints = "<li>None! Your application looks incredibly strong.</li>";

    if (!weakPoints) weakPoints = "<li>None! Your application looks incredibly strong.</li>";

    const html = `
      <div style="background: rgba(245, 158, 11, 0.1); padding: 16px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
        <h4 style="color: #d97706; margin-bottom: 8px;"><strong>🏥 Application Health Score: ${score}/100</strong></h4>
        <p><strong>Likelihood of Interview:</strong> ${score >= 80 ? 'High' : score >= 60 ? 'Moderate' : 'Low'}</p>
        <p><strong>Weak Points Identified:</strong></p>
        <ul>
          ${weakPoints}
        </ul>
        <p><strong>Action Item:</strong> ${score >= 80 ? 'Submit it!' : 'Address the weak points before applying.'}</p>
      </div><p><br></p>`;
    await simulateAIGeneration(html);
  }

  async function autoTailorResume() {
    if (!entry.jobDescription || !$appData.masterResume) {
      alert("Please ensure you have built your Master Resume in the Resume Studio, and pasted a Job Description below.");
      return;
    }
    isGenerating = true;
    await new Promise(r => setTimeout(r, 2000));
    
    // Simulate AI restructuring the Master Resume to include ATS keywords
    const tailored = JSON.parse(JSON.stringify($appData.masterResume));
    if (missingKeywords.length > 0) {
      if (tailored.skills) {
        tailored.skills += '\\nOptimized Skills: ' + missingKeywords.slice(0, 5).join(', ');
      } else {
        tailored.skills = 'Optimized Skills: ' + missingKeywords.slice(0, 5).join(', ');
      }
      // Simulate rewriting a bullet point
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

  async function handleSmartPaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      
      let parsedRole = '';
      let parsedCompany = '';
      
      const atMatch = text.match(/(?:Role|Position|Title)?\s*[:\-]?\s*([A-Za-z\s]+?)\s+at\s+([A-Z][A-Za-z0-9\s]+)/i);
      if (atMatch) {
        parsedRole = atMatch[1].trim();
        parsedCompany = atMatch[2].trim();
      }

      if (parsedCompany && !entry.company) entry.company = parsedCompany;
      if (parsedRole && !entry.role) entry.role = parsedRole;
      if (text.includes('http') && !entry.portalLink) entry.portalLink = text.match(/https?:\/\/[^\s]+/)?.[0] || '';
    } catch (e) {
      console.error('Failed to read clipboard', e);
    }
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
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.gre} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">GRE Scores Submitted</span>
                      </label>
                    {:else}
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.caActivities} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">CA Activities List</span>
                      </label>
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.satAct} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">SAT / ACT Scores</span>
                      </label>
                    {/if}
                  </div>
                  
                  <div>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Letters of Rec</p>
                    <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="checkbox" bind:checked={entry.lor1} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                      <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Recommender 1 Submitted</span>
                    </label>
                    <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="checkbox" bind:checked={entry.lor2} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                      <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Recommender 2 Submitted</span>
                    </label>
                    
                    {#if entry.degreeType === 'PhD'}
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.lor3} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Recommender 3 Submitted</span>
                      </label>
                    {:else}
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.lorCounselor} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Counselor Rec Submitted</span>
                      </label>
                    {/if}
                    
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-3">Financial Aid</p>
                    {#if entry.degreeType === 'PhD'}
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.fundingApp} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">Funding / Fellowship App</span>
                      </label>
                    {:else}
                      <label class="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.fafsa} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">FAFSA Submitted</span>
                      </label>
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={entry.cssProfile} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 bg-white" />
                        <span class="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white transition-colors">CSS Profile Submitted</span>
                      </label>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}

            <div class="form-field full editor-container mt-6 relative">
              <div class="flex items-center justify-between mb-1.5 ml-1">
                <label for="em-notes" class="block text-sm font-bold text-slate-700 dark:text-slate-300">Notes, Essays & Scratchpad</label>
                
                <div class="flex items-center gap-3">
                  <div class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                    {wordCount} words
                  </div>
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
                  <p class="text-xs font-medium text-indigo-700/80 dark:text-indigo-400 mt-1 leading-relaxed">Paste the full Job Description below. Panacea will extract the most frequent keywords and cross-reference them against your Master Resume to generate an ATS Match Score. Add missing keywords to your resume to beat the automated screeners.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Inputs & Auto-Tailor -->
                <div class="flex flex-col gap-4">
                  <div>
                    <label for="ats-jd" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Job Description</label>
                    <textarea id="ats-jd" bind:value={entry.jobDescription} oninput={scanATS} placeholder="Paste the full job posting here..." class="input-field min-h-[150px] custom-scroll text-xs"></textarea>
                  </div>

                  {#if $appData.masterResume && ($appData.masterResume.name || $appData.masterResume.experience.length > 0)}
                    <div class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
                      <p class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Check size={16} class="text-emerald-500" /> Master Resume Linked</p>
                      <p class="text-xs text-slate-500 mt-1">We are using your structured Master Resume from the Resume Studio for ATS matching and Auto-Tailoring.</p>
                    </div>
                  {:else}
                    <div>
                      <div class="flex justify-between items-center mb-1.5 ml-1">
                        <label for="ats-res" class="block text-sm font-bold text-slate-700 dark:text-slate-300">Master Resume</label>
                        <span class="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Legacy</span>
                      </div>
                      <textarea id="ats-res" bind:value={$appData.globalResume} oninput={() => { scanATS(); saveUserData(); }} placeholder="Paste your entire resume text here. This saves globally across all jobs." class="input-field min-h-[150px] custom-scroll text-xs bg-slate-50 dark:bg-black/20"></textarea>
                    </div>
                  {/if}
                  
                  <div class="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 mt-2">
                    <h4 class="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2"><Sparkles size={16} /> Auto-Tailor Engine</h4>
                    <p class="text-xs text-indigo-700/80 dark:text-indigo-400 mb-4">Click below to generate a new version of your Master Resume perfectly tailored to this specific job description.</p>
                    <button type="button" class="w-full btn-primary flex items-center justify-center gap-2 text-sm" onclick={autoTailorResume} disabled={isGenerating || !entry.jobDescription || !$appData.masterResume}>
                      {#if isGenerating}
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Tailoring Resume...
                      {:else}
                        Generate Tailored Resume
                      {/if}
                    </button>
                  </div>
                  
                  {#if entry.tailoredResume}
                    <div class="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 text-emerald-800 dark:text-emerald-300">
                      <p class="text-sm font-bold flex items-center gap-2"><Check size={16} /> Resume successfully tailored!</p>
                      <p class="text-xs mt-1 mb-3">We've rewritten your bullets to include missing ATS keywords while maintaining your formatting.</p>
                      
                      <div class="bg-white dark:bg-[#111] border border-emerald-100 dark:border-emerald-500/20 rounded-lg p-4 custom-scroll overflow-y-auto max-h-[300px]">
                        <h5 class="font-serif font-bold uppercase text-black dark:text-white mb-2">{entry.tailoredResume.name}</h5>
                        {#each entry.tailoredResume.experience as exp}
                          <div class="mb-2 text-black dark:text-white">
                            <div class="font-bold text-xs">{exp.role} <span class="font-normal italic">at {exp.company}</span></div>
                            <ul class="list-disc pl-4 text-[10px] space-y-0.5 mt-1">
                              {#each exp.bullets as bullet}
                                {#if bullet}<li>{bullet}</li>{/if}
                              {/each}
                            </ul>
                          </div>
                        {/each}
                        <div class="text-[10px] font-bold text-black dark:text-white mt-2">Skills: <span class="font-normal">{entry.tailoredResume.skills}</span></div>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Results -->
                <div class="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-full h-1">
                    <div class="h-full transition-all duration-1000 {atsScore >= 75 ? 'bg-emerald-500' : atsScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}" style="width: {atsScore}%"></div>
                  </div>
                  
                  <div class="text-center mb-6 mt-2">
                    <p class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">ATS Match Score</p>
                    <div class="text-6xl font-extrabold {atsScore >= 75 ? 'text-emerald-500' : atsScore >= 50 ? 'text-amber-500' : 'text-rose-500'}">{atsScore}%</div>
                  </div>

                  {#if entry.jobDescription && ($appData.globalResume || $appData.masterResume)}
                    <div class="flex-1 overflow-y-auto custom-scroll pr-2">
                      <div class="mb-4">
                        <h4 class="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <X size={14} /> Missing Keywords
                        </h4>
                        <div class="flex flex-wrap gap-1.5">
                          {#if missingKeywords.length === 0}
                            <span class="text-xs text-slate-400 italic">None!</span>
                          {/if}
                          {#each missingKeywords as kw}
                            <span class="px-2 py-1 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-500/20">{kw}</span>
                          {/each}
                        </div>
                      </div>
                      
                      <div>
                        <h4 class="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Check size={14} /> Found Keywords
                        </h4>
                        <div class="flex flex-wrap gap-1.5">
                          {#if foundKeywords.length === 0}
                            <span class="text-xs text-slate-400 italic">None!</span>
                          {/if}
                          {#each foundKeywords as kw}
                            <span class="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-500/20">{kw}</span>
                          {/each}
                        </div>
                      </div>
                    </div>
                  {:else}
                    <div class="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                      <FileSearch size={32} class="text-slate-400 mb-3" />
                      <p class="text-sm font-medium text-slate-500">Paste both your Resume and the Job Description to see your score.</p>
                    </div>
                  {/if}
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
                  <h3 class="text-sm font-bold text-emerald-900 dark:text-emerald-300">Supplemental Essays</h3>
                  <p class="text-xs font-medium text-emerald-700/80 dark:text-emerald-400 mt-1 leading-relaxed">Here are the exact supplemental essay prompts required for {entry.school || 'this school'}. Draft and save your responses directly below each prompt.</p>
                </div>
              </div>

              {#if entry.supps && entry.supps.length > 0}
                <div class="space-y-6">
                  {#each entry.supps as supp}
                    <div class="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                      <div class="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                        <p class="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">{supp.prompt}</p>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mt-2">Max {supp.wordLimit} Words</p>
                      </div>
                      <div class="p-4 relative">
                        <textarea bind:value={supp.draft} placeholder="Start writing your draft..." class="w-full min-h-[150px] bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 resize-y custom-scroll"></textarea>
                        <div class="absolute bottom-3 right-4">
                          <span class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md">{supp.draft ? supp.draft.trim().split(/\s+/).length : 0} / {supp.wordLimit} words</span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl mt-4">
                  <Check size={32} class="text-slate-400 mb-3" />
                  <p class="text-sm font-bold text-slate-700 dark:text-slate-300">No Supplemental Essays</p>
                  <p class="text-xs text-slate-500 mt-2 font-medium">This school does not require any additional writing supplements.</p>
                </div>
              {/if}
            </div>
          {:else if activeTab === 'advice'}
            <div class="flex flex-col gap-6 fade-in">
              <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div class="absolute -right-10 -top-10 w-40 h-40 bg-amber-400 rounded-full mix-blend-screen filter blur-[50px] opacity-20"></div>
                
                <h3 class="text-xl font-black text-amber-900 dark:text-amber-300 mb-4 flex items-center gap-2">
                  <Sparkles size={20} class="text-amber-500" /> Optimize Strategy
                </h3>
                
                <div class="bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-xl p-5 border border-amber-200/50 dark:border-amber-500/20 shadow-inner">
                  {#if entry.aiAdvice}
                    <p class="text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">{entry.aiAdvice}</p>
                  {:else}
                    <p class="text-sm font-medium text-amber-900/60 dark:text-amber-200/60 italic leading-relaxed">No specific AI advice generated for this school yet. Use the AI Matcher or click "Optimize Strategy" to generate actionable insights.</p>
                  {/if}
                </div>
                
                <button type="button" class="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all" onclick={() => alert('Strategy Optimized! (Simulated)')}>
                  <Sparkles size={16} /> Re-Calculate Strategy
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Right: Inspector Sidebar -->
        <div class="md:col-span-1 bg-slate-50 dark:bg-white/5 border-l border-slate-200 dark:border-white/10 p-6 overflow-y-auto custom-scroll flex flex-col">
          <div class="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-2">
            <button class="text-xs font-bold uppercase tracking-widest transition-colors {sidebarTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-[3px] pb-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pb-2'}" onclick={() => sidebarTab = 'history'}>History</button>
            <button class="text-xs font-bold uppercase tracking-widest transition-colors {sidebarTab === 'browser' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-[3px] pb-2' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pb-2'}" onclick={() => sidebarTab = 'browser'}>Mini Browser</button>
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
                <p class="text-sm font-medium text-slate-400">No history recorded yet.</p>
              {/if}
            </div>
          {:else}
            <!-- Mini Browser Tab -->
            {#if entry.portalLink}
              <div class="flex-1 flex flex-col relative min-h-[350px]">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-xs text-slate-500 font-medium truncate pr-2" title={entry.portalLink}>{entry.portalLink}</span>
                  <a href={entry.portalLink} target="_blank" rel="noopener" class="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shadow-sm border border-indigo-100 dark:border-indigo-500/20">Open ↗</a>
                </div>
                <div class="flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white">
                  <iframe src={entry.portalLink} class="w-full h-full border-none" title="School Portal" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
                </div>
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center h-full text-center p-4">
                <div class="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300">No link found</p>
                <p class="text-xs text-slate-500 mt-2 font-medium">Select a school or enter a URL in the details section to browse the site here.</p>
              </div>
            {/if}
          {/if}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-white dark:bg-[#111]">
        <button class="btn-secondary" onclick={close}>Cancel</button>
        <button class="btn-primary" onclick={save}>Save Changes</button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(12px); }
  }
  @keyframes elasticPop {
    0% { transform: scale(0.9) translateY(40px); opacity: 0; }
    50% { transform: scale(1.02) translateY(-10px); opacity: 1; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-elasticPop {
    animation: elasticPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .form-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;
  }
  .form-field.full { grid-column: 1 / -1; }
  
  :global(.ql-toolbar) {
    border-radius: 0.75rem 0.75rem 0 0 !important;
    border-color: var(--border-color, #e2e8f0) !important;
    background: transparent !important;
  }
  :global(.ql-container) {
    border-radius: 0 0 0.75rem 0.75rem !important;
    border-color: var(--border-color, #e2e8f0) !important;
    font-family: inherit !important;
    font-size: 0.875rem !important;
  }
</style>
