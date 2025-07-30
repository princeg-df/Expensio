
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import { collection, getDocs, query, writeBatch, doc, getDoc, Timestamp, setDoc } from 'firebase/firestore';
import { ExpensioLogo } from '@/components/expensio-logo';
import { Button } from '@/components/ui/button';
import { LogOut, LineChart, Trash2, Download, Upload, Lock, Shield, LayoutDashboard, Users, User, Share2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';
import { ChangePasswordDialog } from './change-password-dialog';
import { Skeleton } from '../ui/skeleton';

type AppDrawerProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const ADMIN_EMAIL = 'princegupta619@gmail.com';


export function AppDrawer({ isOpen, onOpenChange }: AppDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isClearingData, setIsClearingData] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchUserName() {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setUserName(userDocSnap.data().name || 'Guest');
            }
        }
    }
    if(isOpen) {
        fetchUserName();
    }
  }, [user, isOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    onOpenChange(false);
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
      onOpenChange(false);
    }
  };

  const handleExportJson = async () => {
    if (!user) return;

    try {
        const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, date: data.date ? (data.date as Timestamp).toDate() : null };
        }) as Transaction[];

        const emisQuery = query(collection(db, `users/${user.uid}/emis`));
        const emisSnapshot = await getDocs(emisQuery);
        const emis = emisSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, startDate: data.startDate ? (data.startDate as Timestamp).toDate() : null, nextPaymentDate: data.nextPaymentDate ? (data.nextPaymentDate as Timestamp).toDate() : null };
        }) as Emi[];
        
        const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
        const autopaysSnapshot = await getDocs(autopaysQuery);
        const autopays = autopaysSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, nextPaymentDate: data.nextPaymentDate ? (data.nextPaymentDate as Timestamp).toDate() : null };
        }) as Autopay[];

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

        const exportFileDefaultName = 'expensio_data.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        toast({
            title: "Export Successful",
            description: "Your data has been exported as a JSON file.",
        });
    } catch(e) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: "Error",
            description: "Could not export data. Please try again.",
        });
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('File could not be read');
        
        const data = JSON.parse(text);
        const batch = writeBatch(db);

        // Clear existing data before import
        const collections = ['transactions', 'emis', 'autopays'];
         for (const col of collections) {
            const snapshot = await getDocs(query(collection(db, `users/${user.uid}/${col}`)));
            snapshot.forEach(doc => {
            batch.delete(doc.ref);
            });
        }

        if (data.transactions && Array.isArray(data.transactions)) {
          data.transactions.forEach((t: any) => {
            const docRef = doc(collection(db, `users/${user.uid}/transactions`));
            const transactionData = { ...t, date: Timestamp.fromDate(new Date(t.date)) };
            delete transactionData.id;
            batch.set(docRef, transactionData);
          });
        }
        if (data.emis && Array.isArray(data.emis)) {
          data.emis.forEach((e: any) => {
            const docRef = doc(collection(db, `users/${user.uid}/emis`));
            const emiData = { ...e, startDate: Timestamp.fromDate(new Date(e.startDate)), nextPaymentDate: Timestamp.fromDate(new Date(e.nextPaymentDate)) };
            delete emiData.id;
            batch.set(docRef, emiData);
          });
        }
        if (data.autopays && Array.isArray(data.autopays)) {
          data.autopays.forEach((a: any) => {
            const docRef = doc(collection(db, `users/${user.uid}/autopays`));
            const autopayData = { ...a, startDate: Timestamp.fromDate(new Date(a.startDate)), nextPaymentDate: Timestamp.fromDate(new Date(a.nextPaymentDate)) };
            delete autopayData.id;
            batch.set(docRef, autopayData);
          });
        }

        if (data.budget) {
          const userDocRef = doc(db, `users/${user.uid}`);
          batch.set(userDocRef, { budget: data.budget }, { merge: true });
        }

        await batch.commit();

        toast({ title: "Import Successful", description: "Your data has been imported successfully." });
        onOpenChange(false);
        window.location.reload();
      } catch (error) {
        console.error("Error importing data: ", error);
        toast({ variant: "destructive", title: "Import Failed", description: "The file is not a valid JSON backup file." });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle><ExpensioLogo /></SheetTitle>
             {userName ? (
              <SheetDescription asChild>
                <div>
                  <div className="font-semibold text-foreground">{userName}</div>
                  <div className="text-xs">{user?.email}</div>
                </div>
              </SheetDescription>
            ) : (
              <div className="pt-1.5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32 mt-2" />
              </div>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="flex flex-col gap-2">
               <Link href="/dashboard" onClick={() => onOpenChange(false)}>
                <Button variant={pathname === '/dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </Link>
               <Link href="/reports" onClick={() => onOpenChange(false)}>
                <Button variant={pathname === '/reports' ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <LineChart className="mr-2 h-4 w-4" /> Reports
                </Button>
              </Link>
              <Link href="/splitease" onClick={() => onOpenChange(false)}>
                <Button variant={pathname === '/splitease' ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" /> SplitEase
                </Button>
              </Link>
              <Link href="/sharing" onClick={() => onOpenChange(false)}>
                <Button variant={pathname === '/sharing' ? 'secondary' : 'ghost'} className="w-full justify-start">
                    <Share2 className="mr-2 h-4 w-4" /> Sharing
                </Button>
              </Link>
               {user?.email === ADMIN_EMAIL && (
                <Link href="/admin" onClick={() => onOpenChange(false)}>
                    <Button variant={pathname.startsWith('/admin') ? 'secondary' : 'ghost'} className="w-full justify-start">
                        <Shield className="mr-2 h-4 w-4" /> Admin
                    </Button>
                </Link>
               )}
              <Separator />
               <Link href="/profile" onClick={() => onOpenChange(false)}>
                <Button variant={pathname === '/profile' ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setIsChangePasswordOpen(true)} className="w-full justify-start">
                  <Lock className="mr-2 h-4 w-4" /> Change Password
              </Button>
              <Separator />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
              <Button variant="ghost" className="w-full justify-start" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" /> Import Data
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={handleExportJson}>
                  <Download className="mr-2 h-4 w-4" /> Export as JSON
              </Button>
              <Separator />
               <Button variant="ghost" onClick={() => setIsClearingData(true)} className="w-full justify-start text-destructive hover:text-destructive">
                 <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
               </Button>
            </nav>
          </div>
          <div className="p-4 border-t">
             <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
             </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isClearingData} onOpenChange={setIsClearingData}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all of your data.
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

      <ChangePasswordDialog 
        isOpen={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
    </>
  )
}
