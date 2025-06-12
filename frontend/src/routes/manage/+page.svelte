<script lang="ts">
    import ProjectList from "$lib/components/ProjectList.svelte";
    import ProjectDetails from "$lib/components/ProjectDetails.svelte";
    import EnhancedProjectForm from "$lib/components/EnhancedProjectForm.svelte";
    import HealthCheck from "$lib/components/HealthCheck.svelte";
    import UserManagement from "$lib/components/UserManagement.svelte";
    import ExecutionHistory from "$lib/components/ExecutionHistory.svelte";
    import ThemeToggle from "$lib/components/ThemeToggle.svelte";
    import LoadingSkeleton from "$lib/components/LoadingSkeleton.svelte";
    import PasswordChangeModal from "$lib/components/PasswordChangeModal.svelte";
    import type { Project } from "$lib/types";
    import { fetchProjects, verifyUser } from "$lib/services/api";
    import { onMount } from "svelte";
    import { Loader2, Plus, X, Users, History, FolderOpen, Search, Filter, LogOut, Menu } from "lucide-svelte";
	import { authToken } from "../../stores";
	import { goto } from "$app/navigation";
    import { toast } from "$lib/stores/toast";

    // Simple debounce implementation to avoid lodash dependency
    function debounce(func: Function, wait: number) {
        let timeout: number;
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    let projects: Project[] = [];
    let filteredProjects: Project[] = [];
    let selectedProject: Project | null = null;
    let loading = true;
    let showCreateForm = false;
    let showUpdateForm = false;
    let currentView = 'projects'; // 'projects', 'users', 'history'
    let currentUser: any = null;
    let searchQuery = '';
    let showMobileMenu = false;
    let showFilters = false;
    let sortBy = 'name'; // 'name', 'created', 'updated'
    let sortOrder = 'asc'; // 'asc', 'desc'
    let showPasswordModal = false;

    // Reactive search and filtering
    $: if (projects && searchQuery !== undefined) {
        filterProjects();
    }

    const debouncedSearch = debounce(() => {
        filterProjects();
    }, 300);

    $: if (searchQuery) {
        debouncedSearch();
    }

    onMount(async () => {
        try {
			const userResponse = await verifyUser();
            if (typeof userResponse === 'string') {
                try {
                    const userData = JSON.parse(userResponse);
                    currentUser = userData.user;
                } catch (err) {
                    console.error('Error parsing user data:', err);
                }
            }
            await loadProjects();
		} catch(e) {
            console.log("Authentication failed", e);
            toast("Authentication failed. Please login again.", "error");
            authToken.set("");
			goto("/")
		}
    });

    async function loadProjects() {
        loading = true;
        try {
            projects = await fetchProjects();
            filterProjects();
            toast("Projects loaded successfully", "success");
        } catch (error) {
            console.error("Failed to fetch projects:", error);
            toast("Failed to load projects", "error");
        } finally {
            loading = false;
        }
    }

    function filterProjects() {
        if (!projects) return;
        
        let result = [...projects];
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(project => 
                project.title.toLowerCase().includes(query) ||
                project.working_dir.toLowerCase().includes(query) ||
                project.stagingConfig?.route.toLowerCase().includes(query)
            );
        }
        
        // Apply sorting
        result.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'created':
                    aValue = new Date(a.createdAt || 0).getTime();
                    bValue = new Date(b.createdAt || 0).getTime();
                    break;
                case 'updated':
                    aValue = new Date(a.updatedAt || 0).getTime();
                    bValue = new Date(b.updatedAt || 0).getTime();
                    break;
                default:
                    return 0;
            }
            
            if (sortOrder === 'desc') {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            } else {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            }
        });
        
        filteredProjects = result;
    }

    function handleProjectSelect(event: CustomEvent<Project>) {
        selectedProject = event.detail;
        showCreateForm = false;
        showUpdateForm = false;
        showMobileMenu = false;
    }

    function handleProjectCreated(event: CustomEvent<Project>) {
        projects = [...projects, event.detail];
        selectedProject = event.detail;
        showCreateForm = false;
        filterProjects();
        toast("Project created successfully!", "success");
    }

    function handleProjectUpdated(event: CustomEvent<Project>) {
        const updatedProject = event.detail;
        projects = projects.map((p) =>
            p.id === updatedProject.id ? updatedProject : p,
        );
        selectedProject = updatedProject;
        showUpdateForm = false;
        filterProjects();
        toast("Project updated successfully!", "success");
    }

    function toggleCreateForm() {
        showCreateForm = !showCreateForm;
        if (showCreateForm) {
            selectedProject = null;
            showUpdateForm = false;
        }
        showMobileMenu = false;
    }

    function toggleUpdateForm() {
        showUpdateForm = !showUpdateForm;
        showCreateForm = false;
    }

    function switchView(view: string) {
        currentView = view;
        selectedProject = null;
        showCreateForm = false;
        showUpdateForm = false;
        showMobileMenu = false;
    }

    function logout() {
        authToken.set("");
        toast("Logged out successfully", "info");
        goto("/");
    }

    function handleKeydown(event: KeyboardEvent) {
        // Global keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    document.getElementById('search-input')?.focus();
                    break;
                case 'n':
                    event.preventDefault();
                    if (currentView === 'projects') {
                        toggleCreateForm();
                    }
                    break;
            }
        }
        
        // Escape key
        if (event.key === 'Escape') {
            if (showCreateForm || showUpdateForm) {
                showCreateForm = false;
                showUpdateForm = false;
            } else if (showMobileMenu) {
                showMobileMenu = false;
            }
        }
    }

    function announceViewChange(view: string) {
        const announcement = `Switched to ${view} view`;
        // Create a temporary element for screen readers
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.textContent = announcement;
        document.body.appendChild(announcer);
        setTimeout(() => document.body.removeChild(announcer), 1000);
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <!-- Skip to main content link for screen readers -->
    <a 
        href="#main-content" 
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
    >
        Skip to main content
    </a>

    <!-- Navigation Header -->
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700" role="banner">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- Logo and Title -->
                <div class="flex items-center">
                    <button
                        class="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        on:click={() => showMobileMenu = !showMobileMenu}
                        aria-label="Toggle mobile menu"
                        aria-expanded={showMobileMenu}
                    >
                        <Menu size={20} />
                    </button>
                    <h1 class="ml-2 md:ml-0 text-xl font-bold text-gray-900 dark:text-white">
                        GUM Deployment Panel
                    </h1>
                </div>

                <!-- Desktop Navigation -->
                <div class="hidden md:flex items-center space-x-6">
                    <!-- Search -->
                    {#if currentView === 'projects'}
                        <div class="relative">
                            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                            <input
                                id="search-input"
                                type="text"
                                placeholder="Search projects... (Ctrl+K)"
                                bind:value={searchQuery}
                                class="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                aria-label="Search projects"
                            />
                        </div>
                    {/if}

                    <!-- Theme Toggle -->
                    <ThemeToggle />

                    <!-- Health Check -->
                    <HealthCheck />

                    <!-- User Info -->
                    {#if currentUser}
                        <div class="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
                            <div class="text-right">
                                <div class="font-medium">{currentUser.username}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser.role}</div>
                            </div>
                            
                            <!-- Password change button for authenticated users -->
                            <button
                                on:click={() => showPasswordModal = true}
                                class="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                aria-label="Change Password"
                                title="Change Password"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </button>
                            
                            <button
                                on:click={logout}
                                class="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                aria-label="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Mobile Menu -->
        {#if showMobileMenu}
            <div class="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div class="px-4 py-3 space-y-2">
                    {#if currentView === 'projects'}
                        <div class="relative">
                            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                bind:value={searchQuery}
                                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    {/if}
                    
                    <div class="flex items-center justify-between pt-2">
                        <div class="flex items-center space-x-4">
                            <ThemeToggle />
                            <HealthCheck />
                        </div>
                        {#if currentUser}
                            <div class="flex items-center space-x-3">
                                <button
                                    on:click={() => { showPasswordModal = true; showMobileMenu = false; }}
                                    class="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    <span class="text-sm">Change Password</span>
                                </button>
                                <button
                                    on:click={logout}
                                    class="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                >
                                    <LogOut size={16} />
                                    <span class="text-sm">Logout</span>
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </nav>

    <!-- Tab Navigation -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav class="flex space-x-8 overflow-x-auto" role="tablist" aria-label="Main navigation">
                <button
                    class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors {currentView === 'projects' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'}"
                    on:click={() => { switchView('projects'); announceViewChange('projects'); }}
                    role="tab"
                    aria-selected={currentView === 'projects'}
                    aria-controls="projects-panel"
                >
                    <FolderOpen class="inline mr-2" size={16} />
                    Projects
                </button>
                <button
                    class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors {currentView === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'}"
                    on:click={() => { switchView('history'); announceViewChange('execution history'); }}
                    role="tab"
                    aria-selected={currentView === 'history'}
                    aria-controls="history-panel"
                >
                    <History class="inline mr-2" size={16} />
                    Execution History
                </button>
                {#if currentUser?.role === 'admin'}
                    <button
                        class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors {currentView === 'users' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'}"
                        on:click={() => { switchView('users'); announceViewChange('user management'); }}
                        role="tab"
                        aria-selected={currentView === 'users'}
                        aria-controls="users-panel"
                    >
                        <Users class="inline mr-2" size={16} />
                        User Management
                    </button>
                {/if}
            </nav>
        </div>
    </div>

    <!-- Main Content -->
    <main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Projects View -->
        {#if currentView === 'projects'}
            <div id="projects-panel" role="tabpanel" aria-labelledby="projects-tab">
                {#if loading}
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-1">
                            <LoadingSkeleton type="list" count={5} />
                        </div>
                        <div class="lg:col-span-2">
                            <LoadingSkeleton type="card" count={1} height="400px" />
                        </div>
                    </div>
                {:else}
                    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Projects</h2>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {filteredProjects.length} of {projects.length} projects
                                {searchQuery ? `matching "${searchQuery}"` : ''}
                            </p>
                        </div>
                        
                        <div class="flex items-center space-x-3">
                            <!-- Filters -->
                            <div class="relative">
                                <button
                                    class="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    on:click={() => showFilters = !showFilters}
                                    aria-label="Toggle filters"
                                    aria-expanded={showFilters}
                                >
                                    <Filter size={16} />
                                    <span class="hidden sm:block">Sort</span>
                                </button>
                                
                                {#if showFilters}
                                    <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-10">
                                        <div class="py-1">
                                            <div class="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sort by</div>
                                            <button
                                                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {sortBy === 'name' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                                                on:click={() => { sortBy = 'name'; filterProjects(); showFilters = false; }}
                                            >
                                                Name
                                            </button>
                                            <button
                                                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {sortBy === 'created' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                                                on:click={() => { sortBy = 'created'; filterProjects(); showFilters = false; }}
                                            >
                                                Created Date
                                            </button>
                                            <button
                                                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {sortBy === 'updated' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                                                on:click={() => { sortBy = 'updated'; filterProjects(); showFilters = false; }}
                                            >
                                                Updated Date
                                            </button>
                                            <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                                            <button
                                                class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                on:click={() => { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; filterProjects(); }}
                                            >
                                                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                            
                            <!-- Create Project Button -->
                            <button
                                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                on:click={toggleCreateForm}
                                disabled={loading}
                                aria-label={showCreateForm ? 'Cancel creating project' : 'Create new project'}
                            >
                                {#if showCreateForm}
                                    <X size={16} class="mr-2" />
                                    Cancel
                                {:else}
                                    <Plus size={16} class="mr-2" />
                                    New Project
                                {/if}
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Project List -->
                        <div class="lg:col-span-1">
                            <ProjectList
                                projects={filteredProjects}
                                selectedProjectId={selectedProject?.id ?? null}
                                on:selectProject={handleProjectSelect}
                            />
                        </div>

                        <!-- Main Content Area -->
                        <div class="lg:col-span-2">
                            {#if showCreateForm}
                                <EnhancedProjectForm
                                    on:projectCreated={handleProjectCreated}
                                    on:cancel={() => showCreateForm = false}
                                />
                            {:else if showUpdateForm && selectedProject}
                                <EnhancedProjectForm
                                    project={selectedProject}
                                    isEditing={true}
                                    on:projectUpdated={handleProjectUpdated}
                                    on:cancel={() => showUpdateForm = false}
                                />
                            {:else if selectedProject}
                                <ProjectDetails
                                    project={selectedProject}
                                    onEdit={toggleUpdateForm}
                                />
                            {:else}
                                <div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
                                    <FolderOpen class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        No project selected
                                    </h3>
                                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                                        Choose a project from the list to view details or create a new one.
                                    </p>
                                    <button
                                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                        on:click={toggleCreateForm}
                                    >
                                        <Plus size={16} class="mr-2" />
                                        Create Your First Project
                                    </button>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        {:else if currentView === 'history'}
            <div id="history-panel" role="tabpanel" aria-labelledby="history-tab">
                <ExecutionHistory />
            </div>
        {:else if currentView === 'users' && currentUser?.role === 'admin'}
            <div id="users-panel" role="tabpanel" aria-labelledby="users-tab">
                <UserManagement />
            </div>
        {/if}
    </main>
</div>

<!-- Password Change Modal -->
<PasswordChangeModal 
    bind:showModal={showPasswordModal} 
    on:passwordChanged={() => {
        toast("Password changed successfully", "success");
        showPasswordModal = false;
    }}
/>

<style>
    /* Screen reader only content */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .sr-only:focus {
        position: static;
        width: auto;
        height: auto;
        padding: 0.5rem 1rem;
        margin: 0;
        overflow: visible;
        clip: auto;
        white-space: normal;
    }

    /* Custom scrollbar for webkit browsers */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: #f3f4f6;
    }

    ::-webkit-scrollbar-thumb {
        background: #9ca3af;
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }

    /* Dark mode scrollbar */
    :global(.dark) ::-webkit-scrollbar-track {
        background: #1f2937;
    }

    :global(.dark) ::-webkit-scrollbar-thumb {
        background: #4b5563;
    }

    :global(.dark) ::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }
</style>