import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Text, Image } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Ruler, Move } from 'lucide-react';
import { loadImage } from '@/lib/imageProcessing';
import * as React from 'react';

interface MeasurementToolsProps {
  image: string;
}

interface Measurement {
  points: number[];
  distance: number;
}

export default function MeasurementTools({ image }: MeasurementToolsProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'measure' | 'pan'>('measure');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageObj = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPoints = useRef<number[]>([]);

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
      }
    };

    loadImageData();
  }, [image]);

  const handleMouseDown = (e: any) => {
    if (mode !== 'measure') return;

    const pos = e.target.getStage().getPointerPosition();
    setIsDrawing(true);
    currentPoints.current = [pos.x, pos.y];
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || mode !== 'measure') return;

    const pos = e.target.getStage().getPointerPosition();
    currentPoints.current = [...currentPoints.current, pos.x, pos.y];
    const distance = Math.sqrt(
      Math.pow(pos.x - currentPoints.current[0], 2) +
      Math.pow(pos.y - currentPoints.current[1], 2)
    );

    setMeasurements([...measurements, { points: currentPoints.current, distance }]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleDragMove = (e: any) => {
    if (mode !== 'pan') return;
    setPosition({
      x: e.target.x(),
      y: e.target.y()
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === 'measure' ? 'default' : 'outline'}
          onClick={() => setMode('measure')}
        >
          <Ruler className="w-4 h-4 mr-2" />
          Measure
        </Button>
        <Button
          variant={mode === 'pan' ? 'default' : 'outline'}
          onClick={() => setMode('pan')}
        >
          <Move className="w-4 h-4 mr-2" />
          Pan
        </Button>
      </div>

      <div ref={containerRef} className="border rounded-lg overflow-hidden">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          draggable={mode === 'pan'}
          onDragMove={handleDragMove}
        >
          <Layer>
            {imageObj.current && (
              <Image
                image={imageObj.current}
                width={dimensions.width}
                height={dimensions.height}
                x={position.x}
                y={position.y}
              />
            )}
            {measurements.map((measurement, i) => (
              <React.Fragment key={i}>
                <Line
                  points={measurement.points}
                  stroke="#00ff00"
                  strokeWidth={2}
                />
                <Text
                  x={(measurement.points[0] + measurement.points[2]) / 2}
                  y={(measurement.points[1] + measurement.points[3]) / 2}
                  text={`${Math.round(measurement.distance)}px`}
                  fill="#00ff00"
                  fontSize={14}
                />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}