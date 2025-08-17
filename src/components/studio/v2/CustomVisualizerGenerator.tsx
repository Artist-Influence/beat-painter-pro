import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Wand2, Palette, Loader2 } from 'lucide-react';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { visualizerRegistry } from '@/components/visualizers';

interface CustomVisualizerGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (visualizer: any) => void;
}

export function CustomVisualizerGenerator({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CustomVisualizerGeneratorProps) {
  const { generateVisualizer, isGenerating } = useCustomVisualizers();
  const [activeTab, setActiveTab] = useState('prompt');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const availableStyles = Object.keys(visualizerRegistry);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const result = await generateVisualizer({
      prompt: prompt.trim(),
      referenceImage: referenceImage || undefined,
      mixStyles: selectedStyles.length > 0 ? selectedStyles : undefined,
    });

    if (result && onSuccess) {
      onSuccess(result);
      onClose();
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  React.useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isGenerating]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-black/95 border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            Generate Custom Visualizer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/10">
              <TabsTrigger value="prompt" className="data-[state=active]:bg-purple-600/50">
                <Wand2 className="w-4 h-4 mr-2" />
                Describe
              </TabsTrigger>
              <TabsTrigger value="reference" className="data-[state=active]:bg-purple-600/50">
                <Upload className="w-4 h-4 mr-2" />
                Reference
              </TabsTrigger>
              <TabsTrigger value="mix" className="data-[state=active]:bg-purple-600/50">
                <Palette className="w-4 h-4 mr-2" />
                Mix Styles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Describe your visualizer</label>
                <Textarea
                  placeholder="Describe the visual style, shapes, movement, and feel you want. For example: 'Flowing liquid mercury with electric blue accents that pulse with the bass, forming organic crystalline structures that rotate and morph..'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-24 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
                <div className="space-y-1">
                  <div className="font-medium">🎨 Visual Elements:</div>
                  <div>• Shapes & geometry</div>
                  <div>• Colors & materials</div>
                  <div>• Lighting effects</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">🎵 Audio Response:</div>
                  <div>• Bass reactions</div>
                  <div>• Mid-frequency movement</div>
                  <div>• High-frequency details</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reference" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Reference Image URL (optional)</label>
                <Input
                  placeholder="https://example.com/inspiration-image.jpg"
                  value={referenceImage}
                  onChange={(e) => setReferenceImage(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <p className="text-xs text-white/50">
                  Provide a reference image to inspire the visual style of your custom visualizer
                </p>
              </div>
            </TabsContent>

            <TabsContent value="mix" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Mix elements from existing visualizers</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableStyles.map((style) => {
                    const isSelected = selectedStyles.includes(style);
                    return (
                      <Button
                        key={style}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStyle(style)}
                        className={`justify-start text-left h-auto py-2 transition-all ${
                          isSelected 
                            ? 'bg-purple-600/30 border-purple-500/50 text-white' 
                            : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="text-sm font-medium truncate">
                            {style.replace('Visualizer', '').replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="ml-auto bg-purple-600/50">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-white/50">
                  Selected: {selectedStyles.length} style{selectedStyles.length !== 1 ? 's' : ''}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 p-4 bg-purple-600/20 rounded-lg border border-purple-500/30"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                <span className="text-white">Generating your custom visualizer...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-white/60">
                This may take 30-60 seconds. AI is analyzing your prompt and creating the perfect visualizer.
              </p>
            </motion.div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/20">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Visualizer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}