'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { usePathname, useRouter } from 'next/navigation';
import LoadingScreen from '@/components/Loading/LoadingScreen';

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType>({ isLoading: true, isAuthenticated: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);

        if (pathname?.startsWith('/dashboard') && !session) {
          router.replace('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(( session) => {
      setIsAuthenticated(!!session);
      if (!session && pathname?.startsWith('/dashboard')) {
        router.replace('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated }}>
      {isLoading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);