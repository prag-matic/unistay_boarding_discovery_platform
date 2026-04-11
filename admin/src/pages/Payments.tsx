import { useEffect, useState } from 'react';
import BulkActionBar from '../components/admin/BulkActionBar';
import ConfirmationDialog from '../components/admin/ConfirmationDialog';
import DetailModal from '../components/admin/DetailModal';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
import {
  api,
  type AdminPayment,
  type ApiClientError,
  type Pagination,
  type PaymentStatus,
} from '../services/api';

const PAGE_SIZE = 20;

type RejectDialogState =
  | { mode: 'single'; paymentId: string }
  | { mode: 'bulk' }
  | null;

export default function Payments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const hasActiveFilters =
    search.trim().length > 0 ||
    status !== '' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    createdFrom !== '' ||
    createdTo !== '';

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setMinAmount('');
    setMaxAmount('');
    setCreatedFrom('');
    setCreatedTo('');
  };

  const pendingPaymentIds = payments
    .filter((payment) => payment.status === 'PENDING')
    .map((payment) => payment.id);

  const fetchPayments = async (nextPage = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getPayments({
        page: nextPage,
        size: PAGE_SIZE,
        status: status || undefined,
        search: search.trim() || undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
      });
      setPayments(response.payments);
      setPagination(response.pagination);
      setSelectedPaymentIds([]);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const payment = payments.find((item) => item.id === id);
    if (!payment || payment.status !== 'PENDING') return;

    setSelectedPaymentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (pendingPaymentIds.length === 0) {
      setSelectedPaymentIds([]);
      return;
    }

    if (selectedPaymentIds.length === pendingPaymentIds.length) {
      setSelectedPaymentIds([]);
      return;
    }
    setSelectedPaymentIds(pendingPaymentIds);
  };

  const confirmPayment = async (id: string) => {
    setActionLoadingId(id);
    setError('');
    try {
      await api.confirmPaymentByAdmin(id);
      await fetchPayments(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to confirm payment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectPayment = async (id: string, reason: string) => {
    setActionLoadingId(id);
    setError('');
    try {
      await api.rejectPaymentByAdmin(id, reason);
      await fetchPayments(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to reject payment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const bulkConfirm = async () => {
    if (selectedPaymentIds.length === 0) return;
    setError('');
    try {
      await api.confirmPaymentsBulk(selectedPaymentIds);
      await fetchPayments(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to confirm selected payments');
    }
  };

  const bulkReject = async (reason: string) => {
    if (selectedPaymentIds.length === 0) return;
    setError('');
    try {
      await api.rejectPaymentsBulk(selectedPaymentIds, reason);
      await fetchPayments(pagination.page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to reject selected payments');
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!reason || !rejectDialog) return;

    if (rejectDialog.mode === 'single') {
      await rejectPayment(rejectDialog.paymentId, reason);
      setRejectDialog(null);
      return;
    }

    await bulkReject(reason);
    setRejectDialog(null);
  };

  useEffect(() => {
    void fetchPayments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, minAmount, maxAmount, createdFrom, createdTo]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchPayments(1);
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <>
    <div className="h-full flex flex-col p-8 gap-6 overflow-y-auto thin-scrollbar">
      <div>
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">Payments Oversight</p>
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Payments</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference or proof URL"
              className="focus-ring-control px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Status</p>
            <select
              value={status}
              onChange={(event) => setStatus((event.target.value as PaymentStatus | '') || '')}
              className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
            >
              <option value="">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Min amount</p>
            <input
              type="number"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="0"
              className="focus-ring-control py-2.5 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-36"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Max amount</p>
            <input
              type="number"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="Any"
              className="focus-ring-control py-2.5 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-36"
            />
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

      <BulkActionBar count={selectedPaymentIds.length} onClear={() => setSelectedPaymentIds([])}>
        <button className="px-3 py-1 rounded text-xs bg-tertiary text-on-tertiary" onClick={() => void bulkConfirm()}>
          Confirm Selected
        </button>
        <button className="px-3 py-1 rounded text-xs bg-error text-on-error" onClick={() => setRejectDialog({ mode: 'bulk' })}>
          Reject Selected
        </button>
      </BulkActionBar>

          <DataTable
            columns={['', 'Payment', 'Boarding', 'Amount', 'Method', 'Status', 'Actions']}
            loading={loading}
            emptyText="No payments found."
            colSpan={7}
          >
            {payments.map((payment) => (
              <tr
                key={payment.id}
                onClick={() => setSelectedPayment(payment)}
                className="cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedPaymentIds.includes(payment.id)}
                    onChange={() => toggleSelect(payment.id)}
                    disabled={payment.status !== 'PENDING'}
                  />
                </td>
                <td className="px-6 py-4 text-xs">
                  <div className="font-mono text-on-surface-variant">{payment.id}</div>
                  <div>{payment.referenceNumber ?? '—'}</div>
                </td>
                <td className="px-6 py-4 text-sm">{payment.reservation?.boarding?.title ?? '—'}</td>
                <td className="px-6 py-4 text-sm">LKR {payment.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">{payment.paymentMethod}</td>
                <td className="px-6 py-4 text-xs">
                  <StatusChip value={payment.status} />
                </td>
                <td className="px-6 py-4 text-center" onClick={(event) => event.stopPropagation()}>
                  {payment.status === 'PENDING' ? (
                    <div className="flex justify-center gap-2">
                      <button
                        className="px-2 py-1 text-xs bg-tertiary text-on-tertiary rounded disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                        disabled={actionLoadingId === payment.id}
                        onClick={() => void confirmPayment(payment.id)}
                      >
                        {actionLoadingId === payment.id ? 'Processing...' : 'Confirm'}
                      </button>
                      <button
                        className="px-2 py-1 text-xs bg-error text-on-error rounded disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                        disabled={actionLoadingId === payment.id}
                        onClick={() => setRejectDialog({ mode: 'single', paymentId: payment.id })}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">No available actions</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={pendingPaymentIds.length > 0 && selectedPaymentIds.length === pendingPaymentIds.length}
              onChange={toggleSelectAll}
              disabled={pendingPaymentIds.length === 0}
            />
            <span className="text-xs text-on-surface-variant">Select all pending on page</span>
          </div>

          <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
          <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.totalPages}</p>
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              loading={loading}
              onPrev={() => void fetchPayments(pagination.page - 1)}
              onNext={() => void fetchPayments(pagination.page + 1)}
            />
        </div>

        <DetailModal
          open={selectedPayment !== null}
          title={selectedPayment ? `Payment ${selectedPayment.id}` : 'Payment details'}
          subtitle={selectedPayment?.reservation?.boarding?.title}
          onClose={() => setSelectedPayment(null)}
          maxWidthClassName="max-w-4xl"
          footer={
            selectedPayment ? (
              selectedPayment.status === 'PENDING' ? (
                <>
                  <button
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-tertiary text-on-tertiary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                    onClick={() => void confirmPayment(selectedPayment.id)}
                    disabled={actionLoadingId === selectedPayment.id}
                  >
                    {actionLoadingId === selectedPayment.id ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-error text-on-error border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
                    onClick={() => setRejectDialog({ mode: 'single', paymentId: selectedPayment.id })}
                    disabled={actionLoadingId === selectedPayment.id}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <span className="text-sm text-on-surface-variant">No available actions</span>
              )
            ) : null
          }
        >
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Payment ID</label>
                  <p className="mt-1 font-mono text-sm text-on-surface">{selectedPayment.id}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Status</label>
                  <div className="mt-1"><StatusChip value={selectedPayment.status} /></div>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Amount</label>
                  <p className="mt-1 text-sm text-on-surface">LKR {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Method</label>
                  <p className="mt-1 text-sm text-on-surface">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Boarding</label>
                  <p className="mt-1 text-sm text-on-surface">{selectedPayment.reservation?.boarding?.title ?? '—'}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Reference Number</label>
                  <p className="mt-1 text-sm text-on-surface">{selectedPayment.referenceNumber ?? '—'}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Paid At</label>
                  <p className="mt-1 text-sm text-on-surface">{new Date(selectedPayment.paidAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Created At</label>
                  <p className="mt-1 text-sm text-on-surface">{new Date(selectedPayment.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Confirmed At</label>
                  <p className="mt-1 text-sm text-on-surface">{selectedPayment.confirmedAt ? new Date(selectedPayment.confirmedAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Student ID</label>
                  <p className="mt-1 text-sm text-on-surface">{selectedPayment.studentId}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Reservation ID</label>
                  <p className="mt-1 text-sm text-on-surface">{selectedPayment.reservationId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Rental Period</label>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {selectedPayment.rentalPeriod?.periodLabel ?? '—'}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Due: {selectedPayment.rentalPeriod?.dueDate ? new Date(selectedPayment.rentalPeriod.dueDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Rejection Reason</label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface-variant">{selectedPayment.rejectionReason ?? '—'}</p>
                </div>
              </div>

              <div>
                <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Proof Image</label>
                {selectedPayment.proofImageUrl ? (
                  <a href={selectedPayment.proofImageUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                    <img
                      src={selectedPayment.proofImageUrl}
                      alt="Payment proof"
                      className="max-h-64 w-full rounded-md border border-outline-variant/25 object-contain bg-surface-container-low"
                    />
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-on-surface-variant">No proof image uploaded.</p>
                )}
              </div>
            </div>
          )}
        </DetailModal>
    </div>
    <ConfirmationDialog
      open={rejectDialog !== null}
      title={rejectDialog?.mode === 'bulk' ? 'Reject selected payments' : 'Reject payment'}
      description="Provide a rejection reason. This will be saved in payment moderation logs."
      confirmLabel="Reject"
      variant="danger"
      requireReason
      reasonLabel="Rejection Reason"
      reasonPlaceholder="Enter rejection reason"
      onCancel={() => setRejectDialog(null)}
      onConfirm={(reason) => {
        void handleRejectConfirm(reason);
      }}
    />
    </>
  );
}
