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
    <div class="paper-swoosh">
      <div class="paper-wrapper">
        <div class="realistic-paper"></div>
      </div>
    </div>
    <div class="mt-8 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase animate-pulse">Loading...</div>
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
