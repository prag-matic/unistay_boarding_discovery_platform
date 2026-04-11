import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  api,
  type ApiClientError,
  type MarketplaceReport,
  type MarketplaceReportStatus,
} from '../services/api';

export default function MarketplaceModeration() {
  const [reports, setReports] = useState<MarketplaceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<MarketplaceReport | null>(null);

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

  const handleTakedown = async (report: MarketplaceReport) => {
    const reason = window.prompt('Enter takedown reason:', report.details || 'Policy violation');
    if (reason === null) return;

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
      <section className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-primary mb-1">Queue Management</p>
          <div className="flex items-baseline gap-4">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Marketplace Moderation</h2>
            <span className="text-sm font-medium bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
              {filteredReports.length} open reports
            </span>
          </div>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-full text-sm focus:ring-1 focus:ring-primary w-full md:w-64 outline-none shadow-sm"
          />
        </div>
      </section>

      {error && <p className="text-sm text-error">{error}</p>}

      <section className="bg-surface-container-lowest rounded-xl overflow-hidden flex-1 shadow-[0px_20px_40px_rgba(42,52,57,0.04)] flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr className="border-b border-outline-variant/15 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-4 font-bold">Report</th>
                <th className="px-6 py-4 font-bold">Listing</th>
                <th className="px-6 py-4 font-bold">Reason</th>
                <th className="px-6 py-4 font-bold">Reporter</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">Loading...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">No open marketplace reports found.</td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const item = report.itemId;
                  const reporter =
                    typeof report.reporterId === 'object'
                      ? `${report.reporterId.firstName ?? ''} ${report.reporterId.lastName ?? ''}`.trim() ||
                        report.reporterId.email ||
                        'Unknown'
                      : report.reporterId;

                  return (
                    <tr key={report.id} className="transition-colors hover:bg-surface-container-high">
                      <td className="px-6 py-5 font-mono text-xs text-on-surface-variant">
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
                        <span className="bg-error-container/20 text-on-error-container text-[10px] font-bold px-2 py-1 rounded-sm">
                          {item?.status ?? 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-container text-on-primary-container"
                            title="View reported listing details"
                          >
                            View
                          </button>
                          <button
                            onClick={() => void handleTakedown(report)}
                            disabled={actionLoadingId === report.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-error text-white disabled:opacity-60"
                            title="Take down listing and resolve report"
                          >
                            Take Down
                          </button>
                          <button
                            onClick={() => void handleDismiss(report)}
                            disabled={actionLoadingId === report.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-surface-variant text-on-surface disabled:opacity-60"
                            title="Dismiss report"
                          >
                            Dismiss
                          </button>
                          {item?.status === 'TAKEN_DOWN' && (
                            <button
                              onClick={() => void handleReinstate(report)}
                              disabled={actionLoadingId === report.id}
                              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white disabled:opacity-60"
                              title="Reinstate listing"
                            >
                              Reinstate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-label text-xs uppercase tracking-[0.12em] text-primary">Reported Listing</p>
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
    </div>
  );
}
