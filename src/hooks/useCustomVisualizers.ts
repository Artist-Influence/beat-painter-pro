import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useCustomVisualizersStore, type CustomVisualizer } from '@/stores/customVisualizersStore';
import { 
  type RandomVisualizerParams, 
  paramsToName, 
  paramsToEmoji 
} from '@/lib/randomVisualizerGenerator';

export function useCustomVisualizers() {
  const { user, loading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
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
      // Only fetch if store is empty to prevent duplicate fetches
      const currentStore = useCustomVisualizersStore.getState();
      if (currentStore.visualizers.length === 0 && !currentStore.isLoading) {
        fetchVisualizers(user.id);
      }
      checkUserRole(user.id);
      subscribeToRealtime(user.id);
    } else {
      unsubscribeFromRealtime();
    }

    return () => {
      unsubscribeFromRealtime();
    };
  }, [user?.id]); // Only depend on user.id to prevent re-runs

  // Save a random visualizer (new system)
  const saveRandomVisualizer = async (params: RandomVisualizerParams, customName?: string) => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      toast({
        title: "Please Wait",
        description: "Loading authentication...",
      });
      return null;
    }
    
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to save custom visualizers",
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

    setIsSaving(true);
    
    // Track if we've timed out
    let hasTimedOut = false;
    const timeoutId = setTimeout(() => {
      console.log('Save timeout reached');
      hasTimedOut = true;
    }, 15000); // 15s timeout
    
    try {
      const name = customName || paramsToName(params);
      const emoji = paramsToEmoji(params);
      
      // Minimal payload - only essential data to reduce request size
      const minimalParams = {
        seed: params.seed,
        abstractForm: params.abstractForm,
        savedStyle: params.savedStyle,
      };
      
      const insertData = {
        user_id: user.id,
        name,
        preview_emoji: emoji,
        jsx_code: JSON.stringify(minimalParams),
        is_public: false,
        scale_factor: 0.12,
      };
      
      console.log('Attempting to save visualizer:', name);
      
      // Race between save and timeout
      const savePromise = supabase
        .from('custom_visualizers')
        .insert(insertData)
        .select()
        .single();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        const checkTimeout = setInterval(() => {
          if (hasTimedOut) {
            clearInterval(checkTimeout);
            reject(new Error('Save timed out'));
          }
        }, 100);
        // Clear interval after 16s regardless
        setTimeout(() => clearInterval(checkTimeout), 16000);
      });
      
      const { data, error } = await Promise.race([savePromise, timeoutPromise]);
      
      clearTimeout(timeoutId);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      console.log('✅ Random visualizer saved:', data);
      
      toast({
        title: "Visualizer Saved!",
        description: `${name} has been added to your collection`,
      });

      // FALLBACK: Manually add to store after a short delay if realtime doesn't fire
      if (data) {
        setTimeout(() => {
          const currentStore = useCustomVisualizersStore.getState();
          const alreadyExists = currentStore.visualizers.some(v => v.id === data.id);
          if (!alreadyExists) {
            console.log('Realtime did not fire, adding manually to store');
            addVisualizer(data as CustomVisualizer);
          }
        }, 1500);
      }
      
      setVisualizerCount(visualizerCount + 1);
      checkUserRole(user.id);
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Failed to save visualizer:', error);
      
      toast({
        title: "Save Failed",
        description: error.message?.includes('timed out') ? "Request timed out - please try again" : (error.message || "Failed to save visualizer"),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Legacy generate function (for backwards compatibility, will be removed)
  const generateVisualizer = async (params: {
    prompt: string;
    referenceImage?: string;
    mixStyles?: string[];
  }) => {
    toast({
      title: "Use Random Generator",
      description: "The prompt-based generator has been replaced with a more reliable random generator.",
    });
    return null;
  };

  const deleteVisualizer = async (id: string) => {
    console.log('Deleting visualizer:', id);
    
    // Handle preview visualizers (local only)
    if (id.startsWith('preview-')) {
      console.log('Deleting preview visualizer');
      
      const store = useCustomVisualizersStore.getState();
      store.removeVisualizer(id);
      
      const W = window as any;
      if (W.__PREVIEW_VISUALIZERS__?.[id]) {
        delete W.__PREVIEW_VISUALIZERS__[id];
      }
      
      toast({
        title: "Deleted",
        description: "Preview visualizer removed",
      });
      return;
    }

    if (!user) {
      console.log('No user, cannot delete saved visualizer');
      return;
    }

    console.log('Deleting saved visualizer from database');
    
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
        store.setVisualizers(originalVisualizers);
        throw error;
      }

      console.log('Successfully deleted from database');
      toast({
        title: "Deleted",
        description: "Custom visualizer has been deleted",
      });

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
    isSaving,
    generateVisualizer, // Legacy - can be removed later
    saveRandomVisualizer, // New method
    deleteVisualizer,
    promoteToStandard,
    refetch: () => user && fetchVisualizers(user.id),
    userRole,
    visualizerCount,
    quotaRemaining,
  };
}
