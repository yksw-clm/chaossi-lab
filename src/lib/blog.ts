import type { Component } from 'svelte';
import { dev } from '$app/environment';

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

const isValidDate = (value: string): boolean => {
	const date = new Date(value);
	return !Number.isNaN(date.getTime());
};

const warnInvalidMetadata = (path: string, reason: string): void => {
	if (!dev) {
		return;
	}

	console.warn(`[blog] Invalid metadata in ${path}: ${reason}`);
};

const sanitizeMetadata = (
	path: string,
	metadata: Partial<BlogMetadata>,
	slug: string
): BlogMetadata => {
	const title = metadata.title?.trim();
	if (!title) {
		warnInvalidMetadata(path, 'missing title; falling back to slug');
	}

	const date = metadata.date?.trim();
	if (!date || !isValidDate(date)) {
		warnInvalidMetadata(path, 'missing or invalid date; falling back to 1970-01-01');
	}

	const excerpt = metadata.excerpt?.trim() ?? '';

	const categories = (metadata.categories ?? [])
		.map((value) => value.trim())
		.filter((value) => value.length > 0)
		.map(normalizeCategory);

	if ((metadata.categories ?? []).length > 0 && categories.length === 0) {
		warnInvalidMetadata(path, 'categories were empty after normalization');
	}

	return {
		title: title ?? slug,
		date: date && isValidDate(date) ? date : '1970-01-01',
		excerpt,
		categories
	};
};

const toSummary = (path: string, postModule: BlogModule): BlogPostSummary => {
	const slug = slugFromPath(path);
	const metadata = sanitizeMetadata(path, postModule.metadata ?? {}, slug);

	return {
		slug,
		title: metadata.title,
		date: metadata.date,
		excerpt: metadata.excerpt,
		categories: metadata.categories
	};
};

const allPosts = Object.entries(postModules)
	.map(([path, postModule]) => toSummary(path, postModule))
	.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const postBySlug = new Map(
	Object.entries(postModules).map(([path, postModule]) => {
		const summary = toSummary(path, postModule);
		return [summary.slug, { ...summary, component: postModule.default } satisfies BlogPostDetail];
	})
);

export const getAllPosts = (): BlogPostSummary[] => {
	return allPosts;
};

export const getPostsByCategory = (category: string): BlogPostSummary[] => {
	const normalized = normalizeCategory(category);
	return getAllPosts().filter((post) => post.categories.includes(normalized));
};

export const getPostBySlug = (slug: string): BlogPostDetail | null => {
	return postBySlug.get(slug) ?? null;
};
