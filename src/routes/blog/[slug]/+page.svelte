<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
	const Content = $derived(data.post.component);
</script>

<section class="px-4 py-6">
	<p>
		<a class="text-sm text-slate-700 hover:underline" href={resolve('/blog')}>Blog一覧に戻る</a>
	</p>

	<article class="prose mt-4 max-w-none prose-slate">
		<p class="text-sm text-slate-500">{data.post.date}</p>
		<h1>{data.post.title}</h1>
		<Content />
	</article>
</section>
