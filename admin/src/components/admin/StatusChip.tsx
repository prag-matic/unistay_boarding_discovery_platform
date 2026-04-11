import { cn } from '../../lib/utils';
import type {
  BoardingStatus,
  MarketplaceReportStatus,
  MarketplaceStatus,
  PaymentStatus,
  ReservationStatus,
  VisitRequestStatus,
} from '../../services/api';

type StatusChipTone = 'auto' | 'neutral';
type StatusVariant = 'positive' | 'warning' | 'negative' | 'neutral';
type KnownStatus =
  | BoardingStatus
  | ReservationStatus
  | VisitRequestStatus
  | PaymentStatus
  | MarketplaceStatus
  | MarketplaceReportStatus;

interface StatusChipProps {
  value: string;
  className?: string;
  tone?: StatusChipTone;
}

const STATUS_VARIANT_MAP: Record<KnownStatus, StatusVariant> = {
  DRAFT: 'warning',
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'positive',
  REJECTED: 'negative',
  INACTIVE: 'negative',
  PENDING: 'warning',
  APPROVED: 'positive',
  COMPLETED: 'positive',
  CANCELLED: 'negative',
  EXPIRED: 'negative',
  CONFIRMED: 'positive',
  TAKEN_DOWN: 'negative',
  REMOVED: 'negative',
  OPEN: 'warning',
  RESOLVED: 'positive',
  DISMISSED: 'neutral',
};

const STATUS_STYLE_MAP: Record<StatusVariant, string> = {
  positive: 'bg-tertiary-container text-on-tertiary-fixed',
  warning: 'bg-primary-container text-on-primary-container',
  negative: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-high text-on-surface',
};

function getStatusVariant(value: string): StatusVariant {
  const normalized = value.trim().toUpperCase();
  if (normalized in STATUS_VARIANT_MAP) {
    return STATUS_VARIANT_MAP[normalized as KnownStatus];
  }
  return 'neutral';
}

function getStatusClasses(value: string, tone: StatusChipTone) {
  if (tone === 'neutral') return STATUS_STYLE_MAP.neutral;
  return STATUS_STYLE_MAP[getStatusVariant(value)];
}

export default function StatusChip({ value, className, tone = 'auto' }: StatusChipProps) {
  return <span className={cn('status-chip', getStatusClasses(value, tone), className)}>{value}</span>;
}
