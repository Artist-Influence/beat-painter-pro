import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CustomVisualizer {
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
  isPreview?: boolean; // For preview visualizers
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface CustomVisualizersState {
  visualizers: CustomVisualizer[];
  isLoading: boolean;
  isGenerating: boolean;
  userRole: 'admin' | 'user';
  visualizerCount: number;
  quotaRemaining: number;
  subscription: any;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
  addVisualizer: (visualizer: CustomVisualizer) => void;
  removeVisualizer: (id: string) => void;
  updateVisualizer: (id: string, updates: Partial<CustomVisualizer>) => void;
  setVisualizers: (visualizers: CustomVisualizer[]) => void;
  setUserRole: (role: 'admin' | 'user') => void;
  setVisualizerCount: (count: number) => void;
  fetchVisualizers: (userId?: string) => Promise<void>;
  subscribeToRealtime: (userId: string) => void;
  unsubscribeFromRealtime: () => void;
  checkUserRole: (userId: string) => Promise<void>;
}

export const useCustomVisualizersStore = create<CustomVisualizersState>((set, get) => ({
  visualizers: [],
  isLoading: false,
  isGenerating: false,
  userRole: 'user',
  visualizerCount: 0,
  quotaRemaining: 5,
  subscription: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  
  addVisualizer: (visualizer) => set((state) => ({
    visualizers: [visualizer, ...state.visualizers]
  })),
  
  removeVisualizer: (id) => set((state) => ({
    visualizers: state.visualizers.filter(v => v.id !== id)
  })),
  
  updateVisualizer: (id, updates) => set((state) => ({
    visualizers: state.visualizers.map(v => v.id === id ? { ...v, ...updates } : v)
  })),
  
  setVisualizers: (visualizers) => set({ visualizers }),
  
  setUserRole: (role) => {
    const state = get();
    set({ 
      userRole: role,
      quotaRemaining: role === 'admin' ? 999 : Math.max(0, 5 - state.visualizerCount)
    });
  },
  
  setVisualizerCount: (count) => {
    const state = get();
    set({ 
      visualizerCount: count,
      quotaRemaining: state.userRole === 'admin' ? 999 : Math.max(0, 5 - count)
    });
  },

  fetchVisualizers: async (userId) => {
    if (!userId) return;
    
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('custom_visualizers')
        .select('*')
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ visualizers: data || [] });
    } catch (error) {
      console.error('Error fetching custom visualizers:', error);
      toast({
        title: "Error",
        description: "Failed to load custom visualizers",
        variant: "destructive",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToRealtime: (userId) => {
    const state = get();
    
    // Clean up existing subscription
    if (state.subscription) {
      supabase.removeChannel(state.subscription);
    }

    const channel = supabase
      .channel('custom-visualizers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'custom_visualizers',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New custom visualizer created:', payload);
          get().addVisualizer(payload.new as CustomVisualizer);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'custom_visualizers',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Custom visualizer deleted:', payload);
          get().removeVisualizer(payload.old.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_visualizers',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Custom visualizer updated:', payload);
          get().updateVisualizer(payload.new.id, payload.new as CustomVisualizer);
        }
      )
      .subscribe();

    set({ subscription: channel });
  },

  unsubscribeFromRealtime: () => {
    const state = get();
    if (state.subscription) {
      supabase.removeChannel(state.subscription);
      set({ subscription: null });
    }
  },

  checkUserRole: async (userId) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      const { data: countData } = await supabase.rpc('get_visualizer_count', { 
        _user_id: userId 
      });
      
      const role = roleData?.role || 'user';
      const count = countData || 0;
      
      set({ 
        userRole: role, 
        visualizerCount: count,
        quotaRemaining: role === 'admin' ? 999 : Math.max(0, 5 - count)
      });
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  },
}));