import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import { loadImage } from '@/lib/imageProcessing';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DifferenceDetectorProps {
  originalImage: string;
  implementationImage: string;
}

interface DesignDifference {
  type: 'spacing' | 'margin';
  description: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function DifferenceDetector({ originalImage, implementationImage }: DifferenceDetectorProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [differences, setDifferences] = useState<DesignDifference[]>([]);
  const [selectedDifference, setSelectedDifference] = useState<number | null>(null);
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
    const analyzeSpacingDifferences = () => {
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

      const designDifferences: DesignDifference[] = [];

      // Analizar diferencias de espaciado
      const spacingThreshold = 16; // Aumentado para ser más selectivo
      let whitespaceRegions1 = detectWhitespaceRegions(imageData1, canvas1.width, canvas1.height);
      let whitespaceRegions2 = detectWhitespaceRegions(imageData2, canvas2.width, canvas2.height);

      // Filtrar regiones pequeñas
      whitespaceRegions1 = whitespaceRegions1.filter(r => r.width > 20);
      whitespaceRegions2 = whitespaceRegions2.filter(r => r.width > 20);

      // Comparar solo las regiones más significativas
      for (let i = 0; i < Math.min(whitespaceRegions1.length, whitespaceRegions2.length); i++) {
        const region1 = whitespaceRegions1[i];
        const region2 = whitespaceRegions2[i];

        if (Math.abs(region1.width - region2.width) > spacingThreshold) {
          designDifferences.push({
            type: 'spacing',
            description: `Espaciado inconsistente en ${region1.y * dimensions.height / canvas1.height}px desde el tope (${Math.abs(region1.width - region2.width)}px vs ${region2.width}px)`,
            location: {
              x: region1.x * dimensions.width / canvas1.width,
              y: region1.y * dimensions.height / canvas1.height,
              width: Math.max(region1.width, region2.width) * dimensions.width / canvas1.width,
              height: 40
            }
          });
        }
      }

      // Analizar márgenes laterales
      const margins1 = detectMargins(imageData1, canvas1.width, canvas1.height);
      const margins2 = detectMargins(imageData2, canvas2.width, canvas2.height);
      const marginThreshold = 16; // Aumentado para ser más selectivo

      if (Math.abs(margins1.left - margins2.left) > marginThreshold) {
        designDifferences.push({
          type: 'margin',
          description: `Margen izquierdo inconsistente (${margins1.left}px vs ${margins2.left}px)`,
          location: {
            x: 0,
            y: 0,
            width: Math.max(margins1.left, margins2.left) * dimensions.width / canvas1.width,
            height: dimensions.height
          }
        });
      }

      if (Math.abs(margins1.right - margins2.right) > marginThreshold) {
        designDifferences.push({
          type: 'margin',
          description: `Margen derecho inconsistente (${canvas1.width - margins1.right}px vs ${canvas2.width - margins2.right}px)`,
          location: {
            x: Math.min(margins1.right, margins2.right) * dimensions.width / canvas1.width,
            y: 0,
            width: dimensions.width - Math.min(margins1.right, margins2.right) * dimensions.width / canvas1.width,
            height: dimensions.height
          }
        });
      }

      setDifferences(designDifferences);
    };

    if (images.original && images.implementation && dimensions.width > 0) {
      analyzeSpacingDifferences();
    }
  }, [images, dimensions]);

  const detectWhitespaceRegions = (imageData: ImageData, width: number, height: number) => {
    const regions = [];
    // Analizar cada 40 píxeles para reducir el ruido
    for (let y = 0; y < height; y += 40) {
      let start = null;
      let whiteCount = 0;

      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isWhite = imageData.data[i] > 240 &&
                       imageData.data[i + 1] > 240 &&
                       imageData.data[i + 2] > 240;

        if (isWhite) {
          whiteCount++;
          if (start === null) start = x;
        } else {
          if (start !== null && whiteCount > 20) { // Solo considerar espacios blancos significativos
            regions.push({
              x: start,
              y,
              width: x - start,
              height: 40
            });
          }
          start = null;
          whiteCount = 0;
        }
      }
    }
    return regions;
  };

  const detectMargins = (imageData: ImageData, width: number, height: number) => {
    let left = width;
    let right = 0;
    let contentFound = false;

    // Analizar solo los bordes laterales
    for (let y = 0; y < height; y += 2) { // Saltar píxeles para optimizar
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const hasContent = imageData.data[i] < 240 ||
                          imageData.data[i + 1] < 240 ||
                          imageData.data[i + 2] < 240;

        if (hasContent) {
          contentFound = true;
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }

    return contentFound ? { left, right } : { left: 0, right: width };
  };

  const getColorForDifference = (type: 'spacing' | 'margin', isSelected: boolean) => {
    if (type === 'spacing') {
      return {
        fill: isSelected ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.1)",
        stroke: isSelected ? "rgba(59, 130, 246, 0.8)" : "rgba(59, 130, 246, 0.3)"
      };
    }
    return {
      fill: isSelected ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.1)",
      stroke: isSelected ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.3)"
    };
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {differences.map((diff, i) => {
                const colors = getColorForDifference(diff.type, i === selectedDifference);
                return (
                  <Rect
                    key={i}
                    x={diff.location.x}
                    y={diff.location.y}
                    width={diff.location.width}
                    height={diff.location.height}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={1.5}
                    onClick={() => setSelectedDifference(i)}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Resultados del Análisis</h3>
          <ScrollArea className="h-[400px] pr-4">
            {differences.map((diff, index) => (
              <div
                key={index}
                className={`mb-2 p-2 border rounded-lg transition-colors cursor-pointer
                  ${index === selectedDifference 
                    ? 'bg-accent border-primary' 
                    : 'hover:bg-accent/50'}`}
                onClick={() => setSelectedDifference(index === selectedDifference ? null : index)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    diff.type === 'spacing' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm">{diff.description}</span>
                </div>
              </div>
            ))}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}