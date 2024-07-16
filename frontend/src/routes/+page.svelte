<script lang="ts">
    import ProjectList from "$lib/components/ProjectList.svelte";
    import ProjectDetails from "$lib/components/ProjectDetails.svelte";
    import CreateProjectForm from "$lib/components/CreateProjectForm.svelte";
    import UpdateProjectForm from "$lib/components/UpdateProjectForm.svelte";
    import HealthCheck from "$lib/components/HealthCheck.svelte";
    import type { Project } from "$lib/types";
    import { fetchProjects } from "$lib/services/api";
    import { onMount } from "svelte";
    import { Loader2, Plus, X } from "lucide-svelte";

    let projects: Project[] = [];
    let selectedProject: Project | null = null;
    let loading = true;
    let showCreateForm = false;
    let showUpdateForm = false;

    onMount(async () => {
        await loadProjects();
    });

    async function loadProjects() {
        loading = true;
        try {
            projects = await fetchProjects();
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        } finally {
            loading = false;
        }
    }

    function handleProjectSelect(event: CustomEvent<Project>) {
        selectedProject = event.detail;
        showCreateForm = false;
        showUpdateForm = false;
    }

    function handleProjectCreated(event: CustomEvent<Project>) {
        projects = [...projects, event.detail];
        selectedProject = event.detail;
        showCreateForm = false;
    }

    function handleProjectUpdated(event: CustomEvent<Project>) {
        const updatedProject = event.detail;
        projects = projects.map((p) =>
            p.id === updatedProject.id ? updatedProject : p,
        );
        selectedProject = updatedProject;
        showUpdateForm = false;
    }

    function toggleCreateForm() {
        showCreateForm = !showCreateForm;
        if (showCreateForm) {
            selectedProject = null;
            showUpdateForm = false;
        }
    }

    function toggleUpdateForm() {
        showUpdateForm = !showUpdateForm;
        showCreateForm = false;
    }
</script>

<main class="min-h-screen bg-gray-100">
    <nav class="bg-blue-600 text-white p-4 shadow-md">
        <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-3xl font-bold">Deployment Management Panel</h1>
            <div class="flex items-center space-x-4">
                <HealthCheck />
                <button
                    class="bg-white text-blue-600 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors duration-200 flex items-center"
                    on:click={toggleCreateForm}
                >
                    {#if showCreateForm}
                        <X size={20} class="mr-2" />
                        Cancel
                    {:else}
                        <Plus size={20} class="mr-2" />
                        New Project
                    {/if}
                </button>
            </div>
        </div>
    </nav>

    <div class="container mx-auto p-6">
        {#if loading}
            <div class="flex justify-center items-center h-64">
                <Loader2 class="animate-spin h-8 w-8 text-blue-600" />
            </div>
        {:else}
            <div class="flex flex-col md:flex-row gap-6">
                <div class="w-full md:w-1/3">
                    <ProjectList
                        {projects}
                        selectedProjectId={selectedProject?.id ?? null}
                        on:selectProject={handleProjectSelect}
                    />
                </div>
                <div class="w-full md:w-2/3">
                    {#if showCreateForm}
                        <CreateProjectForm
                            on:projectCreated={handleProjectCreated}
                        />
                    {:else if showUpdateForm && selectedProject}
                        <UpdateProjectForm
                            project={selectedProject}
                            on:projectUpdated={handleProjectUpdated}
                        />
                    {:else if selectedProject}
                        <ProjectDetails
                            project={selectedProject}
                            onEdit={toggleUpdateForm}
                        />
                    {:else}
                        <div
                            class="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-center h-64"
                        >
                            <svg
                                class="w-16 h-16 text-gray-400 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                ></path>
                            </svg>
                            <p class="text-xl text-gray-500">
                                Select a project to view details or create a new
                                one
                            </p>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</main>
