import { useEffect, useState } from 'react';
import BoardingDetailDrawer from '../components/BoardingDetailDrawer';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
import {
  api,
  type ApiClientError,
  type Boarding,
  type BoardingStatus,
  type Pagination,
} from '../services/api';

const PAGE_SIZE = 20;
type ManageBoardingStatusFilter = Exclude<BoardingStatus, 'PENDING_APPROVAL'>;

export default function ManageBoardings() {
  const [boardings, setBoardings] = useState<Boarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ManageBoardingStatusFilter | ''>('');
  const [selectedBoarding, setSelectedBoarding] = useState<Boarding | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== '';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const fetchBoardings = async (nextPage = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getAdminBoardings({
        page: nextPage,
        size: PAGE_SIZE,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setBoardings(
        response.boardings.filter((boarding) => boarding.status !== 'PENDING_APPROVAL'),
      );
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load boardings');
    } finally {
      setLoading(false);
    }
  };

  const updateBoardingStatus = async (
    id: string,
    nextStatus: 'ACTIVE' | 'INACTIVE',
  ) => {
    setActionLoadingId(id);
    setError('');
    try {
      await api.setBoardingStatusByAdmin(id, nextStatus);
      await fetchBoardings(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to update boarding status');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    void fetchBoardings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchBoardings(1);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="h-full flex flex-col p-8 gap-6 overflow-y-auto thin-scrollbar">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Inventory Management</p>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Manage Boardings</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, city, district"
              className="focus-ring-control px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Status</p>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter((event.target.value as ManageBoardingStatusFilter | '') || '')}
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
            >
              <option value="">All Status</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="REJECTED">REJECTED</option>
            </select>
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
        columns={['Boarding', 'Owner', 'Location', 'Rent', 'Status', 'Actions']}
        loading={loading}
        emptyText="No boardings found."
        colSpan={6}
      >
        {boardings.map((boarding) => (
          <tr
            key={boarding.id}
            onClick={() => setSelectedBoarding(boarding)}
            className="cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <td className="px-6 py-4 text-sm">
              <div className="font-semibold">{boarding.title}</div>
              <div className="text-xs font-mono text-on-surface-variant">{boarding.id}</div>
            </td>
            <td className="px-6 py-4 text-sm">{boarding.owner ? `${boarding.owner.firstName} ${boarding.owner.lastName}` : '—'}</td>
            <td className="px-6 py-4 text-sm">{boarding.city} / {boarding.district}</td>
            <td className="px-6 py-4 text-sm">LKR {boarding.monthlyRent.toLocaleString()}</td>
            <td className="px-6 py-4 text-xs"><StatusChip value={boarding.status} /></td>
            <td className="px-6 py-4">
              {(() => {
                const isLoading = actionLoadingId === boarding.id;

                if (boarding.status === 'ACTIVE') {
                  return (
                    <div className="flex gap-2">
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-surface-container-high text-on-surface rounded-md border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => void updateBoardingStatus(boarding.id, 'INACTIVE')}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Deactivate'}
                      </button>
                    </div>
                  );
                }

                if (boarding.status === 'INACTIVE') {
                  return (
                    <div className="flex gap-2">
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-tertiary text-on-tertiary rounded-md border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => void updateBoardingStatus(boarding.id, 'ACTIVE')}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Activate'}
                      </button>
                    </div>
                  );
                }

                if (boarding.status === 'REJECTED') {
                  return (
                    <div className="flex gap-2">
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-tertiary text-on-tertiary rounded-md border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => void updateBoardingStatus(boarding.id, 'ACTIVE')}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Activate'}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="flex gap-2">
                    <button
                      className="px-3.5 py-2 text-xs font-semibold bg-tertiary text-on-tertiary rounded-md border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                      onClick={() => void updateBoardingStatus(boarding.id, 'ACTIVE')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                );
              })()}
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
        <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.totalPages}</p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          loading={loading}
          onPrev={() => void fetchBoardings(pagination.page - 1)}
          onNext={() => void fetchBoardings(pagination.page + 1)}
        />
      </div>

      <BoardingDetailDrawer
        boarding={selectedBoarding}
        onClose={() => setSelectedBoarding(null)}
        footer={
          selectedBoarding ? (
            (() => {
              const isLoading = actionLoadingId === selectedBoarding.id;

              if (selectedBoarding.status === 'ACTIVE') {
                return (
                  <button
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                    onClick={() => void updateBoardingStatus(selectedBoarding.id, 'INACTIVE')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Deactivate'}
                  </button>
                );
              }

              if (selectedBoarding.status === 'INACTIVE') {
                return (
                  <button
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-tertiary text-on-tertiary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                    onClick={() => void updateBoardingStatus(selectedBoarding.id, 'ACTIVE')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Activate'}
                  </button>
                );
              }

              if (selectedBoarding.status === 'REJECTED') {
                return (
                  <button
                    className="px-3 py-2 rounded-md text-sm font-semibold bg-tertiary text-on-tertiary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                    onClick={() => void updateBoardingStatus(selectedBoarding.id, 'ACTIVE')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Activate'}
                  </button>
                );
              }

              return (
                <button
                  className="px-3 py-2 rounded-md text-sm font-semibold bg-tertiary text-on-tertiary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                  onClick={() => void updateBoardingStatus(selectedBoarding.id, 'ACTIVE')}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Approve'}
                </button>
              );
            })()
          ) : null
        }
      />
    </div>
  );
}
