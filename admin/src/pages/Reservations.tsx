import { useEffect, useState } from 'react';
import DetailModal from '../components/admin/DetailModal';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
import {
  api,
  type AdminReservation,
  type ApiClientError,
  type Pagination,
  type ReservationStatus,
} from '../services/api';

const PAGE_SIZE = 20;

export default function Reservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<AdminReservation | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');
  const hasActiveFilters =
    search.trim().length > 0 ||
    status !== '' ||
    createdFrom !== '' ||
    createdTo !== '';

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCreatedFrom('');
    setCreatedTo('');
  };

  const fetchReservations = async (nextPage = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getReservations({
        page: nextPage,
        size: PAGE_SIZE,
        status: status || undefined,
        search: search.trim() || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
      });
      setReservations(response.reservations);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReservations(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, createdFrom, createdTo]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchReservations(1);
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="h-full flex flex-col p-8 gap-6 overflow-y-auto thin-scrollbar">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Reservations Oversight</p>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Reservations</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Boarding title or notes"
              className="focus-ring-control px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Status</p>
            <select
              value={status}
              onChange={(event) => setStatus((event.target.value as ReservationStatus | '') || '')}
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
            >
              <option value="">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="EXPIRED">EXPIRED</option>
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

      <DataTable
        columns={['Reservation', 'Boarding', 'Student', 'Rent', 'Status', 'Created']}
        loading={loading}
        emptyText="No reservations found."
        colSpan={6}
      >
        {reservations.map((reservation) => (
          <tr
            key={reservation.id}
            onClick={() => setSelectedReservation(reservation)}
            className="cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">{reservation.id}</td>
            <td className="px-6 py-4 text-sm">{reservation.boarding?.title ?? '—'}</td>
            <td className="px-6 py-4 text-sm">
              {(reservation.student && `${reservation.student.firstName ?? ''} ${reservation.student.lastName ?? ''}`.trim()) || '—'}
            </td>
            <td className="px-6 py-4 text-sm">LKR {reservation.rentSnapshot.toLocaleString()}</td>
            <td className="px-6 py-4 text-xs">
              <StatusChip value={reservation.status} />
            </td>
            <td className="px-6 py-4 text-xs text-on-surface-variant">{new Date(reservation.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </DataTable>

      <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
        <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.totalPages}</p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          loading={loading}
          onPrev={() => void fetchReservations(pagination.page - 1)}
          onNext={() => void fetchReservations(pagination.page + 1)}
        />
      </div>

      <DetailModal
        open={selectedReservation !== null}
        title={selectedReservation?.boarding?.title ?? 'Reservation details'}
        subtitle={selectedReservation ? `Reservation ${selectedReservation.id}` : undefined}
        onClose={() => setSelectedReservation(null)}
        maxWidthClassName="max-w-4xl"
      >
        {selectedReservation && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Reservation ID</label>
                <p className="mt-1 font-mono text-sm text-on-surface">{selectedReservation.id}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Status</label>
                <div className="mt-1"><StatusChip value={selectedReservation.status} /></div>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Boarding</label>
                <p className="mt-1 text-sm text-on-surface">{selectedReservation.boarding?.title ?? '—'}</p>
                <p className="text-xs text-on-surface-variant">{selectedReservation.boarding?.city ?? '—'} / {selectedReservation.boarding?.district ?? '—'}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Student</label>
                <p className="mt-1 text-sm text-on-surface">
                  {(selectedReservation.student && `${selectedReservation.student.firstName ?? ''} ${selectedReservation.student.lastName ?? ''}`.trim()) || '—'}
                </p>
                <p className="text-xs text-on-surface-variant">{selectedReservation.student?.email ?? '—'}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Move-in Date</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedReservation.moveInDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Expires At</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedReservation.expiresAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Rent Snapshot</label>
                <p className="mt-1 text-sm text-on-surface">LKR {selectedReservation.rentSnapshot.toLocaleString()}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Created At</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedReservation.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Special Requests</label>
              <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface-variant">
                {selectedReservation.specialRequests || 'No special requests provided.'}
              </p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
