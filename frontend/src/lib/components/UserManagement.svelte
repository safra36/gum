<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/services/api';
  import type { User } from '$lib/types';

  interface UserData {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    isActive: boolean;
    permissions: string[];
    createdAt: string;
    updatedAt: string;
  }

  interface NewUser {
    username: string;
    password: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    permissions: string[];
  }

  let users: UserData[] = [];
  let showCreateModal = false;
  let showEditModal = false;
  let editingUser: UserData | null = null;
  let loading = false;
  let error = '';

  let newUser: NewUser = {
    username: '',
    password: '',
    email: '',
    role: 'user',
    permissions: []
  };

  const availablePermissions = [
    'creating_project',
    'editing_project',
    'delete_project',
    'view_project',
    'execute_script',
    'view_execution_history',
    'view_execution_logs',
    'get_git_log',
    'revert_commit',
    'switch_branch',
    'set_cron'
  ];

  onMount(async () => {
    await loadUsers();
  });

  async function loadUsers() {
    try {
      loading = true;
      error = '';
      users = await api.getUsers();
    } catch (err) {
      error = 'Failed to load users';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function createUser() {
    try {
      error = '';
      await api.createUser(newUser);
      showCreateModal = false;
      resetNewUser();
      await loadUsers();
    } catch (err) {
      error = 'Failed to create user';
      console.error(err);
    }
  }

  async function updateUser() {
    if (!editingUser) return;
    
    try {
      error = '';
      await api.updateUser(editingUser.id, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        permissions: editingUser.permissions,
        isActive: editingUser.isActive
      });
      showEditModal = false;
      editingUser = null;
      await loadUsers();
    } catch (err) {
      error = 'Failed to update user';
      console.error(err);
    }
  }

  async function deleteUser(userId: number) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      error = '';
      await api.deleteUser(userId);
      await loadUsers();
    } catch (err) {
      error = 'Failed to delete user';
      console.error(err);
    }
  }

  function resetNewUser() {
    newUser = {
      username: '',
      password: '',
      email: '',
      role: 'user',
      permissions: []
    };
  }

  function openEditModal(user: UserData) {
    editingUser = { ...user };
    showEditModal = true;
  }

  function togglePermission(permission: string, permissionsArray: string[]) {
    const index = permissionsArray.indexOf(permission);
    if (index > -1) {
      permissionsArray.splice(index, 1);
    } else {
      permissionsArray.push(permission);
    }
    // Trigger reactivity
    if (editingUser) {
      editingUser.permissions = [...editingUser.permissions];
    } else {
      newUser.permissions = [...newUser.permissions];
    }
  }
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h2 class="text-2xl font-bold text-gray-900">User Management</h2>
    <button 
      on:click={() => showCreateModal = true}
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
    >
      Create User
    </button>
  </div>

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <ul class="divide-y divide-gray-200">
        {#each users as user}
          <li class="px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <h3 class="text-lg font-medium text-gray-900">{user.username}</h3>
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{user.role === 'admin' ? 'red' : user.role === 'user' ? 'blue' : 'gray'}-100 text-{user.role === 'admin' ? 'red' : user.role === 'user' ? 'blue' : 'gray'}-800">
                    {user.role}
                  </span>
                  {#if !user.isActive}
                    <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  {/if}
                </div>
                <p class="text-sm text-gray-600">{user.email}</p>
                <p class="text-xs text-gray-500">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div class="flex space-x-2">
                <button 
                  on:click={() => openEditModal(user)}
                  class="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button 
                  on:click={() => deleteUser(user.id)}
                  class="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<!-- Create User Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border dark:border-gray-600 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
      <h3 class="text-lg font-bold text-gray-900 mb-4">Create New User</h3>
      
      <form on:submit|preventDefault={createUser} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Username</label>
          <input 
            type="text" 
            bind:value={newUser.username}
            required
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            bind:value={newUser.password}
            required
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            bind:value={newUser.email}
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">Role</label>
          <select 
            bind:value={newUser.role}
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="viewer">Viewer</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            {#each availablePermissions as permission}
              <label class="flex items-center">
                <input 
                  type="checkbox" 
                  checked={newUser.permissions.includes(permission)}
                  on:change={() => togglePermission(permission, newUser.permissions)}
                  class="mr-2"
                />
                <span class="text-sm">{permission}</span>
              </label>
            {/each}
          </div>
        </div>
        
        <div class="flex justify-end space-x-2">
          <button 
            type="button"
            on:click={() => { showCreateModal = false; resetNewUser(); }}
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && editingUser}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border dark:border-gray-600 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
      <h3 class="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
      
      <form on:submit|preventDefault={updateUser} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Username</label>
          <input 
            type="text" 
            bind:value={editingUser.username}
            required
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            bind:value={editingUser.email}
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">Role</label>
          <select 
            bind:value={editingUser.role}
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="viewer">Viewer</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label class="flex items-center">
            <input 
              type="checkbox" 
              bind:checked={editingUser.isActive}
              class="mr-2"
            />
            <span class="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            {#each availablePermissions as permission}
              <label class="flex items-center">
                <input 
                  type="checkbox" 
                  checked={editingUser?.permissions.includes(permission) || false}
                  on:change={() => editingUser && togglePermission(permission, editingUser.permissions)}
                  class="mr-2"
                />
                <span class="text-sm">{permission}</span>
              </label>
            {/each}
          </div>
        </div>
        
        <div class="flex justify-end space-x-2">
          <button 
            type="button"
            on:click={() => { showEditModal = false; editingUser = null; }}
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}