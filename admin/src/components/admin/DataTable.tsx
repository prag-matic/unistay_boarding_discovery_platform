import { Children, type ReactNode, useEffect, useRef, useState } from 'react';

interface DataTableProps {
  columns: ReactNode[];
  loading: boolean;
  emptyText: string;
  colSpan: number;
  children: ReactNode;
}

export default function DataTable({
  columns,
  loading,
  emptyText,
  colSpan,
  children,
}: DataTableProps) {
  const hasRows = Children.count(children) > 0;
  const [showLoading, setShowLoading] = useState(false);
  const loadingStartedAtRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const minVisibleMs = 250;

    if (loading) {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (loadingStartedAtRef.current === null) {
        loadingStartedAtRef.current = Date.now();
      }

      setShowLoading(true);
      return;
    }

    if (!showLoading) {
      loadingStartedAtRef.current = null;
      return;
    }

    const startedAt = loadingStartedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(minVisibleMs - elapsed, 0);

    if (remaining === 0) {
      setShowLoading(false);
      loadingStartedAtRef.current = null;
      return;
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setShowLoading(false);
      loadingStartedAtRef.current = null;
      hideTimeoutRef.current = null;
    }, remaining);

    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [loading, showLoading]);

  return (
    <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(42,52,57,0.04)] flex flex-col min-h-0">
      <div className="relative overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface-container-low z-10">
            <tr className="border-b border-outline-variant/30 text-xs uppercase tracking-[0.12em] text-on-surface-variant">
              {columns.map((column, index) => (
                <th key={index} className="px-6 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {!hasRows && showLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    Loading data...
                  </span>
                </td>
              </tr>
            ) : hasRows ? (
              children
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {showLoading && hasRows && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-container-lowest/65 backdrop-blur-[1px] pointer-events-none">
            <div className="inline-flex items-center gap-2 rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface">
              <span className="material-symbols-outlined animate-spin text-base text-primary">progress_activity</span>
              Refreshing...
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
