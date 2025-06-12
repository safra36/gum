<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Eye, EyeOff, Lock } from 'lucide-svelte';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/services/api';

  export let showModal = false;

  const dispatch = createEventDispatcher();

  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let loading = false;
  let showCurrentPassword = false;
  let showNewPassword = false;
  let showConfirmPassword = false;
  let errors: Record<string, string> = {};

  function validateForm() {
    errors = {};
    
    if (!currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters long';
    }
    
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    loading = true;
    
    try {
      const response = await api.changePassword(currentPassword, newPassword);
      toast('Password changed successfully', 'success');
      closeModal();
      dispatch('passwordChanged');
    } catch (error) {
      console.error('Password change error:', error);
      if (error.message.includes('Current password is incorrect')) {
        errors.currentPassword = 'Current password is incorrect';
      } else {
        toast('Failed to change password', 'error');
      }
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    showModal = false;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    errors = {};
    showCurrentPassword = false;
    showNewPassword = false;
    showConfirmPassword = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <div class="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
    <div class="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Lock class="mr-2" size={20} />
          Change Password
        </h3>
        <button
          type="button"
          on:click={closeModal}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <!-- Current Password -->
        <div>
          <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Password *
          </label>
          <div class="relative">
            {#if showCurrentPassword}
              <input
                id="currentPassword"
                type="text"
                bind:value={currentPassword}
                class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white {errors.currentPassword ? 'border-red-500' : ''}"
                placeholder="Enter your current password"
                required
                aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
              />
            {:else}
              <input
                id="currentPassword"
                type="password"
                bind:value={currentPassword}
                class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white {errors.currentPassword ? 'border-red-500' : ''}"
                placeholder="Enter your current password"
                required
                aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
              />
            {/if}
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              on:click={() => showCurrentPassword = !showCurrentPassword}
              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              {#if showCurrentPassword}
                <EyeOff size={20} />
              {:else}
                <Eye size={20} />
              {/if}
            </button>
          </div>
          {#if errors.currentPassword}
            <p id="currentPassword-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.currentPassword}
            </p>
          {/if}
        </div>

        <!-- New Password -->
        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Password *
          </label>
          <div class="relative">
            {#if showNewPassword}
              <input
                id="newPassword"
                type="text"
                bind:value={newPassword}
                class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white {errors.newPassword ? 'border-red-500' : ''}"
                placeholder="Enter your new password"
                required
                aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
              />
            {:else}
              <input
                id="newPassword"
                type="password"
                bind:value={newPassword}
                class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white {errors.newPassword ? 'border-red-500' : ''}"
                placeholder="Enter your new password"
                required
                aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
              />
            {/if}
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              on:click={() => showNewPassword = !showNewPassword}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {#if showNewPassword}
                <EyeOff size={20} />
              {:else}
                <Eye size={20} />
              {/if}
            </button>
          </div>
          {#if errors.newPassword}
            <p id="newPassword-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.newPassword}
            </p>
          {/if}
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Password must be at least 6 characters long
          </p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm New Password *
          </label>
          <div class="relative">
            {#if showConfirmPassword}
              <input
                id="confirmPassword"
                type="text"
                bind:value={confirmPassword}
                class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white {errors.confirmPassword ? 'border-red-500' : ''}"
                placeholder="Confirm your new password"
                required
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
            {:else}
              <input
                id="confirmPassword"
                type="password"
                bind:value={confirmPassword}
                class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white {errors.confirmPassword ? 'border-red-500' : ''}"
                placeholder="Confirm your new password"
                required
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
            {/if}
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              on:click={() => showConfirmPassword = !showConfirmPassword}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {#if showConfirmPassword}
                <EyeOff size={20} />
              {:else}
                <Eye size={20} />
              {/if}
            </button>
          </div>
          {#if errors.confirmPassword}
            <p id="confirmPassword-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.confirmPassword}
            </p>
          {/if}
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            on:click={closeModal}
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {#if loading}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {/if}
            Change Password
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}