import { getAllPosts, getPostsByCategory } from '$lib/blog';

export const load = ({ url }) => {
	const category = url.searchParams.get('category');
	const posts = category ? getPostsByCategory(category) : getAllPosts();

	return {
		posts,
		category
	};
};
