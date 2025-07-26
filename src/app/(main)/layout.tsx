
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ExpensioLogo } from '@/components/expensio-logo';
import { Button } from '@/components/ui/button';
import { Menu, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AppDrawer } from '@/components/layout/drawer';


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
  };


  return (
    <>
    <div className="relative min-h-screen w-full bg-background font-body">
       <div 
        className="fixed inset-0 z-[-1] bg-gradient-to-br from-secondary via-background to-background"
      />
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 md:px-8 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <Link href="/dashboard">
                <ExpensioLogo />
              </Link>
            </div>
            
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                    <RefreshCw className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(true)}>
                    <Menu className="h-6 w-6" />
                </Button>
            </div>
            
        </header>
        <main className="flex-1 p-4 md:p-8">
            {children}
        </main>
      </div>
    </div>
    
    <AppDrawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
    </>
  );
}
