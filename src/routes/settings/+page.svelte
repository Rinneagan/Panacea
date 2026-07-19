<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { Moon, Sun, Monitor, Shield, User, Bell, Key, Trash2 } from 'lucide-svelte';
  import { userStore, appData, saveUserData } from '$lib/stores';

  let currentTheme = $state(
    typeof localStorage !== 'undefined' && localStorage.theme ? localStorage.theme : 'system'
  );
  
  let apiKeyInput = $state($appData?.settings?.geminiApiKey || '');
  let activeTab = $state('appearance');

  function setTheme(theme: 'light' | 'dark' | 'system') {
    currentTheme = theme;
    if (theme === 'dark') {
      localStorage.theme = 'dark';
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      localStorage.theme = 'light';
      document.documentElement.classList.remove('dark');
    } else {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    $appData = { ...$appData, settings: { ...$appData.settings, theme } };
    saveUserData(true);
  }

  function saveApiKey() {
    $appData = { ...$appData, settings: { ...$appData.settings, geminiApiKey: apiKeyInput } };
    saveUserData(true);
    alert('API Key saved successfully!');
  }
</script>

<svelte:head>
  <title>Settings | Panacea</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-10 fade-in">
  <div class="mb-10">
    <h1 class="text-4xl font-black text-black dark:text-white tracking-tight">Settings</h1>
    <p class="text-slate-500 mt-2 text-lg font-medium">Manage your workspace preferences, security, and integrations.</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
    
    <!-- Sidebar -->
    <div class="md:col-span-1 flex flex-col gap-2">
      <button onclick={() => activeTab = 'appearance'} class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors {activeTab === 'appearance' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}">
        <Monitor size={18} /> Appearance
      </button>
      <button onclick={() => activeTab = 'ai'} class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors {activeTab === 'ai' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}">
        <Key size={18} /> AI Integration
      </button>
      <button onclick={() => activeTab = 'account'} class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors {activeTab === 'account' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}">
        <User size={18} /> Account
      </button>
    </div>

    <!-- Content -->
    <div class="md:col-span-3">
      
      {#if activeTab === 'appearance'}
        <div class="glass-panel p-8 fade-in">
          <h3 class="text-2xl font-bold text-black dark:text-white mb-2">Appearance</h3>
          <p class="text-slate-500 font-medium mb-8">Customize the look and feel of your workspace.</p>

          <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Theme Preference</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onclick={() => setTheme('system')} class="flex flex-col items-center p-6 rounded-2xl border-2 transition-all {currentTheme === 'system' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'}">
              <Monitor size={32} strokeWidth={1.5} class="mb-4 {currentTheme === 'system' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}" />
              <span class="font-bold text-sm {currentTheme === 'system' ? 'text-indigo-900 dark:text-white' : 'text-slate-500'}">System Match</span>
            </button>

            <button onclick={() => setTheme('light')} class="flex flex-col items-center p-6 rounded-2xl border-2 transition-all {currentTheme === 'light' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'}">
              <Sun size={32} strokeWidth={1.5} class="mb-4 {currentTheme === 'light' ? 'text-indigo-600' : 'text-slate-400'}" />
              <span class="font-bold text-sm {currentTheme === 'light' ? 'text-indigo-900' : 'text-slate-500'}">Light Mode</span>
            </button>

            <button onclick={() => setTheme('dark')} class="flex flex-col items-center p-6 rounded-2xl border-2 transition-all {currentTheme === 'dark' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'}">
              <Moon size={32} strokeWidth={1.5} class="mb-4 {currentTheme === 'dark' ? 'text-indigo-400' : 'text-slate-400'}" />
              <span class="font-bold text-sm {currentTheme === 'dark' ? 'text-white' : 'text-slate-500'}">Dark Mode</span>
            </button>
          </div>
        </div>
      {/if}

      {#if activeTab === 'ai'}
        <div class="glass-panel p-8 fade-in">
          <h3 class="text-2xl font-bold text-black dark:text-white mb-2">AI Integration</h3>
          <p class="text-slate-500 font-medium mb-8">Power up your workflow with Google Gemini AI.</p>

          <div class="space-y-4 max-w-xl">
            <div>
              <label for="gemini-key" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Gemini API Key</label>
              <div class="flex gap-3">
                <input id="gemini-key" type="password" bind:value={apiKeyInput} placeholder="AIzaSy..." class="input-field flex-1" />
                <button onclick={saveApiKey} class="btn-primary shrink-0">Save Key</button>
              </div>
              <p class="text-xs text-slate-400 mt-2">Your key is stored securely in your private Firebase document and used only for direct browser API calls.</p>
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'account'}
        <div class="glass-panel p-8 fade-in">
          <h3 class="text-2xl font-bold text-black dark:text-white mb-2">Danger Zone</h3>
          <p class="text-slate-500 font-medium mb-8">Irreversible account actions.</p>

          <div class="p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <h4 class="font-bold text-rose-900 dark:text-rose-100 mb-1">Delete Account</h4>
              <p class="text-sm font-medium text-rose-600 dark:text-rose-400">Permanently delete your account and all data.</p>
            </div>
            <button class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-rose-500/30 transition-all flex items-center gap-2">
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      {/if}

    </div>
  </div>
</div>
