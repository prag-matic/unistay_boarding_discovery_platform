import type { BoardingStatus } from '@/types/boarding.types';

type TransitionSpec = Record<string, { allowedFrom: BoardingStatus[]; actorRoles: string[] }>;

export interface OwnerListingActions {
  canEdit: boolean;
  canSubmit: boolean;
  canDelete: boolean;
  canDeactivate: boolean;
  canActivate: boolean;
  canArchive: boolean;
}

const FALLBACK_TRANSITIONS: TransitionSpec = {
  OWNER_UPDATE: {
    allowedFrom: ['DRAFT', 'REJECTED', 'INACTIVE', 'ACTIVE'],
    actorRoles: ['OWNER'],
  },
  OWNER_DELETE: {
    allowedFrom: ['DRAFT'],
    actorRoles: ['OWNER'],
  },
  OWNER_SUBMIT: {
    allowedFrom: ['DRAFT', 'REJECTED', 'INACTIVE'],
    actorRoles: ['OWNER'],
  },
  OWNER_DEACTIVATE: {
    allowedFrom: ['ACTIVE'],
    actorRoles: ['OWNER'],
  },
  OWNER_REACTIVATE: {
    allowedFrom: ['INACTIVE'],
    actorRoles: ['OWNER'],
  },
  OWNER_ARCHIVE: {
    allowedFrom: ['DRAFT', 'REJECTED', 'INACTIVE', 'ACTIVE'],
    actorRoles: ['OWNER'],
  },
};

function canOwnerPerform(
  action: keyof typeof FALLBACK_TRANSITIONS,
  status: BoardingStatus,
  transitions?: TransitionSpec,
): boolean {
  const matrix = transitions ?? FALLBACK_TRANSITIONS;
  const transition = matrix[action];
  if (!transition) return false;
  return transition.actorRoles.includes('OWNER') && transition.allowedFrom.includes(status);
}

export function getOwnerListingActions(
  status: BoardingStatus,
  transitions?: TransitionSpec,
): OwnerListingActions {
  return {
    canEdit: canOwnerPerform('OWNER_UPDATE', status, transitions),
    canSubmit: canOwnerPerform('OWNER_SUBMIT', status, transitions),
    canDelete: canOwnerPerform('OWNER_DELETE', status, transitions),
    canDeactivate: canOwnerPerform('OWNER_DEACTIVATE', status, transitions),
    canActivate: canOwnerPerform('OWNER_REACTIVATE', status, transitions),
    canArchive: canOwnerPerform('OWNER_ARCHIVE', status, transitions),
  };
}
