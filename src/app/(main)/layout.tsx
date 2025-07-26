'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import { collection, getDocs, query, writeBatch, doc } from 'firebase/firestore';
import { FinSightLogo } from '@/components/finsight-logo';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, MoreVertical, Trash2, Download, Upload, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, Emi, Autopay } from '@/lib/types';


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isClearingData, setIsClearingData] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleClearAllData = async () => {
    if (!user) return;

    try {
      const collections = ['transactions', 'emis', 'autopays'];
      const batch = writeBatch(db);

      for (const col of collections) {
        const snapshot = await getDocs(query(collection(db, `users/${user.uid}/${col}`)));
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      const userDocRef = doc(db, `users/${user.uid}`);
      batch.update(userDocRef, { budget: 0 });

      await batch.commit();

      toast({
        title: "Data Cleared",
        description: "All your financial data has been successfully cleared.",
      });
    } catch (error) {
      console.error("Error clearing data: ", error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Could not clear all data. Please try again.",
      });
    } finally {
      setIsClearingData(false);
    }
  };

  const handleExportJson = async () => {
    if (!user) return;

    try {
        const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactions = transactionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as any).toDate() })) as Transaction[];

        const emisQuery = query(collection(db, `users/${user.uid}/emis`));
        const emisSnapshot = await getDocs(emisQuery);
        const emis = emisSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, paymentDate: (doc.data().paymentDate as any).toDate() })) as Emi[];
        
        const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
        const autopaysSnapshot = await getDocs(autopaysQuery);
        const autopays = autopaysSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, paymentDate: (doc.data().paymentDate as any).toDate() })) as Autopay[];

        const userDocRef = doc(db, `users/${user.uid}`);
        const userDocSnap = await getDoc(userDocRef);
        const budget = userDocSnap.exists() ? userDocSnap.data().budget : 0;

        const dataToExport = {
            transactions,
            emis,
            autopays,
            budget
        };

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = 'finsight_data.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        toast({
            title: "Export Successful",
            description: "Your data has been exported as a JSON file.",
        });
    } catch(e) {
        toast({
            variant: 'destructive',
            title: "Error",
            description: "Could not export data. Please try again.",
        });
    }
  }
  
  const handleRefresh = () => {
    window.location.reload();
  }


  return (
    <>
    <div className="relative min-h-screen w-full bg-background font-body">
       <div 
        className="fixed inset-0 z-[-1] bg-gradient-to-br from-blue-100 via-green-50 to-gray-50 bg-[length:400%_400%] animate-gradient"
      />
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card/80 px-4 md:px-8 backdrop-blur-sm sticky top-0 z-10">
            <div>
                <FinSightLogo />
            </div>
            {user && (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>Refresh Data</span>
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Export Data</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={handleExportJson}>As JSON</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsClearingData(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Clear All Data</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.email ?? ''} />
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
            </div>
          )}
        </header>
        <main className="flex-1 p-4 md:p-8">
            {children}
        </main>
      </div>
    </div>
    <AlertDialog open={isClearingData} onOpenChange={setIsClearingData}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all of your
            transactions, EMIs, and autopay data. Your budget will also be reset to zero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={handleClearAllData}
          >
            Yes, delete everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
