import type { ComicSummary, Genre } from '../types/comicTypes';

export function parseGenres(value: unknown): Genre[] {
	if (typeof value === 'string') {
		try {
			return parseGenres(JSON.parse(value));
		} catch {
			return value.split(',').map((name, id) => ({ id, name: name.trim() }));
		}
	}
	if (!Array.isArray(value)) return [];
	return value.flatMap((genre, id) => {
		if (typeof genre === 'string') return [{ id, name: genre.trim() }];
		if (genre && typeof genre.name === 'string')
			return [{ id: genre.id ?? id, name: genre.name.trim() }];
		return [];
	});
}

export async function fetchComicCatalog(
	apiUrl: string,
	signal?: AbortSignal,
): Promise<ComicSummary[]> {
	const comics: ComicSummary[] = [];
	let page = 1;
	let totalPages = 1;
	do {
		const response = await fetch(`${apiUrl}/comics?limit=1000&page=${page}`, { signal });
		if (!response.ok) throw new Error('Không thể tải danh sách truyện.');
		const data = await response.json();
		const items = Array.isArray(data) ? data : data.data;
		if (!Array.isArray(items)) throw new Error('Dữ liệu truyện không hợp lệ.');
		comics.push(
			...items.map((comic) => ({
				...comic,
				isDigital: [true, 1, '1', 'true'].includes(comic.isDigital),
				genres: parseGenres(comic.genres),
				price: Number(comic.price) || 0,
				views: Number(comic.viewCount ?? comic.views) || 0,
				averageRating: Number(comic.averageRating) || 0,
			})),
		);
		totalPages = Number(data.pagination?.totalPages) || 1;
		page++;
	} while (page <= totalPages);
	return comics;
}
