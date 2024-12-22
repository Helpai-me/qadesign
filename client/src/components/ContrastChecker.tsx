import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Circle } from 'react-konva';
import { Card } from '@/components/ui/card';
import { loadImage } from '@/lib/imageProcessing';

interface ContrastCheckerProps {
  image: string;
}

interface ColorPoint {
  x: number;
  y: number;
  color: string;
}

export default function ContrastChecker({ image }: ContrastCheckerProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedColors, setSelectedColors] = useState<ColorPoint[]>([]);
  const imageObj = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadImageData = async () => {
      const img = await loadImage(image);
      imageObj.current = img;

      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / img.width;
        setDimensions({
          width: containerWidth,
          height: img.height * scale
        });

        // Create canvas for color picking
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvasRef.current = canvas;
        }
      }
    };

    loadImageData();
  }, [image]);

  const getPixelColor = (x: number, y: number): string => {
    if (!canvasRef.current) return '#000000';

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return '#000000';

    const scale = canvasRef.current.width / dimensions.width;
    const pixel = ctx.getImageData(x * scale, y * scale, 1, 1).data;
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  };

  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const color = getPixelColor(point.x, point.y);

    setSelectedColors((prev) => {
      if (prev.length >= 2) {
        return [{ x: point.x, y: point.y, color }];
      }
      return [...prev, { x: point.x, y: point.y, color }];
    });
  };

  const calculateContrast = (color1: string, color2: string): number => {
    const getLuminance = (color: string) => {
      const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
      const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="border rounded-lg overflow-hidden">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleStageClick}
        >
          <Layer>
            {imageObj.current && (
              <Image
                image={imageObj.current}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}
            {selectedColors.map((point, i) => (
              <Circle
                key={i}
                x={point.x}
                y={point.y}
                radius={8}
                stroke="#fff"
                strokeWidth={2}
                fill={point.color}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {selectedColors.length === 2 && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: selectedColors[0].color }}
              />
              <span className="text-sm">{selectedColors[0].color}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: selectedColors[1].color }}
              />
              <span className="text-sm">{selectedColors[1].color}</span>
            </div>
            <div className="ml-auto">
              <span className="font-semibold">
                Contrast Ratio: {calculateContrast(selectedColors[0].color, selectedColors[1].color).toFixed(2)}:1
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
