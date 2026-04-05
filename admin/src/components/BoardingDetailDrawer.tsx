import { Boarding } from '../services/api';
import { cn } from '../lib/utils';
import { useState } from 'react';

interface Props {
  boarding: Boarding | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export default function BoardingDetailDrawer({ boarding, onClose, onApprove, onReject }: Props) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-inverse-surface/20 backdrop-blur-[4px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[450px] z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[-20px_0px_40px_rgba(42,52,57,0.06)] translate-x-0 transition-transform flex flex-col border-l border-outline-variant/10">
        {/* Header */}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-6 space-y-8">
          {/* Image Gallery */}
          {boarding.images.length > 0 && (
            <section>
              <div className="grid grid-cols-4 gap-2 h-48">
                <div className="col-span-3 rounded-lg overflow-hidden relative">
                  <img src={boarding.images[0]} className="w-full h-full object-cover" alt="Main" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
                {boarding.images.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex-1 rounded-lg overflow-hidden">
                      <img src={boarding.images[1]} className="w-full h-full object-cover" alt="Secondary" referrerPolicy="no-referrer" />
                    </div>
                    {boarding.images.length > 2 && (
                      <div className="flex-1 rounded-lg overflow-hidden relative">
                        <img src={boarding.images[2]} className="w-full h-full object-cover" alt="Tertiary" referrerPolicy="no-referrer" />
                        {boarding.images.length > 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                            +{boarding.images.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Description */}
          <section>
            <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Description</h4>
            <p className="text-sm text-on-surface/80 leading-relaxed">
              {boarding.description}
            </p>
          </section>

          {/* Details Grid */}
          <section className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Occupancy</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">group</span>
                <span>{boarding.occupancy}</span>
              </div>
            </div>
            <div>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">Rent Term</h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                <span>{boarding.rentTerm}</span>
              </div>
            </div>
          </section>

          {/* Amenities */}
          {boarding.amenities.length > 0 && (
            <section>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {boarding.amenities.map(amenity => (
                  <span key={amenity} className="bg-surface-variant text-xs px-3 py-1 rounded-sm">{amenity}</span>
                ))}
              </div>
            </section>
          )}

          {/* Rules */}
          {boarding.rules.length > 0 && (
            <section>
              <h4 className="font-label text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">House Rules</h4>
              <ul className="space-y-2 text-sm text-on-surface/80">
                {boarding.rules.map((rule, idx) => {
                  let icon = 'info';
                  let colorClass = 'text-primary';
                  if (rule.toLowerCase().includes('smoking')) {
                    icon = 'smoke_free';
                    colorClass = 'text-error';
                  } else if (rule.toLowerCase().includes('pet')) {
                    icon = 'pets';
                    colorClass = 'text-error';
                  } else if (rule.toLowerCase().includes('quiet') || rule.toLowerCase().includes('time')) {
                    icon = 'alarm';
                  }

                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={cn("material-symbols-outlined text-base", colorClass)}>{icon}</span>
                      <span>{rule}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Sticky Actions Footer */}
        <div className="p-6 bg-surface-container-low/50 border-t border-outline-variant/10 flex flex-col gap-4 shrink-0">
          {isRejecting && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant">Rejection Reason</label>
              <textarea 
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
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
            <button 
              onClick={onApprove}
              disabled={isRejecting}
              className="flex items-center justify-center gap-2 py-3 bg-tertiary text-on-tertiary rounded-md font-bold text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              APPROVE LISTING
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
