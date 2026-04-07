import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Boarding, BoardingStatusHistoryEntry } from '../services/api';

interface Props {
  boarding: Boarding | null;
  history: BoardingStatusHistoryEntry[];
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export default function BoardingDetailDrawer({ boarding, history, onClose, onApprove, onReject }: Props) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsRejecting(false);
    setRejectReason('');
    setActiveImageIndex(null);
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

  const handleRejectClick = () => {
    if (isRejecting) {
      if (rejectReason.trim()) {
        onReject(rejectReason);
        setIsRejecting(false);
        setRejectReason('');
      }
    } else {
      setIsRejecting(true);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-inverse-surface/20 backdrop-blur-[4px] z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-[450px] z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[-20px_0px_40px_rgba(42,52,57,0.06)] translate-x-0 transition-transform flex flex-col border-l border-outline-variant/10">
        <div className="p-6 flex items-center justify-between border-b border-outline-variant/10 shrink-0">
          <div>
            <span className="font-label text-[10px] uppercase tracking-widest text-primary">Listing Detail</span>
            <h3 className="font-headline text-xl font-bold">{boarding.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto thin-scrollbar p-6 space-y-8">
          {boarding.images && boarding.images.length > 0 && (
            <section>
              <div className="grid grid-cols-4 gap-2 h-48">
                <button
                  type="button"
                  onClick={() => setActiveImageIndex(0)}
                  className="col-span-3 rounded-lg overflow-hidden relative cursor-zoom-in"
                >
                  <img src={boarding.images[0].url} className="w-full h-full object-cover" alt="Main" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </button>
                {boarding.images.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex(1)}
                      className="flex-1 rounded-lg overflow-hidden cursor-zoom-in"
                    >
                      <img src={boarding.images[1].url} className="w-full h-full object-cover" alt="Secondary" referrerPolicy="no-referrer" />
                    </button>
                    {boarding.images.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex(2)}
                        className="flex-1 rounded-lg overflow-hidden relative cursor-zoom-in"
                      >
                        <img src={boarding.images[2].url} className="w-full h-full object-cover" alt="Tertiary" referrerPolicy="no-referrer" />
                        {boarding.images.length > 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                            +{boarding.images.length - 3}
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveImageIndex(0)}
                className="mt-3 text-xs font-bold text-primary hover:underline"
              >
                View Gallery
              </button>
            </section>
          )}

          <section>
            <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Description</h4>
            <p className="text-sm text-on-surface/80 leading-relaxed">
              {boarding.description}
            </p>
          </section>

            <section className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Boarding Type</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">home</span>
                <span>{boarding.boardingType}</span>
              </div>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Gender Preference</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">wc</span>
                <span>{boarding.genderPref}</span>
              </div>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Max Occupants</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">groups</span>
                <span>{boarding.maxOccupants}</span>
              </div>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Current Occupants</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">person</span>
                <span>{boarding.currentOccupants}</span>
              </div>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">City</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">location_city</span>
                <span>{boarding.city}</span>
              </div>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">District</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">map</span>
                <span>{boarding.district}</span>
              </div>
            </div>
          </section>

          {boarding.amenities && boarding.amenities.length > 0 && (
            <section>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {boarding.amenities.map((amenity) => (
                  <span key={amenity.id} className="bg-surface-variant text-xs px-3 py-1 rounded-sm inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">{getAmenityIcon(amenity.name)}</span>
                    {formatAmenityLabel(amenity.name)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {boarding.rules && boarding.rules.length > 0 && (
            <section>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Rules</h4>
              <ul className="space-y-2 text-sm text-on-surface/80">
                {boarding.rules.map((rule) => {
                  let icon = 'info';
                  let colorClass = 'text-primary';
                  if (rule.rule.toLowerCase().includes('smoking')) {
                    icon = 'smoke_free';
                    colorClass = 'text-error';
                  } else if (rule.rule.toLowerCase().includes('pet')) {
                    icon = 'pets';
                    colorClass = 'text-error';
                  } else if (rule.rule.toLowerCase().includes('quiet') || rule.rule.toLowerCase().includes('time')) {
                    icon = 'alarm';
                  }

                  return (
                    <li key={rule.id} className="flex items-center gap-3">
                      <span className={cn('material-symbols-outlined text-base', colorClass)}>{icon}</span>
                      <span>{rule.rule}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Status History</h4>
            {history.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No lifecycle events recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.slice(0, 8).map((entry) => (
                  <li key={entry.id} className="bg-surface-container-low rounded-md p-2">
                    <div className="font-medium">{entry.fromStatus} → {entry.toStatus}</div>
                    <div className="text-on-surface-variant text-xs">
                      {entry.action} · {entry.actorRole} · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </div>
                    {(entry.reason || entry.note) && (
                      <div className="text-xs mt-1 text-on-surface-variant">
                        {[entry.reason, entry.note].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="p-6 bg-surface-container-low/50 border-t border-outline-variant/10 flex flex-col gap-4 shrink-0">
          {isRejecting && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="w-full text-sm p-2 rounded border border-outline-variant/30 bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={3}
                placeholder="Enter reason for rejection..."
                autoFocus
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleRejectClick}
              className="flex items-center justify-center gap-2 py-3 bg-error text-on-error rounded-md font-bold text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              {isRejecting ? 'CONFIRM REJECT' : 'REJECT LISTING'}
            </button>
            {isRejecting && (
              <button
                type="button"
                onClick={() => {
                  setIsRejecting(false);
                  setRejectReason('');
                }}
                className="flex items-center justify-center gap-2 py-3 bg-surface text-on-surface border border-outline-variant/40 rounded-md font-bold text-sm tracking-wide transition-all hover:bg-surface-container-high active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">undo</span>
                CANCEL
              </button>
            )}
            {!isRejecting && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to approve this boarding listing?')) {
                    onApprove();
                  }
                }}
                className="flex items-center justify-center gap-2 py-3 bg-tertiary text-on-tertiary rounded-md font-bold text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">verified</span>
                APPROVE LISTING
              </button>
            )}
          </div>
        </div>
      </div>

      {activeImageIndex !== null && boarding.images && boarding.images[activeImageIndex] && (
        <div
          className="fixed inset-0 z-[60] bg-inverse-surface/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveImageIndex(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-surface-container-lowest rounded-xl p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImageIndex(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-inverse-surface text-inverse-on-surface shadow-md hover:opacity-90"
              aria-label="Close gallery"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="relative h-[70vh] flex items-center justify-center">
              <img
                src={boarding.images[activeImageIndex].url}
                alt={`Boarding image ${activeImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
              {boarding.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev! - 1 + boarding.images.length) % boarding.images.length)
                    }
                    className="absolute left-2 p-2 rounded-full bg-surface-container/90 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev! + 1) % boarding.images.length)
                    }
                    className="absolute right-2 p-2 rounded-full bg-surface-container/90 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </>
              )}
            </div>
            {boarding.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto thin-scrollbar pb-1">
                {boarding.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={cn(
                      'h-14 w-20 rounded overflow-hidden border-2 shrink-0',
                      index === activeImageIndex ? 'border-primary' : 'border-transparent',
                    )}
                  >
                    <img
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
