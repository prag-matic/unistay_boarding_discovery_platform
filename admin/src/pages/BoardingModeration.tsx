import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import BoardingDetailDrawer from '../components/BoardingDetailDrawer';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
import { api, type ApiClientError, type Boarding } from '../services/api';

const PAGE_SIZE = 10;

export default function BoardingModeration() {
  const [boardings, setBoardings] = useState<Boarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoarding, setSelectedBoarding] = useState<Boarding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const hasActiveFilters = searchQuery.trim().length > 0;

  const fetchBoardings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getPendingBoardings();
      setBoardings(response.boardings);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to fetch boardings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBoardings();
  }, []);

  const handleApprove = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setError('');
    try {
      await api.approveBoarding(id);
      await fetchBoardings();
      if (selectedBoarding?.id === id) {
        setSelectedBoarding(null);
      }
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to approve boarding');
    }
  };

  const handleReject = async (id: string, reason: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setError('');
    try {
      await api.rejectBoarding(id, reason);
      await fetchBoardings();
      if (selectedBoarding?.id === id) {
        setSelectedBoarding(null);
      }
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to reject boarding');
    }
  };

  const normalizedQuery = searchQuery.toLowerCase();
  const filteredBoardings = boardings.filter((boarding) =>
    boarding.title.toLowerCase().includes(normalizedQuery) ||
    `${boarding.city} ${boarding.district}`.toLowerCase().includes(normalizedQuery) ||
    `${boarding.owner?.firstName ?? ''} ${boarding.owner?.lastName ?? ''}`.toLowerCase().includes(normalizedQuery) ||
    boarding.id.toLowerCase().includes(normalizedQuery),
  );
  const totalPages = Math.max(1, Math.ceil(filteredBoardings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedBoardings = filteredBoardings.slice(startIndex, startIndex + PAGE_SIZE);

  const clearFilters = () => {
    setSearchQuery('');
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  return (
    <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto thin-scrollbar">
      <section className="shrink-0">
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Approval Queues</p>
        <div className="flex items-baseline gap-4">
          <h2 className="font-headline text-3xl font-extrabold text-on-surface">Boarding Approval Queue</h2>
          <span className="text-sm font-medium bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
            {filteredBoardings.length} pending listings
          </span>
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              type="text"
              placeholder="Title, owner, city, district"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="focus-ring-control pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
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
        columns={['Boarding ID', 'Title', 'Owner', 'City / District', 'Monthly Rent', 'Updated At', 'Status', 'Actions']}
        loading={loading}
        emptyText="No pending boardings found."
        colSpan={8}
      >
        {pagedBoardings.map((boarding) => (
          <tr
            key={boarding.id}
            onClick={() => setSelectedBoarding(boarding)}
            className={`transition-colors cursor-pointer group ${selectedBoarding?.id === boarding.id ? 'bg-surface-container-high/30' : 'hover:bg-surface-container-high'}`}
          >
            <td className="px-6 py-5 font-mono text-sm text-on-surface-variant">{boarding.id}</td>
            <td className="px-6 py-5 font-bold text-sm text-on-surface">{boarding.title}</td>
            <td className="px-6 py-5">
              <div className="text-sm">{boarding.owner ? `${boarding.owner.firstName} ${boarding.owner.lastName}` : '—'}</div>
              <div className="text-xs text-on-surface-variant">{boarding.owner?.phone ?? '—'}</div>
            </td>
            <td className="px-6 py-5 text-sm">{boarding.city} / {boarding.district}</td>
            <td className="px-6 py-5 text-right font-mono font-medium text-sm">
              LKR {boarding.monthlyRent.toLocaleString()}
            </td>
            <td className="px-6 py-5 text-xs text-on-surface-variant">
              {formatDistanceToNow(new Date(boarding.updatedAt), { addSuffix: true })}
            </td>
            <td className="px-6 py-5">
              <StatusChip value={boarding.status} />
            </td>
            <td className="px-6 py-5">
              <div className="flex justify-center gap-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedBoarding(boarding);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center bg-surface-container-high text-on-surface rounded-md border border-outline-variant/35 hover:bg-surface-container-highest transition-colors"
                  title="View"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">visibility</span>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
        <p className="text-xs text-on-surface-variant">Page {currentPage} of {totalPages}</p>
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          loading={loading}
          onPrev={() => setPage(Math.max(currentPage - 1, 1))}
          onNext={() => setPage(Math.min(currentPage + 1, totalPages))}
        />
      </div>

      <BoardingDetailDrawer
        boarding={selectedBoarding}
        onClose={() => setSelectedBoarding(null)}
        onApprove={() => selectedBoarding && void handleApprove(selectedBoarding.id)}
        onReject={(reason) => selectedBoarding && void handleReject(selectedBoarding.id, reason)}
      />
    </div>
  );
}
