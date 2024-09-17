


<script lang="ts">
	import { onMount } from "svelte";


	import { authToken } from "../stores"
	import { loginUser, verifyUser } from "$lib/services/api";
	import { goto } from "$app/navigation";


	let username = "";
	let password = "";

	onMount(async () => {

		try {
			await verifyUser();
			goto("/manage")
		} catch(e) {
			$authToken = "";
		}

	})



	async function login() {

		if(!username || !password) alert("username / password must not be empty")

		try {
			
			await loginUser({
				password,
				username
			})

			goto("/manage")

		} catch(e) {
			alert("error logining in")
		}

	}

</script>


<section class="bg-gray-50 dark:bg-gray-900 bg-[url('/login.jpg')] bg-cover">
	<div
		class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0"
	>

		<div
			class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700"
		>
			<div class="p-6 space-y-4 md:space-y-6 sm:p-8">
				<h1
					class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white"
				>
					Sign in to your account
				</h1>
				<form class="space-y-4 md:space-y-6" action="#">
					<div>
						<label
							for="username"
							class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
							>Your username</label
						>
						<input
							type="text"
							name="username"
							id="username"
							class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="admin"
							bind:value={username}
							required
						/>
					</div>
					<div>
						<label
							for="password"
							class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
							>Password</label
						>
						<input
							type="password"
							name="password"
							id="password"
							bind:value={password}
							placeholder="••••••••"
							class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							required
						/>
					</div>

					<button
						type="button"
						on:click={login}
						class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 focus:outline-none "
						>Sign In</button
					>
				</form>
			</div>
		</div>
	</div>
</section>
