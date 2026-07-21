export interface ActivityEvent {
  id: string;
  ts: number;
  text: string;
}

export interface DocumentEntry {
  id: string;
  type: 'link' | 'editor';
  label: string;
  url?: string;
  status?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ContactInfo {
  name?: string;
  email?: string;
}

export interface BaseApplication {
  id: string;
  status: string;
  deadline?: string;
  portalLink?: string;
  notes?: string;
  starred?: boolean;
  documents?: DocumentEntry[];
  tags?: string[];
  checklist?: ChecklistItem[];
  contact?: ContactInfo;
  activity?: ActivityEvent[];
  createdAt?: number;
  updatedAt?: number;
  archived?: boolean;
  history?: { status: string; date: number }[];
}

export interface JobOfferDetails {
  baseSalary?: number;
  bonus?: number;
  rsu?: number;
  signOn?: number;
  ptoDays?: number;
  healthPremium?: number;
  match401k?: number;
}

export interface CollegeOfferDetails {
  tuition?: number;
  roomBoard?: number;
  scholarships?: number;
  grants?: number;
  loans?: number;
  stipend?: number;
}

export interface MasterResume {
  name: string;
  contactInfo: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string;
}

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  dateRange: string;
  bullets: string[];
}

export interface ResumeEducation {
  id: string;
  school: string;
  degree: string;
  dateRange: string;
  gpa?: string;
  bullets: string[];
}

export interface SupplementalEssay {
  id: string;
  prompt: string;
  wordLimit: number;
  draft: string;
}

export interface JobApplication extends BaseApplication {
  company: string;
  role?: string;
  location?: string;
  appliedDate?: string;
  salary?: string;
  jobLink?: string;
  networkingNotes?: string;
  interviewPrep?: string;
  jobDescription?: string;
  offerDetails?: JobOfferDetails;
  tailoredResume?: MasterResume;
}

export interface CollegeApplication extends BaseApplication {
  school: string;
  program?: string;
  deadlineType?: string;
  degreeType?: 'Undergrad' | 'PhD';
  
  // Universal Materials
  statementOfPurpose?: boolean;
  resume?: boolean;
  
  // Undergrad Specific
  caActivities?: boolean;
  satAct?: boolean;
  lor1?: boolean;
  lor2?: boolean;
  lorCounselor?: boolean;
  fafsa?: boolean;
  cssProfile?: boolean;
  
  // PhD Specific
  researchProposal?: boolean;
  publications?: boolean;
  portfolio?: boolean;
  gre?: boolean;
  lor3?: boolean;
  fundingApp?: boolean;

  offerDetails?: CollegeOfferDetails;
  aiAdvice?: string;
  supps?: SupplementalEssay[];
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
}

export interface CommonAppActivity {
  id: string;
  type: string;
  position: string;
  organization: string;
  description: string;
  gradeLevels: string[];
  timing: string;
  hoursPerWeek: string;
  weeksPerYear: string;
}

export interface AppDocument {
  id: string;
  title: string;
  content: string;
  linkedAppId?: string;
  linkedAppType?: 'job' | 'college';
  updatedAt: number;
}

export interface VaultStory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
}

export interface NetworkingContact {
  id: string;
  name: string;
  role: string;
  company: string;
  status: 'To Reach Out' | 'Messaged' | 'Chat Scheduled' | 'Referral Secured' | 'Ghosted';
  linkedInUrl?: string;
  email?: string;
  notes?: string;
  lastContactDate?: number;
  createdAt: number;
  // Faculty-research provenance (optional, backward-compatible)
  source?: 'manual' | 'research';
  profileUrl?: string;       // faculty page, ORCID, or OpenAlex profile
  researchArea?: string;     // primary research topics, comma-separated
  emailStatus?: 'manual' | 'verified' | 'unverified';
}

export interface AppState {
  jobs: JobApplication[];
  colleges: CollegeApplication[];
  quickLinks: QuickLink[];
  docs?: AppDocument[];
  activities?: CommonAppActivity[];
  vaultStories?: VaultStory[];
  networkingContacts?: NetworkingContact[];
  globalResume?: string; // Legacy string resume
  masterResume?: MasterResume; // Structured resume
  settings?: {
    theme?: 'light' | 'dark' | 'system';
    geminiApiKey?: string;
  };
}
