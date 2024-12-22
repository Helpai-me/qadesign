import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import { loadImage } from '@/lib/imageProcessing';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion'; // Import for motion animations

interface DifferenceDetectorProps {
  originalImage: string;
  implementationImage: string;
}

interface DesignDifference {
  type: 'spacing' | 'margin' | 'color' | 'font';
  description: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  priority: 'high' | 'medium' | 'low';
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
    const analyzeDesignDifferences = () => {
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

      // Analizar diferencias de espaciado significativas
      const spacingThreshold = 16;
      let whitespaceRegions1 = detectWhitespaceRegions(imageData1, canvas1.width, canvas1.height);
      let whitespaceRegions2 = detectWhitespaceRegions(imageData2, canvas2.width, canvas2.height);

      // Filtrar regiones pequeñas y agrupar regiones cercanas
      whitespaceRegions1 = whitespaceRegions1
        .filter(r => r.width > 20)
        .reduce((acc, curr) => {
          const similar = acc.find(r =>
            Math.abs(r.y - curr.y) < 40 &&
            Math.abs(r.width - curr.width) < 20
          );
          if (similar) {
            similar.width = Math.max(similar.width, curr.width);
            return acc;
          }
          return [...acc, curr];
        }, [] as any[]);

      whitespaceRegions2 = whitespaceRegions2
        .filter(r => r.width > 20)
        .reduce((acc, curr) => {
          const similar = acc.find(r =>
            Math.abs(r.y - curr.y) < 40 &&
            Math.abs(r.width - curr.width) < 20
          );
          if (similar) {
            similar.width = Math.max(similar.width, curr.width);
            return acc;
          }
          return [...acc, curr];
        }, [] as any[]);

      // Detectar diferencias de espaciado significativas
      for (let i = 0; i < Math.min(whitespaceRegions1.length, whitespaceRegions2.length); i++) {
        const region1 = whitespaceRegions1[i];
        const region2 = whitespaceRegions2[i];

        if (Math.abs(region1.width - region2.width) > spacingThreshold) {
          designDifferences.push({
            type: 'spacing',
            description: `Ajustar espaciado horizontal: ${Math.abs(region1.width - region2.width)}px de diferencia`,
            location: {
              x: region1.x * dimensions.width / canvas1.width,
              y: region1.y * dimensions.height / canvas1.height,
              width: Math.max(region1.width, region2.width) * dimensions.width / canvas1.width,
              height: 40
            },
            priority: Math.abs(region1.width - region2.width) > 32 ? 'high' : 'medium'
          });
        }
      }

      // Analizar márgenes laterales
      const margins1 = detectMargins(imageData1, canvas1.width, canvas1.height);
      const margins2 = detectMargins(imageData2, canvas2.width, canvas2.height);
      const marginThreshold = 16;

      if (Math.abs(margins1.left - margins2.left) > marginThreshold) {
        designDifferences.push({
          type: 'margin',
          description: `Corregir margen izquierdo: diferencia de ${Math.abs(margins1.left - margins2.left)}px`,
          location: {
            x: 0,
            y: 0,
            width: Math.max(margins1.left, margins2.left) * dimensions.width / canvas1.width,
            height: dimensions.height
          },
          priority: 'high'
        });
      }

      // Detectar diferencias de color significativas
      const colorDifferences = detectColorDifferences(imageData1, imageData2, canvas1.width, canvas1.height);
      colorDifferences.forEach(diff => {
        designDifferences.push({
          type: 'color',
          description: `Actualizar color: de ${diff.color1} a ${diff.color2}`,
          location: {
            x: diff.x * dimensions.width / canvas1.width,
            y: diff.y * dimensions.height / canvas1.height,
            width: 100,
            height: 40
          },
          priority: 'medium'
        });
      });

      // Agrupar diferencias similares y eliminar duplicados
      const groupedDifferences = designDifferences.reduce((acc: DesignDifference[], curr) => {
        const similarDiff = acc.find(diff =>
          diff.type === curr.type &&
          Math.abs(diff.location.y - curr.location.y) < 100 &&
          Math.abs(curr.location.width - curr.location.width) < 20
        );

        if (similarDiff) {
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
      analyzeDesignDifferences();
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

  const detectColorDifferences = (imageData1: ImageData, imageData2: ImageData, width: number, height: number) => {
    const differences = [];
    const sampleSize = 10; // Muestrear cada 10 píxeles para rendimiento
    const colorThreshold = 30; // Umbral para diferencias de color significativas

    for (let y = 0; y < height; y += sampleSize) {
      for (let x = 0; x < width; x += sampleSize) {
        const i = (y * width + x) * 4;
        const color1 = `rgb(${imageData1.data[i]}, ${imageData1.data[i + 1]}, ${imageData1.data[i + 2]})`;
        const color2 = `rgb(${imageData2.data[i]}, ${imageData2.data[i + 1]}, ${imageData2.data[i + 2]})`;

        const colorDiff = Math.abs(imageData1.data[i] - imageData2.data[i]) +
                         Math.abs(imageData1.data[i + 1] - imageData2.data[i + 1]) +
                         Math.abs(imageData1.data[i + 2] - imageData2.data[i + 2]);

        if (colorDiff > colorThreshold * 3) {
          differences.push({ x, y, color1, color2 });
        }
      }
    }

    // Agrupar diferencias de color cercanas
    return differences.reduce((acc, curr) => {
      const similar = acc.find(d =>
        Math.abs(d.x - curr.x) < 50 &&
        Math.abs(d.y - curr.y) < 50 &&
        d.color1 === curr.color1 &&
        d.color2 === curr.color2
      );

      if (similar) return acc;
      return [...acc, curr];
    }, [] as any[]);
  };

  const getColorForDifference = (type: string, priority: string, isSelected: boolean) => {
    const baseOpacity = isSelected ? 0.3 : 0.1;
    const strokeOpacity = isSelected ? 0.8 : 0.3;

    switch (type) {
      case 'spacing':
        return {
          fill: `rgba(34, 197, 94, ${baseOpacity})`,
          stroke: `rgba(34, 197, 94, ${strokeOpacity})`
        };
      case 'margin':
        return {
          fill: `rgba(22, 163, 74, ${baseOpacity})`,
          stroke: `rgba(22, 163, 74, ${strokeOpacity})`
        };
      case 'color':
        return {
          fill: `rgba(59, 130, 246, ${baseOpacity})`,
          stroke: `rgba(59, 130, 246, ${strokeOpacity})`
        };
      default:
        return {
          fill: `rgba(34, 197, 94, ${baseOpacity})`,
          stroke: `rgba(34, 197, 94, ${strokeOpacity})`
        };
    }
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
                const colors = getColorForDifference(diff.type, diff.priority, i === selectedDifference);
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
                    // Añadir transiciones suaves con Konva
                    opacity={i === selectedDifference ? 0.8 : 0.3}
                    shadowColor="rgba(0,0,0,0.3)"
                    shadowBlur={i === selectedDifference ? 10 : 0}
                    shadowOpacity={0.5}
                    perfectDrawEnabled={false}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Diferencias Detectadas</h3>
          <ScrollArea className="h-[400px] pr-4">
            {differences.map((diff, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05
                }}
              >
                <div
                  className={`mb-2 p-2 border rounded-lg transition-all duration-200 ease-in-out cursor-pointer
                    ${index === selectedDifference
                      ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-500 scale-102 shadow-sm'
                      : 'hover:bg-green-50 dark:hover:bg-green-900/10'}`}
                  onClick={() => setSelectedDifference(index === selectedDifference ? null : index)}
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${
                        diff.type === 'spacing' ? 'bg-green-500' :
                        diff.type === 'margin' ? 'bg-green-600' :
                        'bg-blue-500'
                      }`}
                      animate={{
                        scale: index === selectedDifference ? 1.2 : 1
                      }}
                      transition={{ duration: 0.2 }}
                    />
                    <span className="text-sm">{diff.description}</span>
                    {diff.priority === 'high' && (
                      <motion.span
                        className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full ml-auto"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        Alta prioridad
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}