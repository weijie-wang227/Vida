import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../app/components/ui/dialog";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "../app/components/ui/carousel";

type ActivityImageGalleryProps = {
  images: string[];
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ActivityImageGallery({
  images,
  title,
  open,
  onOpenChange,
}: ActivityImageGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateSelectedIndex = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    updateSelectedIndex();
    api.on("select", updateSelectedIndex);
    api.on("reInit", updateSelectedIndex);

    return () => {
      api.off("select", updateSelectedIndex);
      api.off("reInit", updateSelectedIndex);
    };
  }, [api]);

  useEffect(() => {
    if (open) {
      api?.scrollTo(0, true);
    }
  }, [api, open]);

  if (images.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-none w-screen max-w-none gap-0 rounded-none border-0 bg-black p-0 text-white shadow-none">
        <DialogTitle className="sr-only">{title} image gallery</DialogTitle>

        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: images.length > 1 }}
          className="flex h-full w-full items-center"
          aria-label={`${title} image gallery`}
        >
          <CarouselContent className="ml-0 h-[100dvh]">
            {images.map((image, index) => (
              <CarouselItem
                key={`${image}-${index}`}
                className="flex h-[100dvh] items-center justify-center pl-0"
              >
                <img
                  src={image}
                  alt={`${title}, image ${index + 1} of ${images.length}`}
                  className="max-h-full w-full object-contain"
                  draggable={false}
                />
              </CarouselItem>
            ))}
          </CarouselContent>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition active:scale-95"
                aria-label="Previous activity image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition active:scale-95"
                aria-label="Next activity image"
              >
                <ChevronRight size={24} />
              </button>
              <div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                aria-live="polite"
              >
                {selectedIndex + 1} / {images.length}
              </div>
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
