import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageComparison from "@/components/ImageComparison";
import ImageUploader from "@/components/ImageUploader";
import MeasurementTools from "@/components/MeasurementTools";
import ContrastChecker from "@/components/ContrastChecker";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [implementationImage, setImplementationImage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`}>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Design QA Inspector
          </h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="p-6">
            <ImageUploader
              onOriginalUpload={setOriginalImage}
              onImplementationUpload={setImplementationImage}
            />
          </CardContent>
        </Card>

        {originalImage && implementationImage && (
          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="measurement">Measurement</TabsTrigger>
              <TabsTrigger value="contrast">Contrast</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison">
              <Card>
                <CardContent className="p-6">
                  <ImageComparison
                    originalImage={originalImage}
                    implementationImage={implementationImage}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="measurement">
              <Card>
                <CardContent className="p-6">
                  <MeasurementTools image={implementationImage} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contrast">
              <Card>
                <CardContent className="p-6">
                  <ContrastChecker image={implementationImage} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
