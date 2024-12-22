import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import { loadImage } from '@/lib/imageProcessing';

interface DifferenceDetectorProps {
  originalImage: string;
  implementationImage: string;
}

interface Difference {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function DifferenceDetector({ originalImage, implementationImage }: DifferenceDetectorProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [differences, setDifferences] = useState<Difference[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<{
    original: HTMLImageElement | null;
    implementation: HTMLImageElement | null;
  }>({
    original: null,
    implementation: null,
  });

  useEffect(() => {
    const loadImages = async () => {
      const [originalImg, implementationImg] = await Promise.all([
        loadImage(originalImage),
        loadImage(implementationImage),
      ]);

      setImages({
        original: originalImg,
        implementation: implementationImg,
      });

      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / originalImg.width;
        setDimensions({
          width: containerWidth,
          height: originalImg.height * scale,
        });
      }
    };

    loadImages();
  }, [originalImage, implementationImage]);

  useEffect(() => {
    const detectDifferences = () => {
      if (!images.original || !images.implementation) return;

      const canvas1 = document.createElement('canvas');
      const canvas2 = document.createElement('canvas');
      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');

      if (!ctx1 || !ctx2) return;

      canvas1.width = images.original.width;
      canvas1.height = images.original.height;
      canvas2.width = images.implementation.width;
      canvas2.height = images.implementation.height;

      ctx1.drawImage(images.original, 0, 0);
      ctx2.drawImage(images.implementation, 0, 0);

      const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
      const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);

      // Incrementamos significativamente los umbrales
      const threshold = 80; // Mayor umbral para diferencias de color
      const minDiffArea = 50; // Área mínima más grande
      const diffAreas: Difference[] = [];
      let currentArea: Difference | null = null;

      // Analizamos menos píxeles para optimizar y reducir falsos positivos
      for (let y = 0; y < canvas1.height; y += 4) {
        for (let x = 0; x < canvas1.width; x += 4) {
          const i = (y * canvas1.width + x) * 4;
          const diff = Math.abs(imageData1.data[i] - imageData2.data[i]) +
                      Math.abs(imageData1.data[i + 1] - imageData2.data[i + 1]) +
                      Math.abs(imageData1.data[i + 2] - imageData2.data[i + 2]);

          if (diff > threshold) {
            if (!currentArea) {
              currentArea = { x, y, width: 4, height: 4 };
            } else if (x - (currentArea.x + currentArea.width) < 10) {
              currentArea.width = x - currentArea.x + 4;
            } else {
              if (currentArea.width * currentArea.height > minDiffArea) {
                diffAreas.push(currentArea);
              }
              currentArea = { x, y, width: 4, height: 4 };
            }
          }
        }

        if (currentArea) {
          currentArea.height += 4;
          if (currentArea.height > 40 || y === canvas1.height - 1) {
            if (currentArea.width * currentArea.height > minDiffArea) {
              diffAreas.push(currentArea);
            }
            currentArea = null;
          }
        }
      }

      // Agrupamos áreas cercanas con un umbral mayor
      const mergedAreas = diffAreas.reduce((acc: Difference[], curr) => {
        const nearby = acc.find(area =>
          Math.abs(area.x - curr.x) < 40 &&
          Math.abs(area.y - curr.y) < 40
        );

        if (nearby) {
          nearby.x = Math.min(nearby.x, curr.x);
          nearby.y = Math.min(nearby.y, curr.y);
          nearby.width = Math.max(nearby.width + 20, curr.width);
          nearby.height = Math.max(nearby.height + 20, curr.height);
          return acc;
        }

        return [...acc, curr];
      }, []);

      // Solo mostramos las áreas más grandes
      const significantDifferences = mergedAreas.filter(
        area => area.width * area.height > minDiffArea * 2
      );

      const scale = dimensions.width / canvas1.width;
      setDifferences(significantDifferences.map(area => ({
        x: area.x * scale,
        y: area.y * scale,
        width: area.width * scale,
        height: area.height * scale,
      })));
    };

    if (images.original && images.implementation && dimensions.width > 0) {
      detectDifferences();
    }
  }, [images, dimensions]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="border rounded-lg overflow-hidden">
        <Stage width={dimensions.width} height={dimensions.height}>
          <Layer>
            {images.implementation && (
              <Image
                image={images.implementation}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}
            {differences.map((diff, i) => (
              <Rect
                key={i}
                x={diff.x}
                y={diff.y}
                width={diff.width}
                height={diff.height}
                fill="rgba(255, 0, 0, 0.2)"
                stroke="rgba(255, 0, 0, 0.4)"
                strokeWidth={1}
              />
            ))}
          </Layer>
        </Stage>
      </div>
      <div className="text-sm text-muted-foreground">
        Diferencias significativas detectadas: {differences.length}
      </div>
    </div>
  );
}