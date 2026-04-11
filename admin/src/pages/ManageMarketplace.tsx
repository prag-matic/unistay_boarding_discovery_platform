import { useEffect, useState } from 'react';
import ConfirmationDialog from '../components/admin/ConfirmationDialog';
import DetailModal from '../components/admin/DetailModal';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
import {
  api,
  type ApiClientError,
  type MarketplaceItem,
  type MarketplaceStatus,
  type Pagination,
} from '../services/api';

const PAGE_SIZE = 20;

export default function ManageMarketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MarketplaceStatus | ''>('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [takedownDialogItemId, setTakedownDialogItemId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const hasActiveFilters = search.trim().length > 0 || status !== '';

  const clearFilters = () => {
    setSearch('');
    setStatus('');
  };

  const fetchItems = async (nextPage = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getAdminMarketplaceItems({
        page: nextPage,
        size: PAGE_SIZE,
        status: status || undefined,
        search: search.trim() || undefined,
      });
      setItems(response.items);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load marketplace items');
    } finally {
      setLoading(false);
    }
  };

  const setItemStatus = async (id: string, nextStatus: MarketplaceStatus, reason?: string) => {
    setActionLoadingId(id);
    setError('');
    try {
      await api.setMarketplaceStatusByAdmin(id, nextStatus, reason);
      await fetchItems(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to update marketplace status');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    void fetchItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchItems(1);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="h-full flex flex-col p-8 gap-6 overflow-y-auto thin-scrollbar">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Inventory Management</p>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Manage Marketplace</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, category, location"
              className="focus-ring-control px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Status</p>
            <select
              value={status}
              onChange={(event) => setStatus((event.target.value as MarketplaceStatus | '') || '')}
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TAKEN_DOWN">TAKEN_DOWN</option>
              <option value="REMOVED">REMOVED</option>
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
        columns={['Listing', 'Seller', 'Location', 'Price', 'Status', 'Actions']}
        loading={loading}
        emptyText="No marketplace items found."
        colSpan={6}
      >
        {items.map((item) => (
          <tr
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <td className="px-6 py-4 text-sm">
              <div className="font-semibold">{item.title}</div>
              <div className="text-xs font-mono text-on-surface-variant">{item.id}</div>
            </td>
            <td className="px-6 py-4 text-sm">{item.seller ? `${item.seller.firstName} ${item.seller.lastName}` : '—'}</td>
            <td className="px-6 py-4 text-sm">{item.city} / {item.district}</td>
            <td className="px-6 py-4 text-sm">{typeof item.price === 'number' ? `LKR ${item.price.toLocaleString()}` : 'Free'}</td>
            <td className="px-6 py-4 text-xs"><StatusChip value={item.status} /></td>
            <td className="px-6 py-4">
              {(() => {
                const isLoading = actionLoadingId === item.id;

                if (item.status === 'ACTIVE') {
                  return (
                    <div className="flex gap-2">
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-error text-on-error rounded-md border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => setTakedownDialogItemId(item.id)}
                        disabled={isLoading}
                      >
                        Take down
                      </button>
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-surface-container-high text-on-surface rounded-md border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => void setItemStatus(item.id, 'REMOVED')}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Remove'}
                      </button>
                    </div>
                  );
                }

                if (item.status === 'TAKEN_DOWN') {
                  return (
                    <div className="flex gap-2">
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-tertiary text-on-tertiary rounded-md border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => void setItemStatus(item.id, 'ACTIVE')}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Reinstate'}
                      </button>
                      <button
                        className="px-3.5 py-2 text-xs font-semibold bg-surface-container-high text-on-surface rounded-md border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                        onClick={() => void setItemStatus(item.id, 'REMOVED')}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Remove'}
                      </button>
                    </div>
                  );
                }

                return (
                  <span className="text-xs text-on-surface-variant">No available actions</span>
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
          onPrev={() => void fetchItems(pagination.page - 1)}
          onNext={() => void fetchItems(pagination.page + 1)}
        />
      </div>

      <DetailModal
        open={selectedItem !== null}
        title={selectedItem?.title ?? 'Marketplace listing details'}
        subtitle={selectedItem ? `${selectedItem.city} / ${selectedItem.district}` : undefined}
        onClose={() => setSelectedItem(null)}
        maxWidthClassName="max-w-4xl"
        footer={
          selectedItem ? (
            (() => {
              const isLoading = actionLoadingId === selectedItem.id;

              if (selectedItem.status === 'ACTIVE') {
                return (
                  <>
                    <button
                      className="px-4 py-2 rounded-md text-sm font-semibold bg-error text-on-error border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                      onClick={() => setTakedownDialogItemId(selectedItem.id)}
                      disabled={isLoading}
                    >
                      Take down
                    </button>
                    <button
                      className="px-4 py-2 rounded-md text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                      onClick={() => void setItemStatus(selectedItem.id, 'REMOVED')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Remove'}
                    </button>
                  </>
                );
              }

              if (selectedItem.status === 'TAKEN_DOWN') {
                return (
                  <>
                    <button
                      className="px-4 py-2 rounded-md text-sm font-semibold bg-tertiary text-on-tertiary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                      onClick={() => void setItemStatus(selectedItem.id, 'ACTIVE')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Reinstate'}
                    </button>
                    <button
                      className="px-4 py-2 rounded-md text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                      onClick={() => void setItemStatus(selectedItem.id, 'REMOVED')}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Remove'}
                    </button>
                  </>
                );
              }

              return (
                <span className="text-sm text-on-surface-variant">No available actions</span>
              );
            })()
          ) : null
        }
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Listing ID</label>
                <p className="mt-1 font-mono text-sm text-on-surface">{selectedItem.id}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Status</label>
                <div className="mt-1"><StatusChip value={selectedItem.status} /></div>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Seller</label>
                <p className="mt-1 text-sm text-on-surface">{selectedItem.seller ? `${selectedItem.seller.firstName} ${selectedItem.seller.lastName}` : '—'}</p>
                <p className="text-xs text-on-surface-variant">{selectedItem.seller?.phone ?? '—'}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Location</label>
                <p className="mt-1 text-sm text-on-surface">{selectedItem.city} / {selectedItem.district}</p>
                <p className="text-xs text-on-surface-variant">{selectedItem.adType} · {selectedItem.category}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Price</label>
                <p className="mt-1 text-sm text-on-surface">{typeof selectedItem.price === 'number' ? `LKR ${selectedItem.price.toLocaleString()}` : 'Free'}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Reports</label>
                <p className="mt-1 text-sm text-on-surface">{selectedItem.reportCount}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Created At</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedItem.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Updated At</label>
                <p className="mt-1 text-sm text-on-surface">{new Date(selectedItem.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Description</label>
              <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface-variant">{selectedItem.description || 'No description available.'}</p>
            </div>

            {selectedItem.takedownReason ? (
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Takedown Reason</label>
                <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface-variant">{selectedItem.takedownReason}</p>
              </div>
            ) : null}

            {selectedItem.images?.length ? (
              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Images</label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedItem.images.map((image) => (
                    <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={image.url}
                        alt={selectedItem.title}
                        className="h-28 w-full rounded-md border border-outline-variant/25 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DetailModal>

      <ConfirmationDialog
        open={takedownDialogItemId !== null}
        title="Take down marketplace listing"
        description="Provide a takedown reason for audit and seller notification."
        confirmLabel="Take down"
        variant="danger"
        requireReason
        reasonLabel="Takedown Reason"
        reasonPlaceholder="Enter takedown reason"
        onCancel={() => setTakedownDialogItemId(null)}
        onConfirm={(reason) => {
          if (!takedownDialogItemId || !reason) return;
          void setItemStatus(takedownDialogItemId, 'TAKEN_DOWN', reason);
          setTakedownDialogItemId(null);
        }}
      />
    </div>
  );
}
