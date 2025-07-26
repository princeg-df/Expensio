'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FinSightLogo } from '@/components/finsight-logo';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/providers/app-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
        </aside>
        <main className="flex-1">
          <header className="flex h-16 items-center justify-between border-b bg-card/80 px-4 md:px-8 backdrop-blur-sm sticky top-0 z-10">
              <div className="md:hidden">
                  <FinSightLogo />
              </div>
              <div className="hidden md:block" />
              {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">My Account</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
