import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Wand2, Palette, Loader2, Image, X } from 'lucide-react';
import { useCustomVisualizers } from '@/hooks/useCustomVisualizers';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const { generateVisualizer, isGenerating, userRole, quotaRemaining } = useCustomVisualizers();
  const [activeTab, setActiveTab] = useState('prompt');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewViz, setPreviewViz] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableStyles = Object.keys(visualizerRegistry);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setReferenceImage(result); // Use base64 for now, could upload to storage later
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview('');
    setReferenceImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    // Allow generation with just image, just styles, or just prompt
    if (!prompt.trim() && !referenceImage && selectedStyles.length === 0) {
      return;
    }

    let finalPrompt = prompt.trim();
    
    // Generate a default prompt if none provided but have image or styles
    if (!finalPrompt && (referenceImage || selectedStyles.length > 0)) {
      if (referenceImage && selectedStyles.length > 0) {
        finalPrompt = `Create a visualizer inspired by the uploaded reference image and mixing elements from the selected styles: ${selectedStyles.join(', ')}`;
      } else if (referenceImage) {
        finalPrompt = "Create a visualizer inspired by the uploaded reference image";
      } else if (selectedStyles.length > 0) {
        finalPrompt = `Create a visualizer mixing elements from these styles: ${selectedStyles.join(', ')}`;
      }
    }

    const result = await generateVisualizer({
      prompt: finalPrompt,
      referenceImage: referenceImage || undefined,
      mixStyles: selectedStyles.length > 0 ? selectedStyles : undefined,
    });

    if (result) {
      // Show preview code for immediate testing
      if (result.jsx_code) {
        setPreviewCode(result.jsx_code);
        setPreviewName(result.name || "Generated Visualizer");
        setPreviewViz(result);
      }
      
      // If it's a full saved visualizer, close and notify parent
      if (!result.isPreview && onSuccess) {
        onSuccess(result);
        onClose();
      }
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
          <DialogTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" />
              Generate Custom Visualizer
            </div>
            {userRole !== 'admin' && (
              <Badge variant="secondary" className="bg-purple-600/30 text-purple-200">
                {quotaRemaining} remaining
              </Badge>
            )}
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
                <label className="text-sm text-white/70">Describe your visualizer (optional)</label>
                <Textarea
                  placeholder="Describe the visual style, shapes, movement, and feel you want. Leave blank to generate based on uploaded image or selected styles only."
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Upload Reference Image</label>
                  <div className="relative">
                    {!imagePreview ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition-colors bg-white/5"
                      >
                        <Upload className="w-8 h-8 mx-auto mb-2 text-white/50" />
                        <p className="text-white/70">Click to upload an image</p>
                        <p className="text-xs text-white/50 mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Reference" 
                          className="w-full max-h-64 object-contain rounded-lg bg-black/20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-white/50">
                    Upload a reference image to generate a visualizer inspired by its visual style. No text prompt needed!
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mix" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Mix elements from existing visualizers (optional)</label>
                <p className="text-xs text-white/50 mb-3">
                  Select styles to combine. No text prompt needed - just pick your favorites!
                </p>
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

          {previewCode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 p-4 bg-green-600/20 rounded-lg border border-green-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white font-medium">Live Preview: {previewName}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (previewViz && onSuccess) onSuccess(previewViz);
                    onClose();
                  }}
                  disabled={!previewViz}
                  className="border-green-500/30 text-green-200 hover:bg-green-500/20"
                >
                  Use This Preview
                </Button>
              </div>
              <p className="text-xs text-white/70">
                Visualizer generated successfully! Click "Use This Preview" to start using it, or wait for database sync.
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
          
          {(!user || (userRole !== 'admin' && quotaRemaining <= 0)) && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded border border-yellow-400/20">
              💡 {!user ? "Not signed in" : "Over quota"} - we'll generate a preview you can use right away!
            </div>
          )}
          
          <Button
            onClick={handleGenerate}
            disabled={((!prompt.trim() && !referenceImage && selectedStyles.length === 0) || isGenerating)}
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