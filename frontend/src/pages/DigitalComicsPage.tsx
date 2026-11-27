import { fetchComicCatalog } from '../utils/comicCatalog';
import { filterComics } from '../utils/filterComics';
import React, { useMemo, useState, useEffect } from 'react';
import ProductList from '../components/common/ProductList';
import { type ComicSummary } from '../types/comicTypes';
import LoadingPage from '../components/common/Loading/LoadingScreen';
import Pagination from '../components/common/Pagination';
import FilterSidebar, { type SortState } from '../components/common/FilterSidebar';
import logoImage from '../assets/images/logo.avif';
import { FiSearch } from 'react-icons/fi';

import '../assets/styles/ComicsPage.css';
import '../assets/styles/FilterSidebar.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const ITEMS_PER_PAGE = 20;

interface FilterState {
	authors: string[];
	genres: string[];
	mediaType: 'all' | 'digital' | 'physical';
	minPrice?: number;
	maxPrice?: number;
	ratingRange: string[];
}

const DigitalComicsPage: React.FC = () => {
	const [allComics, setAllComics] = useState<ComicSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [categoryTitle] = useState('Truyện tranh online');
	const [categoryDescription] = useState(
		'Khám phá đa vũ trụ truyện tranh online chất lượng cao, sắc nét trên mọi thiết bị của bạn.',
	);

	const [searchTerm, setSearchTerm] = useState('');

	const [sortState, setSortState] = useState<SortState>({
		time: null,
		alpha: null,
		value: null,
	});

	const [filters, setFilters] = useState<FilterState>({
		authors: [],
		genres: [],
		mediaType: 'digital',
		minPrice: undefined,
		maxPrice: undefined,
		ratingRange: [],
	});

	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		const controller = new AbortController();
		fetchComicCatalog(API_URL, controller.signal)
			.then((comics) => setAllComics(comics.filter((comic) => comic.isDigital === true)))
			.catch((error) => {
				if (!controller.signal.aborted) setLoadError(error.message);
			})
			.finally(() => {
				if (!controller.signal.aborted) setIsLoading(false);
			});
		return () => controller.abort();
	}, []);

	const handleSortChange = (newSort: SortState) => {
		setSortState(newSort);
		setCurrentPage(1);
	};

	const currentComics = useMemo(
		() => filterComics(allComics, filters, sortState, searchTerm),
		[allComics, filters, sortState, searchTerm],
	);

	const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
	const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
	const currentItems = currentComics.slice(indexOfFirstItem, indexOfLastItem);
	const totalPages = Math.ceil(currentComics.length / ITEMS_PER_PAGE);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo(0, 0);
	};

	if (isLoading) return <LoadingPage />;

	return (
		<div className="comics-page-wrapper">
			<section className="comics-hero">
				<h1 className="hero-title">{categoryTitle}</h1>
				<p className="hero-desc">{categoryDescription}</p>
			</section>

			<div className="comics-layout">
				<aside className="filter-sidebar-wrapper">
					<FilterSidebar
						filters={filters}
						onFilterChange={(newFilters) => {
							setFilters(newFilters);
							setCurrentPage(1);
						}}
						showPriceFilter={false}
						sortState={sortState}
						onSortChange={handleSortChange}
					/>
				</aside>

				<main className="main-content-area">
					{loadError && (
						<p role="alert">
							{loadError}{' '}
							<button onClick={() => window.location.reload()}>Thử lại</button>
						</p>
					)}
					<div className="search-bar-container">
						<div className="search-input-wrapper">
							<FiSearch className="search-icon" />
							<input
								type="text"
								placeholder="Tìm kiếm tên truyện..."
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setCurrentPage(1);
								}}
							/>
						</div>
					</div>

					{currentItems.length > 0 ? (
						<>
							<div className="results-count">
								Hiển thị <span>{currentItems.length}</span> trên tổng số{' '}
								<span>{currentComics.length}</span> truyện
							</div>

							<ProductList comics={currentItems} />

							{totalPages > 1 && (
								<div className="pagination-container">
									<Pagination
										currentPage={currentPage}
										totalPages={totalPages}
										onPageChange={handlePageChange}
									/>
								</div>
							)}
						</>
					) : (
						<div className="empty-state-container">
							<img
								src={logoImage}
								alt="Empty"
								style={{ width: '120px', opacity: 0.5, marginBottom: '20px' }}
							/>
							<p className="empty-state-text">Không tìm thấy truyện nào phù hợp.</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

export default DigitalComicsPage;
