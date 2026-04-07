import type { BoardingStatus } from '@/types/boarding.types';

export interface OwnerListingActions {
  canEdit: boolean;
  canSubmit: boolean;
  canDeactivate: boolean;
  canActivate: boolean;
  canArchive: boolean;
}

export function getOwnerListingActions(status: BoardingStatus): OwnerListingActions {
  return {
    canEdit: status !== 'PENDING_APPROVAL',
    canSubmit: status === 'DRAFT' || status === 'REJECTED' || status === 'INACTIVE',
    canDeactivate: status === 'ACTIVE',
    canActivate: status === 'INACTIVE',
    canArchive: status !== 'PENDING_APPROVAL',
  };
}
