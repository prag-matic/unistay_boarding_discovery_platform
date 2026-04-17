import { useEffect, useState, type ReactNode } from 'react';
import ConfirmationDialog from './admin/ConfirmationDialog';
import DetailModal from './admin/DetailModal';
import BoardingImageGallery from './admin/BoardingImageGallery';
import type { Boarding } from '../services/api';

interface Props {
  boarding: Boarding | null;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  footer?: ReactNode;
}

export default function BoardingDetailDrawer({ boarding, onClose, onApprove, onReject, footer }: Props) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  useEffect(() => {
    setIsRejecting(false);
    setRejectReason('');
    setShowApproveConfirm(false);
  }, [boarding?.id]);

  const formatAmenityLabel = (name: string) =>
    name
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const getAmenityIcon = (name: string) => {
    const amenity = name.toUpperCase();

    if (amenity.includes('WIFI')) return 'wifi';
    if (amenity.includes('AIR_CONDITIONING')) return 'ac_unit';
    if (amenity.includes('HOT_WATER')) return 'shower';
    if (amenity.includes('LAUNDRY')) return 'local_laundry_service';
    if (amenity.includes('PARKING')) return 'local_parking';
    if (amenity.includes('SECURITY')) return 'shield';
    if (amenity.includes('KITCHEN')) return 'kitchen';
    if (amenity.includes('GYM')) return 'fitness_center';
    if (amenity.includes('SWIMMING_POOL')) return 'pool';
    if (amenity.includes('STUDY_ROOM')) return 'menu_book';
    if (amenity.includes('COMMON_AREA')) return 'weekend';
    if (amenity.includes('BALCONY')) return 'balcony';
    if (amenity.includes('GENERATOR')) return 'bolt';
    if (amenity.includes('WATER_TANK')) return 'water_drop';
    return 'home';
  };

  if (!boarding) return null;
  const showApprovalActions = !footer && Boolean(onApprove) && Boolean(onReject);

  const handleRejectClick = () => {
    if (!onReject) return;

    if (isRejecting) {
      if (rejectReason.trim()) {
        onReject(rejectReason);
        setIsRejecting(false);
        setRejectReason('');
      }
      return;
    }

    setIsRejecting(true);
  };

  return (
    <>
      <DetailModal
        open={true}
        title={boarding.title}
        subtitle={`${boarding.city} / ${boarding.district}`}
        onClose={onClose}
        maxWidthClassName="max-w-3xl"
        footer={
          showApprovalActions ? (
            <>
              {isRejecting ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRejecting(false);
                    setRejectReason('');
                  }}
                  className="flex items-center justify-center gap-2 rounded-md border border-outline-variant/40 bg-surface px-3 py-2 text-sm font-semibold text-on-surface transition-all hover:bg-surface-container-high active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">undo</span>
                  Cancel
                </button>
              ) : null}
              <button
                onClick={handleRejectClick}
                className="flex items-center justify-center gap-2 rounded-md bg-error px-3 py-2 text-sm font-semibold text-on-error transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">cancel</span>
                {isRejecting ? 'Confirm Reject' : 'Reject Listing'}
              </button>
              {!isRejecting && (
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(true)}
                  className="flex items-center justify-center gap-2 rounded-md bg-tertiary px-3 py-2 text-sm font-semibold text-on-tertiary transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">verified</span>
                  Approve Listing
                </button>
              )}
            </>
          ) : (
            footer ?? null
          )
        }
      >
        <div className="space-y-6">
          <BoardingImageGallery boarding={boarding} />

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Description</h4>
            <p className="text-sm leading-relaxed text-on-surface/80">{boarding.description}</p>
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="space-y-4 md:pr-4 md:border-r md:border-outline-variant/25">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Boarding Type</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg text-primary">home</span>
                  <span>{boarding.boardingType}</span>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Gender Preference</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg text-primary">wc</span>
                  <span>{boarding.genderPref}</span>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">City / District</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg text-primary">map</span>
                  <span>{boarding.city} / {boarding.district}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 md:px-4 md:border-r md:border-outline-variant/25">
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Max Occupants</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg text-primary">groups</span>
                  <span>{boarding.maxOccupants}</span>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Current Occupants</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg text-primary">person</span>
                  <span>{boarding.currentOccupants}</span>
                </div>
              </div>
            </div>

            <div className="md:pl-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {boarding.amenities && boarding.amenities.length > 0 ? (
                  boarding.amenities.map((amenity) => (
                    <span
                      key={amenity.id}
                      className="inline-flex items-center gap-1 rounded-sm bg-surface-variant px-2.5 py-1 text-xs"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">{getAmenityIcon(amenity.name)}</span>
                      {formatAmenityLabel(amenity.name)}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">No amenities listed.</p>
                )}
              </div>
            </div>
          </section>

          {boarding.rules && boarding.rules.length > 0 && (
            <section className="pt-1">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Rules</h4>
              <ul className="space-y-2 text-sm text-on-surface/80">
                {boarding.rules.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-base text-primary">gavel</span>
                    <span>{rule.rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showApprovalActions && isRejecting && (
            <section className="space-y-2 pt-1">
              <label className="text-xs font-bold text-on-surface-variant">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="w-full resize-none rounded border border-outline-variant/30 bg-surface-container-lowest p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                placeholder="Enter reason for rejection..."
                autoFocus
              />
            </section>
          )}
        </div>
      </DetailModal>

      <ConfirmationDialog
        open={showApprovalActions && showApproveConfirm}
        title="Approve boarding listing"
        description="Confirm approval to publish this listing to students."
        confirmLabel="Approve"
        variant="success"
        onCancel={() => setShowApproveConfirm(false)}
        onConfirm={() => {
          onApprove?.();
          setShowApproveConfirm(false);
        }}
      />

    </>
  );
}
