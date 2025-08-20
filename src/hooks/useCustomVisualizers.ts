import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useCustomVisualizersStore, type CustomVisualizer } from '@/stores/customVisualizersStore';

export function useCustomVisualizers() {
  const { user } = useAuth();
  const {
    visualizers: customVisualizers,
    isLoading,
    isGenerating,
    userRole,
    visualizerCount,
    quotaRemaining,
    setLoading,
    setGenerating,
    addVisualizer,
    setVisualizerCount,
    fetchVisualizers,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    checkUserRole,
  } = useCustomVisualizersStore();

  // Initialize store when user changes
  useEffect(() => {
    if (user) {
      fetchVisualizers(user.id);
      checkUserRole(user.id);
      subscribeToRealtime(user.id);
    } else {
      unsubscribeFromRealtime();
    }

    return () => {
      unsubscribeFromRealtime();
    };
  }, [user, fetchVisualizers, checkUserRole, subscribeToRealtime, unsubscribeFromRealtime]);

  const generateVisualizer = async (params: {
    prompt: string;
    referenceImage?: string;
    mixStyles?: string[];
  }) => {
    // Require user to be signed in - no more preview mode
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to generate custom visualizers",
        variant: "destructive",
      });
      return null;
    }

    // Check quota for non-admin users
    if (userRole !== 'admin' && visualizerCount >= 5) {
      toast({
        title: "Quota Exceeded",
        description: "You've reached your limit of 5 custom visualizers. Delete some to create new ones.",
        variant: "destructive",
      });
      return null;
    }

    setGenerating(true);
    try {
      console.log('🚀 Generating visualizer with prompt:', params.prompt);
      
      // Always try to save to database first
      const { data, error } = await supabase.functions.invoke('generate-visualizer', {
        body: {
          prompt: params.prompt,
          referenceImage: params.referenceImage,
          mixStyles: params.mixStyles,
          userId: user.id,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Edge function failed');
      }

      // Success path: saved to DB and returned visualizer
      if (data?.success && data?.visualizer) {
        console.log('✅ Visualizer saved successfully:', data.visualizer.name);
        
        toast({
          title: "Visualizer Generated!",
          description: `${data.visualizer.name} has been created`,
        });

        // Make code instantly available to the loader without waiting for DB fetch
        const W = window as any;
        W.__PREVIEW_VISUALIZERS__ = W.__PREVIEW_VISUALIZERS__ || {};
        if (data.visualizer?.id && data.visualizer?.jsx_code) {
          W.__PREVIEW_VISUALIZERS__[data.visualizer.id] = data.visualizer.jsx_code;
        }

        // Immediately add to store and select it
        addVisualizer(data.visualizer);
        setVisualizerCount(visualizerCount + 1);
        
        // Background refresh to keep store in sync (count/role and list)
        setTimeout(() => {
          checkUserRole(user.id);
          fetchVisualizers(user.id);
        }, 50);
        
        return data.visualizer;
      }

      // If we got code but it wasn't saved, try local fallback
      if (data?.code && data?.name) {
        console.log('⚠️ Got code but not saved, creating preview');
        return createPreviewVisualizer(data.code, data.name, data.emoji || '🌟', false);
      }

      throw new Error(data?.error || 'No visualizer data returned');
      
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
      setGenerating(false);
    }
  };

  // Helper function to create preview visualizers
  const createPreviewVisualizer = (code: string, name: string, emoji: string, isLocalFallback: boolean) => {
    const previewId = `preview-${Date.now()}`;
    
    // Register preview code globally for the loader
    const W = window as any;
    W.__PREVIEW_VISUALIZERS__ = W.__PREVIEW_VISUALIZERS__ || {};
    W.__PREVIEW_VISUALIZERS__[previewId] = code;

    const previewViz: CustomVisualizer = {
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

    // Add to store so it appears in the grid immediately
    addVisualizer(previewViz);

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
    console.log('Deleting visualizer:', id);
    
    // Handle preview visualizers (local only)
    if (id.startsWith('preview-')) {
      console.log('Deleting preview visualizer');
      
      // Get current store instance and remove visualizer
      const store = useCustomVisualizersStore.getState();
      store.removeVisualizer(id);
      
      // Clean up global preview storage
      const W = window as any;
      if (W.__PREVIEW_VISUALIZERS__?.[id]) {
        delete W.__PREVIEW_VISUALIZERS__[id];
        console.log('Cleaned up preview storage for', id);
      }
      
      toast({
        title: "Deleted",
        description: "Preview visualizer removed",
      });
      return;
    }

    // Handle saved visualizers (database)
    if (!user) {
      console.log('No user, cannot delete saved visualizer');
      return;
    }

    console.log('Deleting saved visualizer from database');
    
    // Optimistically remove from UI immediately
    const store = useCustomVisualizersStore.getState();
    const originalVisualizers = [...store.visualizers];
    store.removeVisualizer(id);

    try {
      const { error } = await supabase
        .from('custom_visualizers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Delete error:', error);
        // Restore original visualizers on error
        store.setVisualizers(originalVisualizers);
        throw error;
      }

      console.log('Successfully deleted from database');
      toast({
        title: "Deleted",
        description: "Custom visualizer has been deleted",
      });

      // Refresh count after deletion
      checkUserRole(user.id);
    } catch (error) {
      console.error('Error deleting visualizer:', error);
      toast({
        title: "Error",
        description: "Failed to delete visualizer",
        variant: "destructive",
      });
    }
  };

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

      // Refresh data
      if (user) {
        fetchVisualizers(user.id);
      }
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
    refetch: () => user && fetchVisualizers(user.id),
    userRole,
    visualizerCount,
    quotaRemaining,
  };
}