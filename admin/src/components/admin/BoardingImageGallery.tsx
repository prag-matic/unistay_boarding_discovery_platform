import { useEffect, useState } from 'react';
import type { Boarding } from '../../services/api';

interface BoardingImageGalleryProps {
  boarding: Pick<Boarding, 'images' | 'title'>;
}

export default function BoardingImageGallery({ boarding }: BoardingImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveImageIndex(null);
  }, [boarding.title, boarding.images?.length]);

  if (!boarding.images || boarding.images.length === 0) return null;

  const activeImage = activeImageIndex !== null ? boarding.images[activeImageIndex] : null;

  return (
    <>
      <section>
        <div className="grid h-44 grid-cols-3 grid-rows-2 gap-2 md:h-48">
          <button
            type="button"
            onClick={() => setActiveImageIndex(0)}
            className="col-span-2 row-span-2 relative overflow-hidden rounded-lg cursor-zoom-in"
          >
            <img
              src={boarding.images[0].url}
              className="h-full w-full object-cover"
              alt="Main"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
          </button>
          {boarding.images.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveImageIndex(1)}
              className={`overflow-hidden rounded-lg cursor-zoom-in ${boarding.images.length === 2 ? 'row-span-2' : 'row-span-1'}`}
            >
              <img
                src={boarding.images[1].url}
                className="h-full w-full object-cover"
                alt="Secondary"
                referrerPolicy="no-referrer"
              />
            </button>
          )}
          {boarding.images.length > 2 && (
            <button
              type="button"
              onClick={() => setActiveImageIndex(2)}
              className="relative row-span-1 overflow-hidden rounded-lg cursor-zoom-in"
            >
              <img
                src={boarding.images[2].url}
                className="h-full w-full object-cover"
                alt="Tertiary"
                referrerPolicy="no-referrer"
              />
              {boarding.images.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                  +{boarding.images.length - 3}
                </div>
              )}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setActiveImageIndex(0)}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          View Gallery
        </button>
      </section>

      {activeImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-inverse-surface/80 p-4 backdrop-blur-sm"
          onClick={() => setActiveImageIndex(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl rounded-xl bg-surface-container-lowest p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImageIndex(null)}
              className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface shadow-md hover:opacity-90"
              aria-label="Close gallery"
            >
              <span className="material-symbols-outlined leading-none">close</span>
            </button>
            <div className="relative flex h-[66vh] items-center justify-center">
              <img
                src={activeImage.url}
                alt={`Boarding image ${activeImageIndex! + 1}`}
                className="max-h-full max-w-full rounded-lg object-contain"
                referrerPolicy="no-referrer"
              />
              {boarding.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev! - 1 + boarding.images.length) % boarding.images.length)
                    }
                    className="absolute left-2 rounded-full bg-surface-container/90 p-2 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev! + 1) % boarding.images.length)}
                    className="absolute right-2 rounded-full bg-surface-container/90 p-2 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </>
              )}
            </div>
            {boarding.images.length > 1 && (
              <div className="thin-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {boarding.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-12 w-18 shrink-0 overflow-hidden rounded border-2 ${index === activeImageIndex ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
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
