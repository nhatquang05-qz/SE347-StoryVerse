import type { ComicSummary } from '../types/comicTypes';
import { parseGenres } from './comicCatalog.ts';
import type { SortState } from '../components/common/FilterSidebar';
export interface FilterState {
	authors: string[];
	genres: string[];
	mediaType: 'all' | 'digital' | 'physical';
	minPrice?: number;
	maxPrice?: number;
	ratingRange: string[];
}

export function filterComics(
	allComics: ComicSummary[],
	filters: FilterState,
	sortState: SortState,
	searchTerm: string,
): ComicSummary[] {
	const sortPriority: (keyof SortState)[] = ['value', 'time', 'alpha'];
	let result = [...allComics];

	if (searchTerm.trim() !== '') {
		const lowerTerm = searchTerm.toLowerCase().trim();
		result = result.filter((c) => c.title.toLowerCase().includes(lowerTerm));
	}

	if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
		const min = filters.minPrice !== undefined ? Number(filters.minPrice) : 0;
		const max = filters.maxPrice !== undefined ? Number(filters.maxPrice) : Infinity;
		result = result.filter((c) => {
			const price = Number(c.flashSalePrice ?? c.price);
			return price >= min && price <= max;
		});
	}

	if (filters.authors.length > 0) {
		result = result.filter(
			(c) =>
				c.author &&
				filters.authors.some(
					(author) =>
						author.trim().toLocaleLowerCase('vi') ===
						c.author?.trim().toLocaleLowerCase('vi'),
				),
		);
	}

	if (filters.genres.length > 0) {
		result = result.filter((c) => {
			if (!c.genres) return false;
			const comicGenres = parseGenres(c.genres).map((g) => g.name.toLowerCase().trim());
			return filters.genres.some((fg) => comicGenres.includes(fg.toLowerCase().trim()));
		});
	}

	if (filters.ratingRange.length > 0) {
		result = result.filter((c) => {
			const rating = c.averageRating || 0;
			return filters.ratingRange.some((range) => {
				if (range === '4-5') return rating >= 4 && rating <= 5;
				if (range === '3-4') return rating >= 3 && rating < 4;
				if (range === '2-3') return rating >= 2 && rating < 3;
				if (range === '1-2') return rating >= 1 && rating < 2;
				return false;
			});
		});
	}

	const parseDate = (dateStr: any) => {
		if (!dateStr) return 0;
		if (dateStr instanceof Date) return dateStr.getTime();
		const s = String(dateStr);
		if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
			const [d, m, y] = s.split('/');
			return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
		}
		return new Date(s).getTime() || 0;
	};

	result.sort((a, b) => {
		for (const criteria of sortPriority) {
			let diff = 0;
			if (criteria === 'value' && sortState.value) {
				const pA = Number(a.flashSalePrice ?? a.price ?? 0);
				const pB = Number(b.flashSalePrice ?? b.price ?? 0);
				const vA = Number(a.views || 0);
				const vB = Number(b.views || 0);

				if (sortState.value === 'price-asc') diff = pA - pB;
				else if (sortState.value === 'price-desc') diff = pB - pA;
				else if (sortState.value === 'views-desc') diff = vB - vA;
				else if (sortState.value === 'views-asc') diff = vA - vB;
			}

			if (criteria === 'alpha' && sortState.alpha) {
				const tA = String(a.title || '');
				const tB = String(b.title || '');
				if (sortState.alpha === 'title-asc') diff = tA.localeCompare(tB, 'vi');
				else if (sortState.alpha === 'title-desc') diff = tB.localeCompare(tA, 'vi');
			}

			if (criteria === 'time' && sortState.time) {
				const timeA = parseDate(a.updatedAt || (a as any).createdAt);
				const timeB = parseDate(b.updatedAt || (b as any).createdAt);
				if (sortState.time === 'newest') diff = timeB - timeA;
				else if (sortState.time === 'oldest') diff = timeA - timeB;
			}

			if (Number.isFinite(diff) && diff !== 0) return diff;
		}
		return a.id - b.id;
	});

	return result;
}
