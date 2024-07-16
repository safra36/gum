<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { Plus, Minus, Save, Folder, Route, List } from "lucide-svelte";
    import type { Project, Stage, StagingConfig } from "$lib/types";
    import { updateProject } from "../services/api";

    export let project: Project;

    const dispatch = createEventDispatcher<{ projectUpdated: Project }>();

    let title = project.title;
    let working_dir = project.working_dir;
    let stagingConfig: Omit<StagingConfig, "args"> & { args: string } = {
        ...project.stagingConfigs,
        args: project.stagingConfigs.args.join(", "),
    };

    function addStage() {
        stagingConfig = {
            ...stagingConfig,
            stages: [...stagingConfig.stages, { script: "", stageId: "" }],
        };
    }

    function removeStage(index: number) {
        stagingConfig = {
            ...stagingConfig,
            stages: stagingConfig.stages.filter((_, i) => i !== index),
        };
    }

    async function handleSubmit() {
        const projectData: Partial<Project> = {
            title,
            working_dir,
            stagingConfigs: {
                ...stagingConfig,
                args: stagingConfig.args.split(",").map((arg) => arg.trim()),
                stages: stagingConfig.stages.map((stage) => ({
                    ...stage,
                    id: stage.id,
                })),
            },
        };

        try {
            const updatedProject = await updateProject(project.id, projectData);
            dispatch("projectUpdated", updatedProject);
        } catch (error) {
            console.error("Error updating project:", error);
            alert("Failed to update project. Please try again.");
        }
    }

    function autoExpand(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        autoExpandTextarea(textarea);
    }

    function autoExpandTextarea(textarea: HTMLTextAreaElement) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }

    onMount(() => {
        // Auto-expand all textareas on initial render
        document.querySelectorAll("textarea").forEach((textarea) => {
            autoExpandTextarea(textarea as HTMLTextAreaElement);
        });
    });
</script>

<form
    on:submit|preventDefault={handleSubmit}
    class="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 max-w-5xl mx-auto"
>
    <h2 class="text-3xl font-bold mb-6 text-gray-800 flex items-center">
        <Folder class="mr-3 text-blue-500" size={28} />
        Update Project
    </h2>

    <div class="flex flex-wrap -mx-3">
        <div class="w-full md:w-1/2 px-3 mb-6">
            <label
                class="block text-gray-700 text-sm font-bold mb-2"
                for="title"
            >
                Project Title
            </label>
            <input
                class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                id="title"
                type="text"
                bind:value={title}
                required
            />
        </div>

        <div class="w-full md:w-1/2 px-3 mb-6">
            <label
                class="block text-gray-700 text-sm font-bold mb-2"
                for="working_dir"
            >
                Working Directory
            </label>
            <input
                class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                id="working_dir"
                type="text"
                bind:value={working_dir}
                required
            />
        </div>
    </div>

    <div class="mb-6">
        <h3 class="text-xl font-bold mb-4 text-gray-800 flex items-center">
            <Route class="mr-2 text-green-500" size={24} />
            Staging Configuration
        </h3>
        <div class="border border-gray-200 p-4 mb-4 rounded-lg bg-gray-50">
            <div class="mb-4">
                <label
                    class="block text-gray-700 text-sm font-bold mb-2"
                    for="route"
                >
                    Route
                </label>
                <input
                    class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
                    id="route"
                    type="text"
                    bind:value={stagingConfig.route}
                    required
                />
            </div>

            <div class="mb-4">
                <label
                    class="block text-gray-700 text-sm font-bold mb-2"
                    for="args"
                >
                    Arguments (comma-separated)
                </label>
                <input
                    class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
                    id="args"
                    type="text"
                    bind:value={stagingConfig.args}
                    required
                />
            </div>

            <h4 class="text-lg font-bold mb-3 text-gray-800 flex items-center">
                <List class="mr-2 text-purple-500" size={20} />
                Stages
            </h4>
            {#each stagingConfig.stages as stage, stageIndex}
                <div
                    class="border border-gray-200 p-3 mb-3 rounded-lg bg-white"
                >
                    <div class="mb-3">
                        <label
                            class="block text-gray-700 text-sm font-bold mb-2"
                            for={`script-${stageIndex}`}
                        >
                            Script
                        </label>

                        <textarea
                            class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200 font-mono"
                            id={`script-${stageIndex}`}
                            bind:value={stage.script}
                            on:input={autoExpand}
                            use:autoExpandTextarea
                            rows="1"
                            required
                            style="background-color: #282c34; color: #abb2bf; min-height: 2.5rem; resize: vertical; overflow: hidden;"
                        ></textarea>
                    </div>

                    <div class="mb-3">
                        <label
                            class="block text-gray-700 text-sm font-bold mb-2"
                            for={`stageId-${stageIndex}`}
                        >
                            Stage ID
                        </label>
                        <input
                            class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
                            id={`stageId-${stageIndex}`}
                            type="text"
                            bind:value={stage.stageId}
                            required
                        />
                    </div>

                    {#if stagingConfig.stages.length > 1}
                        <button
                            type="button"
                            class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full inline-flex items-center text-sm transition-colors duration-200"
                            on:click={() => removeStage(stageIndex)}
                        >
                            <Minus size={14} class="mr-1" />
                            Remove Stage
                        </button>
                    {/if}
                </div>
            {/each}

            <button
                type="button"
                class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-full inline-flex items-center text-sm transition-colors duration-200"
                on:click={addStage}
            >
                <Plus size={14} class="mr-2" />
                Add Stage
            </button>
        </div>
    </div>

    <div class="flex items-center justify-end mt-6">
        <button
            class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-colors duration-200 inline-flex items-center"
            type="submit"
        >
            <Save size={18} class="mr-2" />
            Update Project
        </button>
    </div>
</form>
