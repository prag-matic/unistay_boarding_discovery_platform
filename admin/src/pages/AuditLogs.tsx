import { useEffect, useState } from 'react';
import DetailModal from '../components/admin/DetailModal';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
import { api, type AdminActionLog, type ApiClientError, type Pagination } from '../services/api';

const PAGE_SIZE = 20;

export default function AuditLogs() {
  const [actions, setActions] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [targetType, setTargetType] = useState<'' | 'USER' | 'BOARDING' | 'PAYMENT' | 'REVIEW' | 'SYSTEM'>('');
  const [selectedEntry, setSelectedEntry] = useState<AdminActionLog | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');
  const hasActiveFilters = actionFilter.trim().length > 0 || targetType !== '';

  const clearFilters = () => {
    setActionFilter('');
    setTargetType('');
  };

  const fetchActions = async (nextPage = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getAdminActions({
        page: nextPage,
        size: PAGE_SIZE,
        action: actionFilter || undefined,
        targetType: targetType || undefined,
      });
      setActions(response.actions);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load action logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchActions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchActions(1);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  return (
    <div className="h-full flex flex-col p-8 gap-6 overflow-y-auto thin-scrollbar">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Audit Tracking</p>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Admin Action Logs</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Action</p>
            <input
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              placeholder="Action keyword"
              className="focus-ring-control px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Target</p>
            <select
              value={targetType}
              onChange={(event) =>
                setTargetType((event.target.value as '' | 'USER' | 'BOARDING' | 'PAYMENT' | 'REVIEW' | 'SYSTEM') || '')
              }
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
            >
              <option value="">All Targets</option>
              <option value="USER">USER</option>
              <option value="BOARDING">BOARDING</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="REVIEW">REVIEW</option>
              <option value="SYSTEM">SYSTEM</option>
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
        columns={['Action', 'Target Type', 'Target IDs', 'Admin', 'Created At']}
        loading={loading}
        emptyText="No action logs found."
        colSpan={5}
      >
        {actions.map((entry) => (
          <tr
            key={entry.id}
            onClick={() => setSelectedEntry(entry)}
            className="cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <td className="px-6 py-4 text-sm">{entry.action}</td>
            <td className="px-6 py-4 text-xs"><StatusChip value={entry.targetType} tone="neutral" /></td>
            <td className="px-6 py-4 text-xs font-mono">{entry.targetIds.join(', ') || '—'}</td>
            <td className="px-6 py-4 text-sm">
              {typeof entry.adminId === 'object'
                ? `${entry.adminId.firstName ?? ''} ${entry.adminId.lastName ?? ''}`.trim() || entry.adminId.email || '—'
                : entry.adminId}
            </td>
            <td className="px-6 py-4 text-xs text-on-surface-variant">{new Date(entry.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </DataTable>

      <DetailModal
        open={selectedEntry !== null}
        title={selectedEntry?.action ?? 'Action details'}
        subtitle={selectedEntry ? `${selectedEntry.targetType} · ${selectedEntry.id}` : undefined}
        onClose={() => setSelectedEntry(null)}
        maxWidthClassName="max-w-3xl"
      >
        {selectedEntry && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Action ID</label>
                <p className="mt-1 font-mono text-sm text-on-surface">{selectedEntry.id}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Action</label>
                <p className="mt-1 text-sm text-on-surface">{selectedEntry.action}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Target Type</label>
                <div className="mt-1"><StatusChip value={selectedEntry.targetType} tone="neutral" /></div>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Created At</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedEntry.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Target IDs</label>
                <p className="mt-1 font-mono text-sm text-on-surface-variant break-all">
                  {selectedEntry.targetIds.length ? selectedEntry.targetIds.join(', ') : '—'}
                </p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Admin</label>
                <p className="mt-1 text-sm text-on-surface">
                  {typeof selectedEntry.adminId === 'object'
                    ? `${selectedEntry.adminId.firstName ?? ''} ${selectedEntry.adminId.lastName ?? ''}`.trim() || selectedEntry.adminId.email || '—'
                    : selectedEntry.adminId}
                </p>
              </div>
            </div>

            <div>
              <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Metadata</label>
              <pre className="mt-2 overflow-x-auto rounded-md border border-outline-variant/25 bg-surface-container-low p-4 text-xs text-on-surface-variant">
                {selectedEntry.metadata ? JSON.stringify(selectedEntry.metadata, null, 2) : 'No metadata available.'}
              </pre>
            </div>
          </div>
        )}
      </DetailModal>

      <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
        <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.totalPages}</p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          loading={loading}
          onPrev={() => void fetchActions(pagination.page - 1)}
          onNext={() => void fetchActions(pagination.page + 1)}
        />
      </div>
    </div>
  );
}
