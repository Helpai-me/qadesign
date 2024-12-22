import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image } from 'react-konva';
import { Slider } from '@/components/ui/slider';
import { loadImage } from '@/lib/imageProcessing';

interface ImageComparisonProps {
  originalImage: string;
  implementationImage: string;
}

export default function ImageComparison({ originalImage, implementationImage }: ImageComparisonProps) {
  const [opacity, setOpacity] = useState([0.5]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [images, setImages] = useState<{ original: HTMLImageElement | null, implementation: HTMLImageElement | null }>({
    original: null,
    implementation: null
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadImages = async () => {
      const [originalImg, implementationImg] = await Promise.all([
        loadImage(originalImage),
        loadImage(implementationImage)
      ]);

      setImages({
        original: originalImg,
        implementation: implementationImg
      });

      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / originalImg.width;
        setDimensions({
          width: containerWidth,
          height: originalImg.height * scale
        });
      }
    };

    loadImages();
  }, [originalImage, implementationImage]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full overflow-hidden border rounded-lg">
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {images.implementation && (
              <Image
                image={images.implementation}
                width={dimensions.width}
                height={dimensions.height}
                opacity={1}
              />
            )}
            {images.original && (
              <Image
                image={images.original}
                width={dimensions.width}
                height={dimensions.height}
                opacity={opacity[0]}
              />
            )}
          </Layer>
        </Stage>
      </div>

      <div className="w-full px-4">
        <Slider
          value={opacity}
          onValueChange={setOpacity}
          min={0}
          max={1}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>Implementation</span>
          <span>Original</span>
        </div>
      </div>
    </div>
  );
}
