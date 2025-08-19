import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

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
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [visualizerCount, setVisualizerCount] = useState(0);

  // Check user role and visualizer count
  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const { data: countData } = await supabase.rpc('get_visualizer_count', { 
        _user_id: user.id 
      });
      
      setUserRole(roleData?.role || 'user');
      setVisualizerCount(countData || 0);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

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

    // Check quota for non-admin users
    if (userRole !== 'admin' && visualizerCount >= 5) {
      toast({
        title: "Quota Exceeded",
        description: `You've reached the limit of 5 custom visualizers. Delete some to create new ones, or contact an admin for more.`,
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

      // Immediately add to state for instant UI update
      setCustomVisualizers(prev => [data.visualizer, ...prev]);
      setVisualizerCount(prev => prev + 1);
      
      // Refresh in background to ensure consistency
      setTimeout(() => {
        fetchCustomVisualizers();
        checkUserRole();
      }, 100);
      
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
      await checkUserRole(); // Refresh count
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
    checkUserRole();
  }, [user]);

  const promoteToStandard = async (id: string) => {
    if (!user || userRole !== 'admin') return;

    try {
      const { error } = await supabase
        .from('custom_visualizers')
        .update({ is_public: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Promoted to Standard",
        description: "Visualizer is now available in the standard visualizers section",
      });

      await fetchCustomVisualizers();
    } catch (error) {
      console.error('Error promoting visualizer:', error);
      toast({
        title: "Error",
        description: "Failed to promote visualizer",
        variant: "destructive",
      });
    }
  };

  return {
    customVisualizers,
    isLoading,
    isGenerating,
    generateVisualizer,
    deleteVisualizer,
    promoteToStandard,
    refetch: fetchCustomVisualizers,
    userRole,
    visualizerCount,
    quotaRemaining: userRole === 'admin' ? 999 : Math.max(0, 5 - visualizerCount),
  };
}