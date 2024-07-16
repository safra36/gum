<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { CheckCircle, XCircle, AlertCircle } from "lucide-svelte";
    import { PUBLIC_BASE_URL } from "$env/static/public";

    let status: "healthy" | "unhealthy" | "checking" = "checking";
    let intervalId: number;

    async function checkHealth() {
        try {
            const response = await fetch(PUBLIC_BASE_URL + "/health");
            if (response.ok) {
                const data = await response.json();
                status = data.status === "OK" ? "healthy" : "unhealthy";
            } else {
                status = "unhealthy";
            }
        } catch (error) {
            console.error("Health check failed:", error);
            status = "unhealthy";
        }
    }

    onMount(() => {
        checkHealth(); // Initial check
        intervalId = setInterval(checkHealth, 30000); // Check every 30 seconds
    });

    onDestroy(() => {
        if (intervalId) clearInterval(intervalId);
    });
</script>

<div class="flex items-center space-x-2" title="Backend Status">
    {#if status === "healthy"}
        <CheckCircle class="text-green-500" size={20} />
        <span class="text-sm text-green-500">Healthy</span>
    {:else if status === "unhealthy"}
        <XCircle class="text-red-500" size={20} />
        <span class="text-sm text-red-500">Unhealthy</span>
    {:else}
        <AlertCircle class="text-yellow-500" size={20} />
        <span class="text-sm text-yellow-500">Checking...</span>
    {/if}
</div>
