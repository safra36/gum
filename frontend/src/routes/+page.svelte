<script lang="ts">
	import { onMount } from "svelte";
	import { authToken } from "../stores"
	import { loginUser, verifyUser } from "$lib/services/api";
	import { goto } from "$app/navigation";
	import { Loader2, AlertCircle } from "lucide-svelte";

	let username = "";
	let password = "";
	let loading = false;
	let error = "";

	onMount(async () => {
		try {
			await verifyUser();
			goto("/manage")
		} catch(e) {
			$authToken = "";
		}
	})

	async function login() {
		if(!username || !password) {
			error = "Username and password are required";
			return;
		}

		loading = true;
		error = "";

		try {
			await loginUser({
				password,
				username
			})
			goto("/manage")
		} catch(e) {
			error = "Invalid username or password";
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			login();
		}
	}
</script>

<section class="bg-gray-50 dark:bg-gray-900 bg-[url('/login.jpg')] bg-cover">
	<div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
		<div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
			<div class="p-6 space-y-4 md:space-y-6 sm:p-8">
				<div class="text-center">
					<h1 class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
						GUM Deployment Panel
					</h1>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
						Sign in to your account
					</p>
				</div>

				{#if error}
					<div class="flex items-center p-4 mb-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800">
						<AlertCircle class="flex-shrink-0 inline w-4 h-4 mr-3" />
						{error}
					</div>
				{/if}

				<!-- Default Credentials Info -->
				<div class="p-4 mb-4 text-sm text-blue-800 border border-blue-300 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-800">
					<div class="font-medium">Default Admin Credentials:</div>
					<div class="mt-1">Username: <code class="bg-blue-100 dark:bg-blue-900 px-1 rounded">admin</code></div>
					<div>Password: <code class="bg-blue-100 dark:bg-blue-900 px-1 rounded">admin123</code></div>
				</div>

				<form class="space-y-4 md:space-y-6" on:submit|preventDefault={login}>
					<div>
						<label for="username" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
							Username
						</label>
						<input
							type="text"
							name="username"
							id="username"
							class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="Enter your username"
							bind:value={username}
							on:keypress={handleKeyPress}
							disabled={loading}
							required
						/>
					</div>
					<div>
						<label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
							Password
						</label>
						<input
							type="password"
							name="password"
							id="password"
							bind:value={password}
							placeholder="Enter your password"
							class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							on:keypress={handleKeyPress}
							disabled={loading}
							required
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
					>
						{#if loading}
							<Loader2 class="animate-spin -ml-1 mr-3 h-5 w-5" />
							Signing in...
						{:else}
							Sign in
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
</section>