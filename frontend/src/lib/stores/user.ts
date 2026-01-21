import { writable, derived } from 'svelte/store';
import { authToken } from '../../stores';
import { api } from '../services/api';

export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  isMasterAdmin?: boolean;
}

export interface UserPermissions {
  canEdit: boolean;
  canExecute: boolean;
  canViewLogs: boolean;
  canViewExecutionHistory: boolean;
  canCreateProject: boolean;
  canDeleteProject: boolean;
  canManageUsers: boolean;
  canSetCron: boolean;
  canViewGitLogs: boolean;
  canSwitchBranch: boolean;
  canRevertCommit: boolean;
  canCreateBranch: boolean;
  canDeleteBranch: boolean;
  canMergeBranch: boolean;
  canGitPush: boolean;
  canGitPull: boolean;
  canCreateTag: boolean;
  canDeleteTag: boolean;
  canGitStash: boolean;
  canGitReset: boolean;
}

// User store
export const user = writable<User | null>(null);

// Permission store derived from actual backend permissions
export const permissions = derived(user, ($user): UserPermissions => {
  if (!$user || !$user.permissions) {
    return {
      canEdit: false,
      canExecute: false,
      canViewLogs: false,
      canViewExecutionHistory: false,
      canCreateProject: false,
      canDeleteProject: false,
      canManageUsers: false,
      canSetCron: false,
      canViewGitLogs: false,
      canSwitchBranch: false,
      canRevertCommit: false,
      canCreateBranch: false,
      canDeleteBranch: false,
      canMergeBranch: false,
      canGitPush: false,
      canGitPull: false,
      canCreateTag: false,
      canDeleteTag: false,
      canGitStash: false,
      canGitReset: false,
    };
  }

  const userPermissions = $user.permissions;
  
  // Admin users have all permissions (match backend behavior)
  if ($user.role === 'admin') {
      return {
          canEdit: true,
          canExecute: true,
          canViewLogs: true,
          canViewExecutionHistory: true,
          canCreateProject: true,
          canDeleteProject: true,
          canManageUsers: true,
          canSetCron: true,
          canViewGitLogs: true,
          canSwitchBranch: true,
          canRevertCommit: true,
          canCreateBranch: true,
          canDeleteBranch: true,
          canMergeBranch: true,
          canGitPush: true,
          canGitPull: true,
          canCreateTag: true,
          canDeleteTag: true,
          canGitStash: true,
          canGitReset: true,
      };
  }
 
  // Map backend permissions (snake_case) to frontend permissions for non-admin users
  return {
      canEdit: userPermissions.includes('editing_project'),
      canExecute: userPermissions.includes('execute_script'),
      canViewLogs: userPermissions.includes('view_execution_logs'),
      canViewExecutionHistory: userPermissions.includes('view_execution_history'),
      canCreateProject: userPermissions.includes('creating_project'),
      canDeleteProject: userPermissions.includes('delete_project'),
      canManageUsers: userPermissions.includes('manage_users'),
      canSetCron: userPermissions.includes('set_cron'),
      canViewGitLogs: userPermissions.includes('get_git_log'),
      canSwitchBranch: userPermissions.includes('switch_branch'),
      canRevertCommit: userPermissions.includes('revert_commit'),
      canCreateBranch: userPermissions.includes('create_branch'),
      canDeleteBranch: userPermissions.includes('delete_branch'),
      canMergeBranch: userPermissions.includes('merge_branch'),
      canGitPush: userPermissions.includes('git_push'),
      canGitPull: userPermissions.includes('git_pull'),
      canCreateTag: userPermissions.includes('create_tag'),
      canDeleteTag: userPermissions.includes('delete_tag'),
      canGitStash: userPermissions.includes('git_stash'),
      canGitReset: userPermissions.includes('git_reset'),
  };
});

// Auth state derived from authToken and user
export const isAuthenticated = derived(
  [authToken, user], 
  ([$authToken, $user]) => !!$authToken && !!$user
);

// Initialize user data when auth token changes
authToken.subscribe(async (token) => {
  console.log('Auth token changed:', token ? 'present' : 'missing');
  
  if (token) {
    try {
      // First verify the token is valid
      await api.verifyUser();
      
      // Then get full user profile with permissions
      const userProfile = await api.getUserProfile();
      console.log('User profile loaded:', userProfile);
      
      if (userProfile) {
        user.set(userProfile);
      } else {
        console.error('Invalid user profile structure:', userProfile);
        user.set(null);
        authToken.set('');
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      user.set(null);
      authToken.set('');
    }
  } else {
    console.log('No token, clearing user');
    user.set(null);
  }
});

// Also listen to user changes to debug permissions
user.subscribe((currentUser) => {
  console.log('User changed:', currentUser);
  if (currentUser) {
    console.log('User permissions array:', currentUser.permissions);
    console.log('User role:', currentUser.role);
  }
});

permissions.subscribe((currentPermissions) => {
  console.log('Permissions changed:', currentPermissions);
  console.log('Permission breakdown:', {
    canEdit: currentPermissions.canEdit,
    canExecute: currentPermissions.canExecute,
    canCreateProject: currentPermissions.canCreateProject,
    canViewGitLogs: currentPermissions.canViewGitLogs,
    canCreateBranch: currentPermissions.canCreateBranch,
    canDeleteBranch: currentPermissions.canDeleteBranch,
    canMergeBranch: currentPermissions.canMergeBranch,
    canGitPush: currentPermissions.canGitPush,
    canGitPull: currentPermissions.canGitPull
  });
});

// Helper functions
export const logout = () => {
  authToken.set('');
  user.set(null);
};

export const hasPermission = (permission: keyof UserPermissions): boolean => {
  let currentPermissions: UserPermissions = {
    canEdit: false,
    canExecute: false,
    canViewLogs: false,
    canViewExecutionHistory: false,
    canCreateProject: false,
    canDeleteProject: false,
    canManageUsers: false,
    canSetCron: false,
    canViewGitLogs: false,
    canSwitchBranch: false,
    canRevertCommit: false,
    canCreateBranch: false,
    canDeleteBranch: false,
    canMergeBranch: false,
    canGitPush: false,
    canGitPull: false,
    canCreateTag: false,
    canDeleteTag: false,
    canGitStash: false,
    canGitReset: false,
  };
  
  const unsubscribe = permissions.subscribe(p => {
    currentPermissions = p;
  });
  unsubscribe();
  
  return currentPermissions[permission];
};