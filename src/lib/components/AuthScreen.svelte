<script lang="ts">
  import { auth, googleProvider } from '$lib/firebase';
  import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
  import { gmailAccessToken } from '$lib/stores';

  let isSignUpMode = $state(false);
  let email = $state('');
  let password = $state('');
  let authError = $state('');
  let loading = $state(false);

  function toggleMode() {
    isSignUpMode = !isSignUpMode;
    authError = '';
  }

  function friendlyAuthError(err: any) {
    const map: Record<string, string> = {
      'auth/invalid-email': 'That email address looks invalid.',
      'auth/user-not-found': 'No account found with that email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with that email already exists — try signing in instead.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/too-many-requests': 'Too many attempts — please wait a moment and try again.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed before finishing.'
    };
    return map[err.code] || err.message;
  }

  async function handleEmailAuth() {
    authError = '';
    loading = true;
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      authError = friendlyAuthError(err);
    } finally {
      loading = false;
    }
  }

  async function handleGoogleAuth() {
    authError = '';
    loading = true;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        gmailAccessToken.set(credential.accessToken);
      }
    } catch (err) {
      authError = friendlyAuthError(err);
    } finally {
      loading = false;
    }
  }

  async function handleForgot() {
    if (!email) {
      authError = 'Enter your email above first, then click this again.';
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      authError = 'Password reset email sent — check your inbox.';
    } catch (err) {
      authError = friendlyAuthError(err);
    }
  }
</script>

<div class="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] transition-colors duration-300 flex flex-col items-center justify-center p-6 relative overflow-hidden">
  
  <div class="w-full max-w-md z-10 glass-panel p-8 sm:p-12" style="animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;">
    <div class="w-16 h-16 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-3xl flex items-center justify-center mb-8 shadow-xl shadow-black/10 dark:shadow-white/10 mx-auto">
      P
    </div>
    
    <h1 class="text-3xl font-extrabold text-black dark:text-white text-center mb-2 tracking-tight">
      {isSignUpMode ? 'Create an account' : 'Welcome back'}
    </h1>
    <p class="text-center text-slate-500 font-medium mb-8">
      {isSignUpMode ? 'One account, all your applications.' : 'Your applications, saved to your account.'}
    </p>

    <!-- Google Auth Button -->
    <button type="button" class="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 hover:border-black dark:hover:border-white rounded-xl font-bold text-black dark:text-white shadow-sm transition-all mb-6" onclick={handleGoogleAuth} disabled={loading}>
      <svg viewBox="0 0 24 24" class="w-5 h-5"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.064 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.823l-4.04 3.067A11.965 11.965 0 0012 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90E2" d="M23.983 12.279c0-.812-.07-1.583-.2-2.311H12v4.46h6.811c-.31 1.57-1.233 2.842-2.52 3.655l3.794 2.986c2.22-2.008 3.553-5.023 3.553-8.79Z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/></svg>
      Continue with Google
    </button>

    <div class="flex items-center gap-4 mb-6">
      <div class="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
      <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Or with email</span>
      <div class="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); handleEmailAuth(); }} novalidate class="flex flex-col gap-4">
      <div>
        <label for="authEmail" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email</label>
        <input type="email" id="authEmail" bind:value={email} required autocomplete="email" class="input-field" placeholder="you@example.com" />
      </div>
      <div>
        <label for="authPassword" class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Password</label>
        <input type="password" id="authPassword" bind:value={password} required autocomplete="current-password" minlength="6" class="input-field" placeholder="••••••••" />
      </div>
      
      {#if authError}
        <div class="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400">
          {authError}
        </div>
      {/if}
      
      <button type="submit" class="btn-primary w-full mt-2" disabled={loading}>
        {loading ? 'Please wait...' : (isSignUpMode ? 'Create account' : 'Sign in')}
      </button>
    </form>

    <div class="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex flex-col items-center gap-3">
      <button type="button" class="text-sm font-bold text-slate-500 hover:text-black dark:hover:text-white transition-colors" onclick={toggleMode}>
        {isSignUpMode ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
      {#if !isSignUpMode}
        <button type="button" class="text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onclick={handleForgot}>
          Forgot password?
        </button>
      {/if}
    </div>
  </div>
</div>
