<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const categories = [
		{ label: 'ALL', href: '/blog' },
		{ label: 'HTML + CSS', href: '/blog?category=html-css' },
		{ label: 'JavaScript', href: '/blog?category=javascript' },
		{ label: 'TypeScript', href: '/blog?category=typescript' },
		{ label: 'React', href: '/blog?category=react' },
		{ label: 'C#', href: '/blog?category=csharp' },
		{ label: 'Blog', href: '/blog?category=blog' }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<header class="bg-sky-100 px-4 py-2">
	<h1 class="text-2xl font-bold">Chaossi Lab</h1>
	<nav class="mt-1">
		<ul class="flex">
			{#each categories as category, index (index)}
				<li class="border-l px-2 first:border-l-0 first:pl-0">
					<a class="hover:underline" href={category.href}>{category.label}</a>
				</li>
			{/each}
		</ul>
	</nav>
</header>

<main class="container mx-auto">
	{@render children()}
</main>
