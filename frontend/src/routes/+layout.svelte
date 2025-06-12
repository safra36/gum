<script>
    import "../app.css";
    import { onMount } from "svelte";
    import { theme } from "$lib/stores/theme";
    import Toast from "$lib/components/Toast.svelte";

    onMount(() => {
        // Initialize theme on app load
        theme.initializeTheme();
    });
</script>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <slot />
    <Toast />
</main>
