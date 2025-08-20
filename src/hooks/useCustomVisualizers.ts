import { useState, useEffect, useCallback } from 'react';
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

  // Real-time subscription to custom visualizers
  const subscribeToRealtime = useCallback(() => {
    if (!user) return;

    const channel = supabase
      .channel('custom-visualizers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'custom_visualizers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New custom visualizer created:', payload);
          setCustomVisualizers(prev => [payload.new as CustomVisualizer, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'custom_visualizers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Custom visualizer deleted:', payload);
          setCustomVisualizers(prev => prev.filter(v => v.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    // Determine if we should save or just preview
    const previewOnly = !user || (userRole !== 'admin' && visualizerCount >= 5);

    setIsGenerating(true);
    try {
      // Try edge function first (with or without userId)
      const { data, error } = await supabase.functions.invoke('generate-visualizer', {
        body: {
          prompt: params.prompt,
          referenceImage: params.referenceImage,
          mixStyles: params.mixStyles,
          userId: previewOnly ? undefined : user?.id,
        },
      });

      // Success path: saved to DB and returned visualizer
      if (data?.success && data?.visualizer) {
        toast({
          title: "Visualizer Generated!",
          description: `${data.visualizer.name} has been created`,
        });

        setCustomVisualizers(prev => [data.visualizer, ...prev]);
        setVisualizerCount(prev => prev + 1);
        // Background refresh
        setTimeout(() => {
          fetchCustomVisualizers();
          checkUserRole();
        }, 100);
        return data.visualizer;
      }

      // Preview-only path: function returned usable code but couldn't save
      if (data?.code && data?.name) {
        return createPreviewVisualizer(data.code, data.name, data.emoji || '🌟', previewOnly);
      }

      // Edge function failed, try local fallback
      throw new Error(data?.error || error?.message || 'Edge function failed');
      
    } catch (error: any) {
      console.error('Edge function failed, using local fallback:', error);
      
      // Import and use local generator as fallback
      try {
        const { generateLocalVisualizer } = await import('@/components/studio/LocalVisualizerGenerator');
        const localCode = generateLocalVisualizer(params.prompt);
        const localName = `Local: ${params.prompt.slice(0, 30)}${params.prompt.length > 30 ? '...' : ''}`;
        
        return createPreviewVisualizer(localCode, localName, '🔧', true);
      } catch (localError) {
        console.error('Local fallback also failed:', localError);
        toast({ 
          title: 'Generation Failed', 
          description: 'Both cloud and local generation failed. Please try again.', 
          variant: 'destructive' 
        });
        return null;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to create preview visualizers
  const createPreviewVisualizer = (code: string, name: string, emoji: string, isLocalFallback: boolean) => {
    const previewId = `preview-${Date.now()}`;
    
    // Register preview code globally for the loader
    const W = window as any;
    W.__PREVIEW_VISUALIZERS__ = W.__PREVIEW_VISUALIZERS__ || {};
    W.__PREVIEW_VISUALIZERS__[previewId] = code;

    const previewViz: any = {
      id: previewId,
      user_id: user?.id || 'anonymous',
      name: name,
      jsx_code: code,
      preview_emoji: emoji,
      is_public: false,
      scale_factor: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isPreview: true,
    };

    // Add to list so it appears in the grid immediately
    setCustomVisualizers(prev => [previewViz, ...prev]);

    const description = isLocalFallback 
      ? `Generated "${name}" using local fallback (preview only).`
      : `Generated "${name}" as preview ${!user ? '(not signed in)' : '(over quota)'}.`;
      
    toast({
      title: isLocalFallback ? "Local Preview Ready" : "Preview Ready",
      description,
    });
    
    return previewViz;
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
    const unsubscribe = subscribeToRealtime();
    return unsubscribe;
  }, [user, subscribeToRealtime]);

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