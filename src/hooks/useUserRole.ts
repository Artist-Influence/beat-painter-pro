import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserRole() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  // Start in a loading state so gates (RequireAdmin) wait for the real answer
  // instead of briefly seeing 'user' and redirecting an admin away.
  const [isLoading, setIsLoading] = useState(true);

  const checkUserRole = async () => {
    if (!user) {
      setUserRole('user');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserRole(data?.role || 'user');
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUserRole();
  }, [user]);

  const makeAdmin = async (userId: string) => {
    if (!user || userRole !== 'admin') return false;
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' });
      
      return !error;
    } catch (error) {
      console.error('Error making user admin:', error);
      return false;
    }
  };

  return {
    userRole,
    isLoading,
    checkUserRole,
    makeAdmin,
    isAdmin: userRole === 'admin'
  };
}