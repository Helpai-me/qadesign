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
  type: 'spacing' | 'color' | 'typography' | 'margin';
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

      // Analizar diferencias de color
      const colorThreshold = 30;
      for (let y = 0; y < canvas1.height; y += 20) {
        for (let x = 0; x < canvas1.width; x += 20) {
          const i = (y * canvas1.width + x) * 4;
          const colorDiff = Math.abs(imageData1.data[i] - imageData2.data[i]) +
                         Math.abs(imageData1.data[i + 1] - imageData2.data[i + 1]) +
                         Math.abs(imageData1.data[i + 2] - imageData2.data[i + 2]);

          if (colorDiff > colorThreshold * 3) {
            const color1 = `rgb(${imageData1.data[i]}, ${imageData1.data[i + 1]}, ${imageData1.data[i + 2]})`;
            const color2 = `rgb(${imageData2.data[i]}, ${imageData2.data[i + 1]}, ${imageData2.data[i + 2]})`;

            designDifferences.push({
              type: 'color',
              description: `Color difiere: ${color1} vs ${color2}`,
              location: {
                x: x * dimensions.width / canvas1.width,
                y: y * dimensions.height / canvas1.height,
                width: 40,
                height: 40
              }
            });
          }
        }
      }

      // Analizar diferencias de espaciado
      const spacingThreshold = 5;
      let whitespaceRegions1 = detectWhitespaceRegions(imageData1, canvas1.width, canvas1.height);
      let whitespaceRegions2 = detectWhitespaceRegions(imageData2, canvas2.width, canvas2.height);

      for (let i = 0; i < whitespaceRegions1.length; i++) {
        const region1 = whitespaceRegions1[i];
        const region2 = whitespaceRegions2[i];

        if (region2 && Math.abs(region1.width - region2.width) > spacingThreshold) {
          designDifferences.push({
            type: 'spacing',
            description: `Espaciado inconsistente: ${Math.abs(region1.width - region2.width)}px de diferencia`,
            location: {
              x: region1.x * dimensions.width / canvas1.width,
              y: region1.y * dimensions.height / canvas1.height,
              width: region1.width * dimensions.width / canvas1.width,
              height: 20
            }
          });
        }
      }

      // Analizar márgenes
      const marginThreshold = 8;
      const margins1 = detectMargins(imageData1, canvas1.width, canvas1.height);
      const margins2 = detectMargins(imageData2, canvas2.width, canvas2.height);

      if (Math.abs(margins1.left - margins2.left) > marginThreshold) {
        designDifferences.push({
          type: 'margin',
          description: `Margen izquierdo inconsistente: ${Math.abs(margins1.left - margins2.left)}px de diferencia`,
          location: {
            x: 0,
            y: 0,
            width: 20,
            height: dimensions.height
          }
        });
      }

      setDifferences(designDifferences);
    };

    if (images.original && images.implementation && dimensions.width > 0) {
      analyzeDesignDifferences();
    }
  }, [images, dimensions]);

  const detectWhitespaceRegions = (imageData: ImageData, width: number, height: number) => {
    const regions = [];
    for (let y = 0; y < height; y += 20) {
      let start = null;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isWhite = imageData.data[i] > 250 && 
                       imageData.data[i + 1] > 250 && 
                       imageData.data[i + 2] > 250;

        if (isWhite && start === null) {
          start = x;
        } else if (!isWhite && start !== null) {
          regions.push({
            x: start,
            y,
            width: x - start,
            height: 1
          });
          start = null;
        }
      }
    }
    return regions;
  };

  const detectMargins = (imageData: ImageData, width: number, height: number) => {
    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (imageData.data[i + 3] > 0) { // Si no es transparente
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }

    return { left, right, top, bottom };
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
              {differences.map((diff, i) => (
                <Rect
                  key={i}
                  x={diff.location.x}
                  y={diff.location.y}
                  width={diff.location.width}
                  height={diff.location.height}
                  fill="rgba(255, 0, 0, 0.1)"
                  stroke="rgba(255, 0, 0, 0.3)"
                  strokeWidth={1}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Resultados del Análisis</h3>
          <ScrollArea className="h-[400px] pr-4">
            {differences.map((diff, index) => (
              <div
                key={index}
                className="mb-2 p-2 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    diff.type === 'color' ? 'bg-red-500' :
                    diff.type === 'spacing' ? 'bg-blue-500' :
                    diff.type === 'margin' ? 'bg-green-500' :
                    'bg-purple-500'
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