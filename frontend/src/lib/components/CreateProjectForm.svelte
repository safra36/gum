<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import {
        Plus,
        Minus,
        Save,
        Folder,
        Route,
        List,
        Code,
    } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";
    import type { Project } from "$lib/types";
    import { PUBLIC_BASE_URL } from "$env/static/public";

    const dispatch = createEventDispatcher<{ projectCreated: Project }>();

    let title = "";
    let working_dir = "";
    let stagingConfig = {
        route: "",
        args: "",
        stages: [{ script: "", stageId: "" }],
    };

    function addStage() {
        stagingConfig.stages = [
            ...stagingConfig.stages,
            { script: "", stageId: "" },
        ];
    }

    function removeStage(index: number) {
        stagingConfig.stages = stagingConfig.stages.filter(
            (_, i) => i !== index,
        );
    }

    async function handleSubmit() {
        const projectData = {
            title,
            working_dir,
            stagingConfig: {
                ...stagingConfig,
                args: stagingConfig.args
                    ? stagingConfig.args.split(",").map((arg) => arg.trim())
                    : [],
            },
        };

        try {
            const response = await fetch(PUBLIC_BASE_URL + "/project", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(projectData),
            });

            if (!response.ok) {
                throw new Error("Failed to create project");
            }

            const result = await response.json();
            dispatch("projectCreated", result.project);

            // Reset form
            title = "";
            working_dir = "";
            stagingConfig = {
                route: "",
                args: "",
                stages: [{ script: "", stageId: "" }],
            };
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project. Please try again.");
        }
    }

    function autoExpand(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }

    onMount(() => {
        document.querySelectorAll("textarea").forEach((textarea) => {
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        });
    });
</script>

<form
    on:submit|preventDefault={handleSubmit}
    class="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 max-w-5xl mx-auto"
    in:fade={{ duration: 300, delay: 300 }}
>
    <h2 class="text-3xl font-bold mb-6 text-gray-800 flex items-center">
        <Folder class="mr-3 text-blue-500" size={28} />
        Create New Project
    </h2>

    <div class="flex flex-wrap -mx-3">
        <div
            class="w-full md:w-1/2 px-3 mb-6"
            in:fly={{ y: 20, duration: 300, delay: 400 }}
        >
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

        <div
            class="w-full md:w-1/2 px-3 mb-6"
            in:fly={{ y: 20, duration: 300, delay: 500 }}
        >
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

    <div class="mb-6" in:fly={{ y: 20, duration: 300, delay: 600 }}>
        <h3 class="text-xl font-bold mb-4 text-gray-800 flex items-center">
            <Route class="mr-2 text-green-500" size={24} />
            Staging Configuration
        </h3>
        <div class="border border-gray-200 p-4 mb-4 rounded-lg bg-gray-50">
            <div class="flex flex-wrap -mx-3">
                <div class="w-full md:w-1/2 px-3 mb-4">
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

                <div class="w-full md:w-1/2 px-3 mb-4">
                    <label
                        class="block text-gray-700 text-sm font-bold mb-2"
                        for="args"
                    >
                        Arguments (comma-separated, optional)
                    </label>
                    <input
                        class="shadow-sm appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
                        id="args"
                        type="text"
                        bind:value={stagingConfig.args}
                    />
                </div>
            </div>

            <h4 class="text-lg font-bold mb-3 text-gray-800 flex items-center">
                <List class="mr-2 text-purple-500" size={20} />
                Stages
            </h4>
            {#each stagingConfig.stages as stage, stageIndex}
                <div
                    class="border border-gray-200 p-3 mb-3 rounded-lg bg-white"
                    in:fly={{ y: 20, duration: 300 }}
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
                            rows="1"
                            required
                            style="background-color: #282c34; color: #abb2bf; min-height: 2.5rem; resize: none; overflow: hidden;"
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
                        <div class="flex justify-end">
                            <button
                                type="button"
                                class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full inline-flex items-center text-sm transition-colors duration-200"
                                on:click={() => removeStage(stageIndex)}
                            >
                                <Minus size={14} class="mr-1" />
                                Remove Stage
                            </button>
                        </div>
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
            Create Project
        </button>
    </div>
</form>
