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
      const spacingThreshold = 16; // Umbral para espaciado
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
      const marginThreshold = 16;

      // Solo analizar márgenes si la diferencia es significativa
      if (Math.abs(margins1.left - margins2.left) > marginThreshold) {
        designDifferences.push({
          type: 'margin',
          description: `Márgenes laterales varían en dispositivos móviles`,
          location: {
            x: 0,
            y: 0,
            width: Math.max(margins1.left, margins2.left) * dimensions.width / canvas1.width,
            height: dimensions.height
          }
        });
      }

      // Agrupar diferencias similares
      const groupedDifferences = designDifferences.reduce((acc: DesignDifference[], curr) => {
        const similarDiff = acc.find(diff => 
          diff.type === curr.type &&
          Math.abs(diff.location.y - curr.location.y) < 100 && // Cercanas en el eje Y
          Math.abs(Math.abs(curr.location.width - curr.location.width)) < 20 // Diferencia de ancho similar
        );

        if (similarDiff) {
          // Combinar las diferencias
          similarDiff.location = {
            x: Math.min(similarDiff.location.x, curr.location.x),
            y: Math.min(similarDiff.location.y, curr.location.y),
            width: Math.max(similarDiff.location.width, curr.location.width),
            height: Math.max(similarDiff.location.height, curr.location.height)
          };
          return acc;
        }

        return [...acc, curr];
      }, []);

      setDifferences(groupedDifferences);
    };

    if (images.original && images.implementation && dimensions.width > 0) {
      analyzeSpacingDifferences();
    }
  }, [images, dimensions]);

  const detectWhitespaceRegions = (imageData: ImageData, width: number, height: number) => {
    const regions = [];
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
          if (start !== null && whiteCount > 20) {
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

    for (let y = 0; y < height; y += 2) {
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
        fill: isSelected ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.1)",
        stroke: isSelected ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.3)"
      };
    }
    return {
      fill: isSelected ? "rgba(22, 163, 74, 0.3)" : "rgba(22, 163, 74, 0.1)",
      stroke: isSelected ? "rgba(22, 163, 74, 0.8)" : "rgba(22, 163, 74, 0.3)"
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
                    ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-500' 
                    : 'hover:bg-green-50 dark:hover:bg-green-900/10'}`}
                onClick={() => setSelectedDifference(index === selectedDifference ? null : index)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    diff.type === 'spacing' ? 'bg-green-500' : 'bg-green-600'
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