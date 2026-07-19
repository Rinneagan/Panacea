<script lang="ts">
  import { page } from '$app/stores';
  import { auth } from '$lib/firebase';
  import { userStore, layoutState, appData, activeDocId } from '$lib/stores';
  import {
    LayoutDashboard,
    Briefcase,
    GraduationCap,
    Calendar,
    LogOut,
    Mail,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Command,
    Plus,
    Scale,
    Mic,
    BarChart2,
    Timer,
    Home,
    BookOpen,
    Users,
    BrainCircuit
  } from '@lucide/svelte';

  function handleSignOut() {
    auth.signOut();
  }

  function isActive(path: string) {
    return $page.url.pathname === path;
  }

  function toggleSidebar() {
    layoutState.update(s => ({ ...s, isSidebarCollapsed: !s.isSidebarCollapsed }));
  }

  function openSettings() {
    layoutState.update(s => ({ ...s, isSettingsOpen: true }));
  }
</script>

<!-- Mobile Bottom Nav (visible on sm and below) -->
<nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/10 z-50 flex items-center justify-around px-2 pb-safe">
  <a href="/" class="flex flex-col items-center justify-center w-14 h-full {isActive('/') ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}">
    <LayoutDashboard size={20} class="mb-1" />
  </a>
  <a href="/dashboard" class="flex flex-col items-center justify-center w-14 h-full {isActive('/dashboard') ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}">
    <BarChart2 size={20} class="mb-1" />
  </a>
  <a href="/jobs" class="flex flex-col items-center justify-center w-14 h-full {isActive('/jobs') ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}">
    <Briefcase size={20} class="mb-1" />
  </a>
  <a href="/college" class="flex flex-col items-center justify-center w-14 h-full {isActive('/college') ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}">
    <GraduationCap size={20} class="mb-1" />
  </a>
  <a href="/docs" class="flex flex-col items-center justify-center w-14 h-full {isActive('/docs') ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}">
    <FileText size={20} class="mb-1" />
  </a>
  <button onclick={openSettings} class="flex flex-col items-center justify-center w-14 h-full text-slate-400 dark:text-slate-500">
    <Settings size={20} class="mb-1" />
  </button>
</nav>

<!-- Desktop Sidebar -->
<aside class="hidden md:flex fixed inset-y-0 left-0 transition-all duration-300 z-50 {$layoutState.isSidebarCollapsed ? 'w-24 p-4' : 'w-72 p-6'} flex-col">
  <div class="glass-panel h-full w-full flex flex-col relative { $layoutState.isSidebarCollapsed ? 'px-2 py-6 items-center' : 'px-6 py-8' }">
    
    <!-- Collapse Toggle -->
    <button onclick={toggleSidebar} class="absolute -right-3 top-10 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white shadow-sm transition-colors z-10">
      {#if $layoutState.isSidebarCollapsed}
        <ChevronRight size={14} strokeWidth={3} />
      {:else}
        <ChevronLeft size={14} strokeWidth={3} />
      {/if}
    </button>

    <!-- Brand -->
    <div class="flex items-center gap-4 mb-10 { $layoutState.isSidebarCollapsed ? 'justify-center w-full' : '' }">
      <div class="w-10 h-10 shrink-0 rounded-xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-lg shadow-md">
        P
      </div>
      {#if !$layoutState.isSidebarCollapsed}
        <div class="overflow-hidden whitespace-nowrap fade-in">
          <h1 class="text-lg font-bold text-black dark:text-white tracking-tight">Panacea</h1>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate w-32" title={$userStore?.email}>Workspace</p>
        </div>
      {/if}
    </div>

    <!-- Cmd+K Trigger -->
    {#if !$layoutState.isSidebarCollapsed}
      <button onclick={() => layoutState.update(s => ({ ...s, isCommandPaletteOpen: true }))} class="w-full flex items-center justify-between px-3 py-2.5 mb-8 bg-slate-100 dark:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 rounded-xl text-sm font-medium text-slate-500 transition-colors">
        <span class="flex items-center gap-2"><SearchIcon size={16} /> Search...</span>
        <kbd class="px-1.5 py-0.5 bg-white dark:bg-black rounded text-[10px] font-bold shadow-sm border border-slate-200 dark:border-slate-800">⌘K</kbd>
      </button>
    {:else}
      <button onclick={() => layoutState.update(s => ({ ...s, isCommandPaletteOpen: true }))} class="w-10 h-10 flex items-center justify-center mb-8 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-colors" title="Search (Cmd+K)">
        <SearchIcon size={16} />
      </button>
    {/if}

    <!-- Navigation -->
    <nav class="flex-1 flex flex-col gap-1.5 w-full">
      {#if !$layoutState.isSidebarCollapsed}
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-2 fade-in">Overview</p>
      {/if}
      
      {@render NavItem({ href: "/", icon: Home, label: "Dashboard", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/') })}
      {@render NavItem({ href: "/jobs", icon: Briefcase, label: "Job Apps", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/jobs') })}
      {@render NavItem({ href: "/grid", icon: LayoutDashboard, label: "Mass Update Grid", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/grid') })}
      {@render NavItem({ href: "/undergrad", icon: GraduationCap, label: "Undergrad Apps", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/undergrad') })}
      {@render NavItem({ href: "/phd", icon: GraduationCap, label: "PhD Apps", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/phd') })}
      {@render NavItem({ href: "/resume", icon: FileText, label: "Resume Studio", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/resume') })}
      {@render NavItem({ href: "/vault", icon: BookOpen, label: "Essay Vault", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/vault') })}
      {@render NavItem({ href: "/networking", icon: Users, label: "Networking", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/networking') })}
      {@render NavItem({ href: "/comparator", icon: Scale, label: "Decision Matrix", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/comparator') })}
      {@render NavItem({ href: "/prep", icon: BrainCircuit, label: "Interview Prep", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/prep') })}

      {#if !$layoutState.isSidebarCollapsed}
        <div class="mt-6 mb-1 fade-in">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Workspace</p>
        </div>
      {:else}
        <div class="h-4"></div>
      {/if}

      {@render NavItem({ href: "/inbox", icon: Mail, label: "Email Inbox", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/inbox') })}

      <!-- Nested Documents List -->
      {#if !$layoutState.isSidebarCollapsed}
        <div class="mt-2 ml-4 border-l border-slate-200 dark:border-white/10 pl-2 flex flex-col gap-1 fade-in">
          <div class="flex items-center justify-between px-3 py-1 mb-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Docs</span>
            <button class="text-slate-400 hover:text-black dark:hover:text-white transition-colors" title="New Document" onclick={() => {
              const newDoc = {
                id: crypto.randomUUID(),
                title: 'Untitled Document',
                content: '',
                updatedAt: Date.now()
              };
              $appData.docs = [newDoc, ...($appData.docs || [])];
              $activeDocId = newDoc.id;
              window.location.href = '/docs';
            }}>
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
          
          <div class="max-h-40 overflow-y-auto custom-scroll pr-1 flex flex-col gap-0.5">
            {#if !$appData.docs || $appData.docs.length === 0}
              <span class="text-xs text-slate-400 px-3 py-1 font-medium italic">No docs yet</span>
            {:else}
              {#each $appData.docs as doc}
                <button class="text-left w-full px-3 py-1.5 rounded-lg text-xs font-semibold truncate transition-colors {isActive('/docs') && $activeDocId === doc.id ? 'bg-slate-100 text-black dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-black dark:hover:bg-white/5 dark:hover:text-white'}" onclick={() => {
                  $activeDocId = doc.id;
                  if (!isActive('/docs')) window.location.href = '/docs';
                }}>
                  {doc.title || 'Untitled Document'}
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </nav>

    <!-- Footer -->
    <div class="mt-auto pt-4 border-t border-slate-200/50 dark:border-white/10 flex flex-col w-full gap-1.5">
      
      {#if !$layoutState.isSidebarCollapsed}
        <!-- Pomodoro Timer -->
        <div class="px-3 py-3 mb-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex items-center justify-between transition-all group fade-in">
          <div class="flex items-center gap-2">
            <Timer class="text-indigo-500 dark:text-indigo-400" size={16} />
            <span class="text-sm font-bold text-indigo-900 dark:text-indigo-300">Focus Mode</span>
          </div>
          <button class="text-xs font-bold px-2 py-1 bg-white dark:bg-[#222] text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 hover:border-transparent transition-colors shadow-sm" onclick={() => alert('Pomodoro Focus Mode started! (Simulated)')}>
            25:00
          </button>
        </div>
      {/if}

      <!-- Settings & Sign Out -->
      {@render NavItem({ href: "/settings", icon: Settings, label: "Settings", collapsed: $layoutState.isSidebarCollapsed, active: isActive('/settings') })}
      
      <button onclick={handleSignOut} class="flex items-center { $layoutState.isSidebarCollapsed ? 'justify-center w-10 h-10 p-0 mx-auto' : 'px-3 py-2.5 gap-3 w-full' } rounded-xl font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left" title="Sign Out">
        <LogOut size={18} strokeWidth={2} />
        {#if !$layoutState.isSidebarCollapsed}<span class="fade-in whitespace-nowrap">Sign Out</span>{/if}
      </button>
    </div>
  </div>
</aside>

<!-- Helper Component for Nav Items -->
<script module>
  import { Search as SearchIcon } from '@lucide/svelte';
</script>

{#snippet NavItem({ href, icon: Icon, label, collapsed, active }: { href: string, icon: any, label: string, collapsed: boolean, active: boolean })}
  <a {href} class="flex items-center { collapsed ? 'justify-center w-10 h-10 p-0 mx-auto' : 'px-3 py-2.5 gap-3' } rounded-xl font-semibold transition-all duration-200 {active ? 'bg-black text-white dark:bg-white dark:text-black shadow-md shadow-black/10 dark:shadow-white/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'}" title={collapsed ? label : ''}>
    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
    {#if !collapsed}
      <span class="fade-in whitespace-nowrap">{label}</span>
    {/if}
  </a>
{/snippet}

<style>
  .fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
