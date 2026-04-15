import { useEffect, useMemo, useState } from 'react';
import ConfirmationDialog from '../components/admin/ConfirmationDialog';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import { formatDistanceToNow } from 'date-fns';
import StatusChip from '../components/admin/StatusChip';
import {
  api,
  type ApiClientError,
  type MarketplaceReport,
  type MarketplaceReportStatus,
} from '../services/api';

const PAGE_SIZE = 10;

export default function MarketplaceModeration() {
  const [reports, setReports] = useState<MarketplaceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<MarketplaceReport | null>(null);
  const [takedownDialogReport, setTakedownDialogReport] = useState<MarketplaceReport | null>(null);
  const hasActiveFilters = search.trim().length > 0;

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getOpenMarketplaceReports();
      setReports(response.reports);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to fetch marketplace reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;

    return reports.filter((report) => {
      const item = report.itemId;
      const reporterName =
        typeof report.reporterId === 'object'
          ? `${report.reporterId.firstName ?? ''} ${report.reporterId.lastName ?? ''}`
          : '';

      return [
        report.id,
        item?.id,
        item?.title,
        item?.city,
        item?.district,
        report.reason,
        report.details,
        reporterName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [reports, search]);
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedReports = filteredReports.slice(startIndex, startIndex + PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resolveReport = async (
    reportId: string,
    status: Exclude<MarketplaceReportStatus, 'OPEN'>,
    notes?: string,
  ) => {
    setActionLoadingId(reportId);
    setError('');
    try {
      await api.resolveMarketplaceReport(reportId, status, notes);
      await fetchReports();
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to resolve report');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTakedown = async (report: MarketplaceReport, reason: string) => {
    setActionLoadingId(report.id);
    setError('');
    try {
      await api.takedownMarketplaceItem(report.itemId.id, reason || undefined);
      await api.resolveMarketplaceReport(report.id, 'RESOLVED', 'Taken down by admin');
      await fetchReports();
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to take down listing');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismiss = async (report: MarketplaceReport) => {
    await resolveReport(report.id, 'DISMISSED', 'No violation found');
  };

  const handleReinstate = async (report: MarketplaceReport) => {
    setActionLoadingId(report.id);
    setError('');
    try {
      await api.reinstateMarketplaceItem(report.itemId.id);
      await fetchReports();
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to reinstate listing');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto thin-scrollbar">
      <section className="shrink-0">
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Moderation Queues</p>
        <div className="flex items-baseline gap-4">
          <h2 className="font-headline text-3xl font-extrabold text-on-surface">Marketplace Moderation Queue</h2>
          <span className="text-sm font-medium bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
            {filteredReports.length} open reports
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
              placeholder="Listing, reporter, reason, location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
        columns={['Report', 'Listing', 'Reason', 'Reporter', 'Status', 'Actions']}
        loading={loading}
        emptyText="No open marketplace reports found."
        colSpan={6}
      >
        {pagedReports.map((report) => {
                  const item = report.itemId;
                  const itemStatus = item?.status ?? 'ACTIVE';
                  const reporter =
                    typeof report.reporterId === 'object'
                      ? `${report.reporterId.firstName ?? ''} ${report.reporterId.lastName ?? ''}`.trim() ||
                        report.reporterId.email ||
                        'Unknown'
                      : report.reporterId;
                  const isLoading = actionLoadingId === report.id;

                  return (
                    <tr key={report.id} className="transition-colors hover:bg-surface-container-high">
                      <td className="px-6 py-5 font-mono text-sm text-on-surface-variant">
                        <div>{report.id}</div>
                        <div className="mt-1 text-[11px]">
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-sm text-on-surface">{item?.title ?? 'Unknown listing'}</div>
                        <div className="text-xs text-on-surface-variant">
                          {item?.city}, {item?.district} · {item?.adType}
                        </div>
                        {typeof item?.price === 'number' ? (
                          <div className="text-xs text-on-surface-variant">LKR {item.price.toLocaleString()}</div>
                        ) : (
                          <div className="text-xs text-on-surface-variant">Free</div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-on-surface">{report.reason}</div>
                        <div className="text-xs text-on-surface-variant mt-1 max-w-70 whitespace-pre-wrap">
                          {report.details || 'No details provided'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm">{reporter}</td>
                      <td className="px-6 py-5">
                        <StatusChip value={item?.status ?? 'ACTIVE'} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-primary-container text-on-primary-container border border-outline-variant/25 hover:brightness-105 transition-colors"
                            title="View reported listing details"
                          >
                            View
                          </button>
                          {itemStatus !== 'TAKEN_DOWN' && (
                            <button
                              onClick={() => setTakedownDialogReport(report)}
                              disabled={isLoading}
                              className="px-3.5 py-2 text-xs font-semibold rounded-md bg-error text-on-error border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                              title="Take down listing and resolve report"
                            >
                              {isLoading ? 'Processing...' : 'Take down'}
                            </button>
                          )}
                          <button
                            onClick={() => void handleDismiss(report)}
                            disabled={isLoading}
                            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-surface-container-high text-on-surface border border-outline-variant/30 hover:bg-surface-container-highest transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                            title="Dismiss report"
                          >
                            {isLoading ? 'Processing...' : 'Dismiss'}
                          </button>
                          {itemStatus === 'TAKEN_DOWN' && (
                            <button
                              onClick={() => void handleReinstate(report)}
                              disabled={isLoading}
                              className="px-3.5 py-2 text-xs font-semibold rounded-md bg-primary text-on-primary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                              title="Reinstate listing"
                            >
                              {isLoading ? 'Processing...' : 'Reinstate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-inverse-surface/45 flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">Reported Listing</p>
                <h3 className="text-xl font-extrabold text-on-surface mt-1">{selectedReport.itemId?.title ?? 'Unknown listing'}</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  {selectedReport.itemId?.city}, {selectedReport.itemId?.district} · {selectedReport.itemId?.adType}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-surface-variant text-on-surface"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-on-surface mb-2">Listing Details</h4>
                <div className="space-y-1 text-sm text-on-surface-variant">
                  <p><span className="font-semibold text-on-surface">Category:</span> {selectedReport.itemId?.category ?? '-'}</p>
                  <p><span className="font-semibold text-on-surface">Condition:</span> {selectedReport.itemId?.itemCondition ?? '-'}</p>
                  <p><span className="font-semibold text-on-surface">Price:</span> {typeof selectedReport.itemId?.price === 'number' ? `LKR ${selectedReport.itemId.price.toLocaleString()}` : 'Free'}</p>
                  <p><span className="font-semibold text-on-surface">Status:</span> {selectedReport.itemId?.status ?? '-'}</p>
                  <p><span className="font-semibold text-on-surface">Reports:</span> {selectedReport.itemId?.reportCount ?? 0}</p>
                </div>
                <h4 className="text-sm font-bold text-on-surface mt-4 mb-2">Description</h4>
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                  {selectedReport.itemId?.description || 'No description available.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-on-surface mb-2">Report Info</h4>
                <div className="space-y-1 text-sm text-on-surface-variant">
                  <p><span className="font-semibold text-on-surface">Reason:</span> {selectedReport.reason}</p>
                  <p><span className="font-semibold text-on-surface">Details:</span> {selectedReport.details || 'No details provided'}</p>
                  <p>
                    <span className="font-semibold text-on-surface">Reported:</span>{' '}
                    {formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <h4 className="text-sm font-bold text-on-surface mt-4 mb-2">Images</h4>
                {selectedReport.itemId?.images?.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.itemId.images.map((image) => (
                      <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={image.url}
                          alt="Reported marketplace listing"
                          className="w-full h-28 object-cover rounded-md border border-outline-variant/25"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">No images available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={takedownDialogReport !== null}
        title="Take down reported listing"
        description="Provide a takedown reason before resolving this report."
        confirmLabel="Take down"
        variant="danger"
        requireReason
        reasonLabel="Takedown Reason"
        reasonPlaceholder="Enter takedown reason"
        initialReason={takedownDialogReport?.details || 'Policy violation'}
        onCancel={() => setTakedownDialogReport(null)}
        onConfirm={(reason) => {
          if (!takedownDialogReport || !reason) return;
          void handleTakedown(takedownDialogReport, reason);
          setTakedownDialogReport(null);
        }}
      />
    </div>
  );
}
