import type { ReactNode } from 'react';

interface DetailModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export default function DetailModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidthClassName = 'max-w-3xl',
}: DetailModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-inverse-surface/45 backdrop-blur-xs" onClick={onClose} />
      <div className={`relative w-full ${maxWidthClassName} overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-[0px_20px_40px_rgba(42,52,57,0.1)]`}>
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 p-6">
          <div>
            <p className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">Detail Card</p>
            <h3 className="font-headline text-xl font-bold text-on-surface">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
            aria-label="Close detail card"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/50 p-4">{footer}</div>}
      </div>
    </div>
  );
}
