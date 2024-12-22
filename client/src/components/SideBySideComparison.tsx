import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image } from 'react-konva';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, MoveHorizontal } from 'lucide-react';
import { loadImage } from '@/lib/imageProcessing';

interface SideBySideComparisonProps {
  originalImage: string;
  implementationImage: string;
}

export default function SideBySideComparison({ originalImage, implementationImage }: SideBySideComparisonProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
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
        // Dividir el ancho entre 2 para las imágenes lado a lado
        const imageWidth = containerWidth / 2;
        const scale = imageWidth / originalImg.width;
        setDimensions({
          width: imageWidth,
          height: originalImg.height * scale,
        });
      }
    };

    loadImages();
  }, [originalImage, implementationImage]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const oldScale = scale;
    const pointer = e.target.getStage().getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPosition(newPos);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragMove = (e: any) => {
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const zoomIn = () => {
    const newScale = scale * 1.2;
    setScale(newScale);
  };

  const zoomOut = () => {
    const newScale = scale / 1.2;
    setScale(newScale);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" onClick={zoomIn}>
          <ZoomIn className="w-4 h-4 mr-2" />
          Acercar
        </Button>
        <Button variant="outline" onClick={zoomOut}>
          <ZoomOut className="w-4 h-4 mr-2" />
          Alejar
        </Button>
        <Button variant="outline" onClick={resetView}>
          <MoveHorizontal className="w-4 h-4 mr-2" />
          Resetear
        </Button>
      </div>

      <div ref={containerRef} className="grid grid-cols-2 gap-2">
        <div className="border rounded-lg overflow-hidden">
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            onWheel={handleWheel}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
          >
            <Layer>
              {images.original && (
                <Image
                  image={images.original}
                  width={dimensions.width}
                  height={dimensions.height}
                  scaleX={scale}
                  scaleY={scale}
                  x={position.x}
                  y={position.y}
                />
              )}
            </Layer>
          </Stage>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            onWheel={handleWheel}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
          >
            <Layer>
              {images.implementation && (
                <Image
                  image={images.implementation}
                  width={dimensions.width}
                  height={dimensions.height}
                  scaleX={scale}
                  scaleY={scale}
                  x={position.x}
                  y={position.y}
                />
              )}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
