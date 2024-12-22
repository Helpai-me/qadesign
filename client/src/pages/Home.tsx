import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import ImageComparison from "@/components/ImageComparison";
import ImageUploader from "@/components/ImageUploader";
import MeasurementTools from "@/components/MeasurementTools";
import ContrastChecker from "@/components/ContrastChecker";
import DifferenceDetector from "@/components/DifferenceDetector";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import SideBySideComparison from "@/components/SideBySideComparison";

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [implementationImage, setImplementationImage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Verificar la preferencia del sistema
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Aplicar el tema cuando el componente se monta
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <motion.header 
        className="border-b"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <motion.h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            Design QA Inspector
          </motion.h1>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="relative overflow-hidden transition-colors hover:bg-accent"
            >
              <AnimatePresence mode="wait">
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="mb-8">
            <CardContent className="p-6">
              <ImageUploader
                onOriginalUpload={setOriginalImage}
                onImplementationUpload={setImplementationImage}
              />
            </CardContent>
          </Card>
        </motion.div>

        {originalImage && implementationImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Tabs defaultValue="comparison" className="space-y-4">
              <TabsList>
                <TabsTrigger value="comparison">Comparación</TabsTrigger>
                <TabsTrigger value="sideBySide">Lado a Lado</TabsTrigger>
                <TabsTrigger value="measurement">Medición</TabsTrigger>
                <TabsTrigger value="contrast">Contraste</TabsTrigger>
                <TabsTrigger value="differences">Diferencias</TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="comparison">
                  <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
                    <Card>
                      <CardContent className="p-6">
                        <ImageComparison
                          originalImage={originalImage}
                          implementationImage={implementationImage}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                <TabsContent value="sideBySide">
                  <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
                    <Card>
                      <CardContent className="p-6">
                        <SideBySideComparison
                          originalImage={originalImage}
                          implementationImage={implementationImage}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                <TabsContent value="measurement">
                  <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
                    <Card>
                      <CardContent className="p-6">
                        <MeasurementTools image={implementationImage} />
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                <TabsContent value="contrast">
                  <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
                    <Card>
                      <CardContent className="p-6">
                        <ContrastChecker image={implementationImage} />
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                <TabsContent value="differences">
                  <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
                    <Card>
                      <CardContent className="p-6">
                        <DifferenceDetector
                          originalImage={originalImage}
                          implementationImage={implementationImage}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        )}
      </main>
    </div>
  );
}