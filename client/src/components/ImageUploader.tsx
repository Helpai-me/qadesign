import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const originalDropzone = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (files) => handleFileUpload(files, 'original')
  });

  const implementationDropzone = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (files) => handleFileUpload(files, 'implementation')
  });

  const handleUrlUpload = (url: string, type: 'original' | 'implementation') => {
    const handler = type === 'original' ? onOriginalUpload : onImplementationUpload;
    handler(url);
  };

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
            Drag & drop or click to upload the original design
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Or enter image URL"
            onChange={(e) => handleUrlUpload(e.target.value, 'original')}
          />
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
            Drag & drop or click to upload the implementation
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Or enter image URL"
            onChange={(e) => handleUrlUpload(e.target.value, 'implementation')}
          />
        </div>
      </div>
    </div>
  );
}
