import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
       <div 
        className="fixed inset-0 z-[-1] bg-gradient-to-br from-secondary via-background to-background bg-[length:400%_400%]"
      />
      <div className="w-full max-w-sm bg-card/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-border">
        {children}
      </div>
    </main>
  );
}
