import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onOriginalUpload: (imageUrl: string) => void;
  onImplementationUpload: (imageUrl: string) => void;
}

export default function ImageUploader({ onOriginalUpload, onImplementationUpload }: ImageUploaderProps) {
  const { toast } = useToast();

  const handleFileUpload = useCallback((acceptedFiles: File[], type: 'original' | 'implementation') => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === 'original') {
        onOriginalUpload(dataUrl);
      } else {
        onImplementationUpload(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }, [onOriginalUpload, onImplementationUpload, toast]);

  const handlePaste = useCallback((e: ClipboardEvent, type: 'original' | 'implementation') => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileUpload([file], type);
        }
        break;
      }
    }
  }, [handleFileUpload]);

  useEffect(() => {
    const originalHandler = (e: ClipboardEvent) => handlePaste(e, 'original');
    const implementationHandler = (e: ClipboardEvent) => handlePaste(e, 'implementation');

    document.addEventListener('paste', originalHandler);
    document.addEventListener('paste', implementationHandler);

    return () => {
      document.removeEventListener('paste', originalHandler);
      document.removeEventListener('paste', implementationHandler);
    };
  }, [handlePaste]);

  const originalDropzone = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (files) => handleFileUpload(files, 'original')
  });

  const implementationDropzone = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (files) => handleFileUpload(files, 'implementation')
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Label>Original Design</Label>
        <div
          {...originalDropzone.getRootProps()}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input {...originalDropzone.getInputProps()} />
          <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop, click to upload, or paste the original design
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Implementation</Label>
        <div
          {...implementationDropzone.getRootProps()}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input {...implementationDropzone.getInputProps()} />
          <ImageIcon className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop, click to upload, or paste the implementation
          </p>
        </div>
      </div>
    </div>
  );
}