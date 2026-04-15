import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

type DialogVariant = 'danger' | 'primary' | 'success';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  initialReason?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

const confirmButtonClassMap: Record<DialogVariant, string> = {
  danger: 'bg-error text-on-error hover:brightness-110',
  primary: 'bg-primary text-on-primary hover:brightness-110',
  success: 'bg-tertiary text-on-tertiary hover:brightness-110',
};

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter a reason...',
  initialReason,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [reason, setReason] = useState(initialReason ?? '');

  useEffect(() => {
    if (!open) return;
    setReason(initialReason ?? '');
  }, [open, initialReason]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const reasonValue = reason.trim();
  const confirmDisabled = requireReason && !reasonValue;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        className="absolute inset-0 bg-inverse-surface/45"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-[0px_20px_40px_rgba(42,52,57,0.1)] p-6">
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        {description && <p className="mt-2 text-sm text-on-surface-variant">{description}</p>}

        {requireReason && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant mb-2">
              {reasonLabel}
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="focus-ring-control w-full text-sm p-2 rounded border border-outline-variant/40 bg-surface-container-lowest resize-none"
              rows={3}
              placeholder={reasonPlaceholder}
              autoFocus
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-outline-variant/40 bg-surface text-on-surface text-sm font-semibold hover:bg-surface-container-high"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(requireReason ? reasonValue : undefined)}
            disabled={confirmDisabled}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-semibold transition',
              confirmButtonClassMap[variant],
              'disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
