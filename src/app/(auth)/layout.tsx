import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
       <div 
        className="fixed inset-0 z-[-1] bg-gradient-to-br from-blue-100 via-green-50 to-gray-50 bg-[length:400%_400%] animate-gradient"
      />
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border">
        {children}
      </div>
    </main>
  );
}
