<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
  import { onMount } from 'svelte';
  import { onAuthStateChanged } from 'firebase/auth';
  import { fade, fly } from 'svelte/transition';
  import { page } from '$app/state';
  import { auth } from '$lib/firebase';
  import { userStore, authLoading, loadUserData, clearUserData, layoutState, modalState } from '$lib/stores';
  import AuthScreen from '$lib/components/AuthScreen.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EntryModal from '$lib/components/EntryModal.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loadUserData(user.uid);
    } else {
      clearUserData();
    }
    userStore.set(user);
    authLoading.set(false);
  });


  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if $authLoading}
  <div class="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0A] overflow-hidden relative">
    <div class="animate-sorting-hat-global text-amber-400 z-10 drop-shadow-xl">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-16 h-16">
        <path d="M4 18s4-2 8-2 8 2 8 2" />
        <path d="M6 18l2-8c1-4 3-6 4-6s1.5 2 2.5 5c1 3 1.5 6 1.5 9" />
        <path d="M10 12c1 .5 3 .5 4 0" />
        <path d="M11 15c.5.5 1.5.5 2 0" />
      </svg>
    </div>
    <div class="mt-8 text-xs font-bold text-amber-500 tracking-widest uppercase animate-pulse">Consulting the Sorting Hat...</div>
  </div>
{:else if !$userStore}
  <AuthScreen />
{:else}
  <div class="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] transition-colors duration-300">
    <Sidebar />
    <main class="transition-all duration-300 {$layoutState.isSidebarCollapsed ? 'md:pl-24' : 'md:pl-72'} pb-24 md:pb-0 p-4 sm:p-8 w-full min-h-screen overflow-x-hidden">
      <div class="max-w-7xl mx-auto w-full grid">
        {#key page.url.pathname}
          <div class="col-start-1 row-start-1 w-full" in:fly={{ y: 10, duration: 300, delay: 100 }} out:fade={{ duration: 100 }}>
            {@render children()}
          </div>
        {/key}
      </div>
    </main>
    <EntryModal bind:isOpen={$modalState.isOpen} bind:type={$modalState.type} bind:editId={$modalState.editId} />
    <CommandPalette />
  </div>
{/if}
