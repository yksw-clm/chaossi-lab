<script lang="ts">
	let { data } = $props();
</script>

<section class="px-4 py-6">
	<h2 class="text-xl font-bold">Blog</h2>
	{#if data.category}
		<p class="mt-1 text-sm text-slate-600">Category: {data.category}</p>
	{/if}

	{#if data.posts.length === 0}
		<p class="mt-4">記事がまだありません。</p>
	{:else}
		<ul class="mt-4 space-y-3">
			{#each data.posts as post (post.slug)}
				<li class="rounded-md border border-slate-200 bg-white p-4">
					<p class="text-xs text-slate-500">{post.date}</p>
					<h3 class="text-lg font-semibold">
						<a class="hover:underline" href={`/blog/${post.slug}`}>{post.title}</a>
					</h3>
					<p class="mt-1 text-sm text-slate-700">{post.excerpt}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
