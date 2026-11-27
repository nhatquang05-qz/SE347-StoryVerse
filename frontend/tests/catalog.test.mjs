import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterComics } from '../src/utils/filterComics.ts';
import { parseGenres, fetchComicCatalog } from '../src/utils/comicCatalog.ts';

const filters = { authors: [], genres: [], mediaType: 'physical', ratingRange: [] };
const sort = { value: null, time: null, alpha: null };
const comic = (id, overrides = {}) => ({
	id,
	title: `Truyện ${id}`,
	author: 'Tác giả A',
	price: 100000,
	averageRating: 4.5,
	views: 100,
	genres: [{ id: 1, name: 'Fantasy' }],
	updatedAt: '2026-01-01',
	...overrides,
});
const items = [
	comic(1),
	comic(2, { price: 200000, author: 'Tác giả B' }),
	comic(3, { averageRating: 3.5 }),
	comic(4, { genres: [{ id: 2, name: 'Action' }] }),
];

test('combines author, genre, rating, price and search without mutating source', () => {
	const snapshot = structuredClone(items);
	const selected = {
		...filters,
		authors: [' tác giả a '],
		genres: ['fantasy'],
		ratingRange: ['4-5'],
		maxPrice: 150000,
	};
	for (let i = 0; i < 20; i++) {
		assert.deepEqual(
			filterComics(items, selected, sort, 'truyện').map((c) => c.id),
			[1],
		);
		assert.equal(filterComics(items, filters, sort, '').length, 4);
	}
	assert.deepEqual(items, snapshot);
});
test('reset removes price cap and rating boundaries do not overlap', () => {
	assert.equal(filterComics([comic(1, { price: 3000000 })], filters, sort, '').length, 1);
	assert.equal(
		filterComics(
			[comic(1, { averageRating: 4 })],
			{ ...filters, ratingRange: ['3-4'] },
			sort,
			'',
		).length,
		0,
	);
	assert.equal(
		filterComics(
			[comic(1, { averageRating: 4 })],
			{ ...filters, ratingRange: ['4-5'] },
			sort,
			'',
		).length,
		1,
	);
});
test('price filters and ordering use the active sale price shown on the card', () => {
	const sale = [comic(1, { price: 200000, flashSalePrice: 50000 }), comic(2)];
	assert.deepEqual(
		filterComics(sale, { ...filters, maxPrice: 60000 }, sort, '').map((c) => c.id),
		[1],
	);
	assert.deepEqual(
		filterComics(sale, filters, { ...sort, value: 'price-asc' }, '').map((c) => c.id),
		[1, 2],
	);
});
test('sort priority is deterministic and invalid dates do not stop tie breaking', () => {
	const input = [
		comic(2, { title: 'B', updatedAt: 'invalid' }),
		comic(1, { title: 'A', updatedAt: '' }),
		comic(3, { price: 50000 }),
	];
	assert.deepEqual(
		filterComics(
			input,
			filters,
			{ value: 'price-asc', time: 'newest', alpha: 'title-asc' },
			'',
		).map((c) => c.id),
		[3, 1, 2],
	);
});
test('accepts JSON, object and comma separated genre representations', () => {
	for (const value of [
		'[{"id":1,"name":"Fantasy"}]',
		['Fantasy'],
		[{ id: 1, name: 'Fantasy' }],
		'Fantasy, Action',
	]) {
		assert.equal(parseGenres(value)[0].name, 'Fantasy');
	}
});
test('loads all catalog pages and normalizes API values', async () => {
	const original = globalThis.fetch;
	const urls = [];
	globalThis.fetch = async (url) => {
		urls.push(url);
		return {
			ok: true,
			json: async () => ({
				data: [
					comic(urls.length, {
						isDigital: urls.length === 1 ? '0' : '1',
						genres: '[{"id":1,"name":"Fantasy"}]',
					}),
				],
				pagination: { totalPages: 2 },
			}),
		};
	};
	try {
		const result = await fetchComicCatalog('/api');
		assert.equal(result.length, 2);
		assert.equal(result[0].isDigital, false);
		assert.equal(result[1].isDigital, true);
		assert.match(urls[1], /page=2/);
	} finally {
		globalThis.fetch = original;
	}
});
