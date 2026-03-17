<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	let categories = ['HTML + CSS', 'JavaScript', 'TypeScript', 'React', 'C#'];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<header class="bg-sky-100 px-4 py-2">
	<h1 class="text-2xl font-bold">Chaossi Lab</h1>
	<nav class="mt-1">
		<ul class="flex">
			{#each categories as category, index (index)}
				<li class="border-l px-2 first:border-l-0 first:pl-0">{category}</li>
			{/each}
		</ul>
	</nav>
</header>

<main class="container mx-auto">
	{@render children()}
</main>
