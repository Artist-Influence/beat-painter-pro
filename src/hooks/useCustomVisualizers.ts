import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface CustomVisualizer {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  prompt?: string;
  jsx_code: string;
  scale_factor: number;
  preview_emoji: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomVisualizers() {
  const { user } = useAuth();
  const [customVisualizers, setCustomVisualizers] = useState<CustomVisualizer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCustomVisualizers = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_visualizers')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomVisualizers(data || []);
    } catch (error) {
      console.error('Error fetching custom visualizers:', error);
      toast({
        title: "Error",
        description: "Failed to load custom visualizers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateVisualizer = async (params: {
    prompt: string;
    referenceImage?: string;
    mixStyles?: string[];
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate custom visualizers",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-visualizer', {
        body: {
          prompt: params.prompt,
          referenceImage: params.referenceImage,
          mixStyles: params.mixStyles,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Visualizer Generated!",
        description: `${data.visualizer.name} has been created`,
      });

      // Refresh the list immediately 
      setCustomVisualizers(prev => [...prev, data.visualizer]);
      await fetchCustomVisualizers();
      
      return data.visualizer;
    } catch (error) {
      console.error('Error generating visualizer:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate custom visualizer. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteVisualizer = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('custom_visualizers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Custom visualizer has been deleted",
      });

      await fetchCustomVisualizers();
    } catch (error) {
      console.error('Error deleting visualizer:', error);
      toast({
        title: "Error",
        description: "Failed to delete visualizer",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCustomVisualizers();
  }, [user]);

  return {
    customVisualizers,
    isLoading,
    isGenerating,
    generateVisualizer,
    deleteVisualizer,
    refetch: fetchCustomVisualizers,
  };
}