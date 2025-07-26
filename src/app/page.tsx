'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/app-provider';
import { Loader } from '@/components/ui/loader';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div 
        className="fixed inset-0 z-[-1] bg-gradient-to-br from-secondary via-background to-background bg-[length:400%_400%]"
      />
      <Loader />
    </div>
  );
}
