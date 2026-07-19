import { writable } from 'svelte/store';
import type { User } from 'firebase/auth';
import type { AppState } from './types';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const userStore = writable<User | null>(null);
export const authLoading = writable(true);
export const appData = writable<AppState>({ jobs: [], colleges: [], quickLinks: [], docs: [], vaultStories: [], networkingContacts: [] });
export const modalState = writable<{ isOpen: boolean; type: 'job' | 'college'; editId: string | null; degreeType?: 'Undergrad' | 'PhD' }>({ isOpen: false, type: 'job', editId: null });
export const layoutState = writable({ isSidebarCollapsed: false, isSettingsOpen: false, isCommandPaletteOpen: false });
export const activeDocId = writable<string | null>(null);

// Will hold the access token for the active session if they've granted Gmail permissions
export const gmailAccessToken = writable<string | null>(
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('gmailAccessToken') : null
);

if (typeof sessionStorage !== 'undefined') {
  gmailAccessToken.subscribe(token => {
    if (token) sessionStorage.setItem('gmailAccessToken', token);
    else sessionStorage.removeItem('gmailAccessToken');
  });
}

let currentUserId: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let unsubSnapshot: (() => void) | null = null;

export function loadUserData(uid: string): Promise<void> {
  return new Promise((resolve) => {
    currentUserId = uid;
    const docRef = doc(db, 'users', uid);
    
    if (unsubSnapshot) unsubSnapshot();
    let isFirstLoad = true;

    unsubSnapshot = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppState;
        appData.set({
          jobs: data.jobs || [],
          colleges: data.colleges || [],
          activities: data.activities || [],
          quickLinks: data.quickLinks || [
            { id: '1', label: 'Common App', url: 'https://apply.commonapp.org/' },
            { id: '2', label: 'FAFSA', url: 'https://studentaid.gov/h/apply-for-aid/fafsa' }
          ],
          docs: data.docs || [],
          vaultStories: data.vaultStories || [],
          networkingContacts: data.networkingContacts || [],
          settings: data.settings || { theme: 'system' },
          globalResume: data.globalResume,
          masterResume: data.masterResume
        });
      } else {
        const initialData: AppState = { jobs: [], colleges: [], activities: [], quickLinks: [
          { id: '1', label: 'Common App', url: 'https://apply.commonapp.org/' },
          { id: '2', label: 'FAFSA', url: 'https://studentaid.gov/h/apply-for-aid/fafsa' }
        ], docs: [], vaultStories: [], networkingContacts: [], settings: { theme: 'system' } };
        appData.set(initialData);
        setDoc(docRef, initialData).catch(err => console.error(err));
      }

      if (isFirstLoad) {
        isFirstLoad = false;
        resolve();
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      if (isFirstLoad) resolve();
    });
  });
}



export function clearUserData() {
  if (unsubSnapshot) unsubSnapshot();
  unsubSnapshot = null;
  currentUserId = null;
  appData.set({ jobs: [], colleges: [], activities: [], quickLinks: [], docs: [], vaultStories: [] });
}

export function saveUserData(immediate = false) {
  if (!currentUserId) return;
  if (saveTimer) clearTimeout(saveTimer);
  
  const doWrite = () => {
    let currentState: AppState = { jobs: [], colleges: [], activities: [], quickLinks: [], docs: [], vaultStories: [], settings: { theme: 'system' } };
    const unsub = appData.subscribe(value => currentState = value);
    unsub();
    setDoc(doc(db, 'users', currentUserId as string), currentState).catch(err => console.error('Failed to save data', err));
  };

  if (immediate) doWrite();
  else saveTimer = setTimeout(doWrite, 500);
}
