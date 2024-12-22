import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import { loadImage } from '@/lib/imageProcessing';
import { analyzeImageDifferences } from '@/lib/geminiService';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, MessageSquare, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { DifferenceReport } from './DifferenceReport';

interface DifferenceDetectorProps {
  originalImage: string;
  implementationImage: string;
}

interface Comment {
  id: string;
  text: string;
  timestamp: string;
}

export interface DesignDifference {
  id: string; // Added unique ID
  type: 'spacing' | 'margin' | 'color' | 'font';
  description: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  priority: 'high' | 'medium' | 'low';
  comments: Comment[];
}

export default function DifferenceDetector({ originalImage, implementationImage }: DifferenceDetectorProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [differences, setDifferences] = useState<DesignDifference[]>([]);
  const [selectedDifference, setSelectedDifference] = useState<string | null>(null); // Changed to string
  const [newComment, setNewComment] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<{
    original: HTMLImageElement | null;
    implementation: HTMLImageElement | null;
  }>({
    original: null,
    implementation: null,
  });

  const handleImageAnalysis = async (originalImg: HTMLImageElement, implementationImg: HTMLImageElement, containerWidth: number) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = originalImg.width;
      canvas.height = originalImg.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(originalImg, 0, 0);
      const originalBase64 = canvas.toDataURL('image/png');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(implementationImg, 0, 0);
      const implementationBase64 = canvas.toDataURL('image/png');

      console.log('Initiating image analysis...');
      const analysis = await analyzeImageDifferences(originalBase64, implementationBase64);
      console.log('Analysis completed:', analysis);

      const aiDifferences = analysis.differences.map((diff, index) => ({
        id: `diff-${Date.now()}-${index}`, // Unique ID for each difference
        type: diff.type,
        description: diff.description,
        location: {
          x: 0,
          y: index * 50,
          width: containerWidth,
          height: 40,
        },
        priority: diff.priority,
        comments: []
      }));

      setDifferences(aiDifferences);
    } catch (error) {
      console.error('Error in handleImageAnalysis:', error);
    }
  };

  useEffect(() => {
    const loadImages = async () => {
      try {
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

          await handleImageAnalysis(originalImg, implementationImg, containerWidth);
        }
      } catch (error) {
        console.error('Error loading images:', error);
      }
    };

    loadImages();
  }, [originalImage, implementationImage]);

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
    const sampleSize = 10;
    const colorThreshold = 30;

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

  const addComment = (differenceId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newComment.trim()) return;

    setDifferences(prev => {
      const updated = [...prev];
      const differenceIndex = updated.findIndex(diff => diff.id === differenceId);
      if (differenceIndex === -1) return updated; // Handle case where difference is not found

      updated[differenceIndex].comments.push({
        id: Date.now().toString(),
        text: newComment,
        timestamp: new Date().toLocaleString()
      });
      return updated;
    });

    setNewComment('');
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
              {differences.map((diff) => {
                const colors = getColorForDifference(diff.type, diff.priority, diff.id === selectedDifference);
                return (
                  <Rect
                    key={diff.id}
                    x={diff.location.x}
                    y={diff.location.y}
                    width={diff.location.width}
                    height={diff.location.height}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={1.5}
                    onClick={() => setSelectedDifference(diff.id)}
                    opacity={diff.id === selectedDifference ? 0.8 : 0.3}
                    shadowColor="rgba(0,0,0,0.3)"
                    shadowBlur={diff.id === selectedDifference ? 10 : 0}
                    shadowOpacity={0.5}
                    perfectDrawEnabled={false}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>

        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Diferencias Detectadas</h3>
            <PDFDownloadLink
              document={<DifferenceReport differences={differences} />}
              fileName="reporte-diferencias.pdf"
              className="ml-auto"
            >
              {({ loading }) => (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || differences.length === 0}
                >
                  <span className="flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Generando...' : 'Exportar PDF'}
                  </span>
                </Button>
              )}
            </PDFDownloadLink>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <AnimatePresence>
              {differences.map((diff) => (
                <motion.div
                  key={diff.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`mb-4 border rounded-lg transition-all duration-200 ease-in-out
                    ${diff.id === selectedDifference
                      ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-500 scale-102 shadow-sm'
                      : 'hover:bg-green-50 dark:hover:bg-green-900/10'}`}
                  >
                    <div
                      className="p-3 cursor-pointer"
                      onClick={() => setSelectedDifference(diff.id === selectedDifference ? null : diff.id)}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          className={`w-2 h-2 rounded-full ${
                            diff.type === 'spacing' ? 'bg-green-500' :
                            diff.type === 'margin' ? 'bg-green-600' :
                            'bg-blue-500'
                          }`}
                          animate={{
                            scale: diff.id === selectedDifference ? 1.2 : 1
                          }}
                          transition={{ duration: 0.2 }}
                        />
                        <span className="text-sm flex-grow">{diff.description}</span>
                        {diff.priority === 'high' && (
                          <motion.span
                            className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            Alta prioridad
                          </motion.span>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {diff.comments?.length > 0 ? (
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                              ) : (
                                <MessageSquarePlus className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Comentarios</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <ScrollArea className="h-[200px] w-full pr-4">
                                {diff.comments?.map((comment) => (
                                  <motion.div
                                    key={comment.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                                  >
                                    <p className="text-sm">{comment.text}</p>
                                    <span className="text-xs text-gray-500 mt-1 block">
                                      {comment.timestamp}
                                    </span>
                                  </motion.div>
                                ))}
                              </ScrollArea>
                              <div className="flex gap-2">
                                <Textarea
                                  placeholder="Añadir un comentario..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  className="min-h-[80px]"
                                />
                              </div>
                              <Button
                                onClick={(e) => addComment(diff.id, e)}
                                className="w-full"
                                disabled={!newComment.trim()}
                              >
                                Añadir Comentario
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    {diff.comments?.length > 0 && (
                      <div className="px-3 pb-3">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-gray-500"
                        >
                          {diff.comments.length} comentario(s)
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}