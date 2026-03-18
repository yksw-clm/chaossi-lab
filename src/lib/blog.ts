import type { Component } from 'svelte';

type BlogMetadata = {
	title: string;
	date: string;
	excerpt: string;
	categories: string[];
};

type BlogModule = {
	default: Component;
	metadata?: Partial<BlogMetadata>;
};

export type BlogPostSummary = BlogMetadata & {
	slug: string;
};

export type BlogPostDetail = BlogPostSummary & {
	component: Component;
};

const postModules = import.meta.glob('/src/lib/posts/*.md', { eager: true }) as Record<
	string,
	BlogModule
>;

const normalizeCategory = (value: string) => value.trim().toLowerCase();

const slugFromPath = (path: string) => path.split('/').pop()?.replace(/\.md$/, '') ?? '';

const toSummary = (path: string, postModule: BlogModule): BlogPostSummary => {
	const slug = slugFromPath(path);
	const metadata = postModule.metadata ?? {};

	return {
		slug,
		title: metadata.title ?? slug,
		date: metadata.date ?? '1970-01-01',
		excerpt: metadata.excerpt ?? '',
		categories: (metadata.categories ?? []).map(normalizeCategory)
	};
};

export const getAllPosts = (): BlogPostSummary[] => {
	const posts = Object.entries(postModules)
		.map(([path, postModule]) => toSummary(path, postModule))
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return posts;
};

export const getPostsByCategory = (category: string): BlogPostSummary[] => {
	const normalized = normalizeCategory(category);
	return getAllPosts().filter((post) => post.categories.includes(normalized));
};

export const getPostBySlug = (slug: string): BlogPostDetail | null => {
	for (const [path, postModule] of Object.entries(postModules)) {
		const summary = toSummary(path, postModule);

		if (summary.slug === slug) {
			return {
				...summary,
				component: postModule.default
			};
		}
	}

	return null;
};
