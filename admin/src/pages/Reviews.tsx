import { useEffect, useState } from 'react';
import BulkActionBar from '../components/admin/BulkActionBar';
import ConfirmationDialog from '../components/admin/ConfirmationDialog';
import DetailModal from '../components/admin/DetailModal';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import { api, type AdminReview, type ApiClientError, type Pagination } from '../services/api';

const PAGE_SIZE = 20;

type DeleteDialogState =
  | { mode: 'single'; reviewId: string }
  | { mode: 'bulk' }
  | null;

export default function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [maxRating, setMaxRating] = useState<number | ''>('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const hasActiveFilters =
    search.trim().length > 0 ||
    minRating !== '' ||
    maxRating !== '' ||
    createdFrom !== '' ||
    createdTo !== '';

  const clearFilters = () => {
    setSearch('');
    setMinRating('');
    setMaxRating('');
    setCreatedFrom('');
    setCreatedTo('');
  };

  const fetchReviews = async (nextPage = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getReviews({
        page: nextPage,
        size: PAGE_SIZE,
        minRating: typeof minRating === 'number' ? minRating : undefined,
        maxRating: typeof maxRating === 'number' ? maxRating : undefined,
        search: search.trim() || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
      });
      setReviews(response.reviews);
      setPagination(response.pagination);
      setSelectedReviewIds([]);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (id: string) => {
    setError('');
    try {
      await api.deleteReviewByAdmin(id);
      await fetchReviews(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to delete review');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedReviewIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedReviewIds.length === reviews.length) {
      setSelectedReviewIds([]);
      return;
    }
    setSelectedReviewIds(reviews.map((review) => review.id));
  };

  const bulkDelete = async () => {
    if (selectedReviewIds.length === 0) return;
    setError('');
    try {
      await api.deleteReviewsBulk(selectedReviewIds);
      await fetchReviews(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to delete selected reviews');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;

    if (deleteDialog.mode === 'single') {
      await deleteReview(deleteDialog.reviewId);
      setDeleteDialog(null);
      return;
    }

    await bulkDelete();
    setDeleteDialog(null);
  };

  useEffect(() => {
    void fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRating, maxRating, createdFrom, createdTo]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchReviews(1);
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="h-full flex flex-col p-8 gap-6 overflow-y-auto thin-scrollbar">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Review Moderation</p>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Reviews</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Review comment"
              className="focus-ring-control px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Min rating</p>
            <select
              value={minRating}
              onChange={(event) => {
                const value = event.target.value;
                setMinRating(value ? Number(value) : '');
              }}
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-40"
            >
              <option value="">All Ratings</option>
              <option value="5">5+</option>
              <option value="4">4+</option>
              <option value="3">3+</option>
              <option value="2">2+</option>
              <option value="1">1+</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Max rating</p>
            <select
              value={maxRating}
              onChange={(event) => {
                const value = event.target.value;
                setMaxRating(value ? Number(value) : '');
              }}
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-40"
            >
              <option value="">Max Rating</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">From</p>
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
              className="focus-ring-control py-2.5 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-40"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">To</p>
            <input
              type="date"
              value={createdTo}
              onChange={(event) => setCreatedTo(event.target.value)}
              className="focus-ring-control py-2.5 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-40"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2.5 text-xs font-medium border border-outline-variant/40 text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
            >
              Clear filters
            </button>
          )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <BulkActionBar count={selectedReviewIds.length} onClear={() => setSelectedReviewIds([])}>
        <button className="px-3 py-1 rounded text-xs bg-error text-on-error" onClick={() => setDeleteDialog({ mode: 'bulk' })}>
          Delete Selected
        </button>
      </BulkActionBar>

      <DataTable
        columns={['', 'Review', 'Boarding', 'Student', 'Rating', 'Comment', 'Actions']}
        loading={loading}
        emptyText="No reviews found."
        colSpan={7}
      >
        {reviews.map((review) => (
          <tr
            key={review.id}
            onClick={() => setSelectedReview(review)}
            className="cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedReviewIds.includes(review.id)}
                onChange={() => toggleSelect(review.id)}
              />
            </td>
            <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">{review.id}</td>
            <td className="px-6 py-4 text-sm">
              {typeof review.boardingId === 'object' ? review.boardingId.title ?? '—' : '—'}
            </td>
            <td className="px-6 py-4 text-sm">
              {typeof review.studentId === 'object'
                ? `${review.studentId.firstName ?? ''} ${review.studentId.lastName ?? ''}`.trim() || '—'
                : '—'}
            </td>
            <td className="px-6 py-4 text-sm">{review.rating}/5</td>
            <td className="px-6 py-4 text-sm max-w-85 truncate">{review.comment ?? '—'}</td>
            <td className="px-6 py-4 text-center" onClick={(event) => event.stopPropagation()}>
              <button
                className="px-2 py-1 text-xs bg-error text-on-error rounded hover:brightness-110 transition"
                onClick={() => setDeleteDialog({ mode: 'single', reviewId: review.id })}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="flex items-center gap-2 mb-2">

      <DetailModal
        open={selectedReview !== null}
        title={selectedReview ? `Review ${selectedReview.id}` : 'Review details'}
        subtitle={selectedReview?.boardingId && typeof selectedReview.boardingId === 'object' ? selectedReview.boardingId.title : undefined}
        onClose={() => setSelectedReview(null)}
        maxWidthClassName="max-w-4xl"
        footer={
          selectedReview ? (
            <button
              className="px-4 py-2 rounded-md text-sm font-semibold bg-error text-on-error border border-transparent hover:brightness-110 transition-colors"
              onClick={() => setDeleteDialog({ mode: 'single', reviewId: selectedReview.id })}
            >
              Delete review
            </button>
          ) : null
        }
      >
        {selectedReview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Review ID</label>
                <p className="mt-1 font-mono text-sm text-on-surface">{selectedReview.id}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Rating</label>
                <p className="mt-1 text-sm text-on-surface">{selectedReview.rating}/5</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Boarding</label>
                <p className="mt-1 text-sm text-on-surface">
                  {typeof selectedReview.boardingId === 'object'
                    ? selectedReview.boardingId.title ?? '—'
                    : selectedReview.boardingId}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {typeof selectedReview.boardingId === 'object'
                    ? `${selectedReview.boardingId.city ?? '—'} / ${selectedReview.boardingId.district ?? '—'}`
                    : '—'}
                </p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Student</label>
                <p className="mt-1 text-sm text-on-surface">
                  {typeof selectedReview.studentId === 'object'
                    ? `${selectedReview.studentId.firstName ?? ''} ${selectedReview.studentId.lastName ?? ''}`.trim() || '—'
                    : selectedReview.studentId}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {typeof selectedReview.studentId === 'object' ? selectedReview.studentId.email ?? '—' : '—'}
                </p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Created At</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedReview.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Comment</label>
              <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface-variant">
                {selectedReview.comment || 'No comment provided.'}
              </p>
            </div>
          </div>
        )}
      </DetailModal>
        <input
          type="checkbox"
          checked={reviews.length > 0 && selectedReviewIds.length === reviews.length}
          onChange={toggleSelectAll}
        />
        <span className="text-xs text-on-surface-variant">Select all on page</span>
      </div>

      <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
        <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.totalPages}</p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          loading={loading}
          onPrev={() => void fetchReviews(pagination.page - 1)}
          onNext={() => void fetchReviews(pagination.page + 1)}
        />
      </div>

      <ConfirmationDialog
        open={deleteDialog !== null}
        title={deleteDialog?.mode === 'bulk' ? 'Delete selected reviews' : 'Delete review'}
        description={
          deleteDialog?.mode === 'bulk'
            ? `This will permanently delete ${selectedReviewIds.length} selected reviews.`
            : 'This will permanently delete this review.'
        }
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setDeleteDialog(null)}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
    </div>
  );
}
