'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FinSightLogo } from '@/components/finsight-logo';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/providers/app-provider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen w-full bg-background font-body">
       <div 
        className="fixed inset-0 z-[-1] bg-gradient-to-br from-primary/10 via-accent/10 to-background bg-[length:400%_400%] animate-gradient"
      />
      <div className="flex">
        <aside className="sticky top-0 h-screen w-64 flex-col border-r bg-card/80 p-6 backdrop-blur-sm hidden md:flex">
          <FinSightLogo />
          <nav className="mt-8 flex flex-1 flex-col">
            <Button variant="ghost" className="justify-start gap-2" asChild>
              <a href="/dashboard" className="text-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </a>
            </Button>
          </nav>
          {user && (
            <div className="mt-auto">
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <Button variant="ghost" className="mt-2 w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </div>
          )}
        </aside>
        <main className="flex-1">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
