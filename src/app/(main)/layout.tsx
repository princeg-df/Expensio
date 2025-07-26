
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import { collection, getDocs, query, writeBatch, doc, getDoc, Timestamp } from 'firebase/firestore';
import { FinSightLogo } from '@/components/finsight-logo';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, MoreVertical, Trash2, Download, Upload, RefreshCw } from 'lucide-react';
import { getFinancialAdvice } from '@/ai/flows/get-financial-advice';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isClearingData, setIsClearingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportPdf = async () => {
    if (!user) return;

    try {
      const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: (doc.data().date as Timestamp).toDate() }));

      const emisQuery = query(collection(db, `users/${user.uid}/emis`));
      const emisSnapshot = await getDocs(emisQuery);
      const emis = emisSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, paymentDate: (doc.data().paymentDate as Timestamp).toDate() }));

      const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
      const autopaysSnapshot = await getDocs(autopaysQuery);
      const autopays = autopaysSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, paymentDate: (doc.data().paymentDate as Timestamp).toDate() }));
      
      const userDocRef = doc(db, `users/${user.uid}`);
      const userDocSnap = await getDoc(userDocRef);
      const budget = userDocSnap.exists() ? userDocSnap.data().budget : 0;
      
      const docPdf = new jsPDF();
      
      // Title
      docPdf.setFontSize(22);
      docPdf.text("FinSight Financial Report", 14, 22);
      docPdf.setFontSize(12);
      docPdf.text(`Report for: ${user.email}`, 14, 30);
      docPdf.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);
      
      let lastTableY = 40;

      // AI Advice
      try {
        const serializableTransactions = transactions.map(t => ({...t, date: t.date.toISOString() } as any));
        const serializableEmis = emis.map(e => ({...e, paymentDate: e.paymentDate.toISOString()} as any));
        const serializableAutopays = autopays.map(a => ({...a, paymentDate: a.paymentDate.toISOString()} as any));
        
        const advice = await getFinancialAdvice({
            budget,
            transactions: serializableTransactions,
            emis: serializableEmis,
            autopays: serializableAutopays,
        });

        docPdf.setFontSize(16);
        docPdf.text("AI Financial Advice", 14, lastTableY + 10);
        docPdf.setFontSize(10);
        const adviceText = docPdf.splitTextToSize(advice.advice, 180); // 180 is width of text block
        docPdf.text(adviceText, 14, lastTableY + 18);
        lastTableY = docPdf.getTextDimensions(adviceText).h + lastTableY + 22;

      } catch (e) {
          // Could not get advice, just continue
          console.error("Could not get AI advice for PDF", e);
      }


      // Transactions
      if(transactions.length > 0) {
        autoTable(docPdf, {
            startY: lastTableY + 10,
            head: [['Date', 'Type', 'Category', 'Amount']],
            body: transactions.map(t => [
            t.date.toLocaleDateString(),
            t.type,
            t.category,
            t.amount.toFixed(2),
            ]),
            headStyles: { fillColor: [33, 150, 243] },
            didDrawPage: (data) => {
              docPdf.setFontSize(18);
              docPdf.text('Transactions', 14, data.settings.margin.top);
            }
        });
        lastTableY = (docPdf as any).lastAutoTable.finalY;
      }
      
      // EMIs
      if(emis.length > 0) {
        autoTable(docPdf, {
            startY: lastTableY + 15,
            head: [['Name', 'Amount', 'Months Remaining', 'Next Payment']],
            body: emis.map(e => [
            e.name,
            e.amount.toFixed(2),
            e.monthsRemaining,
            e.paymentDate.toLocaleDateString(),
            ]),
            headStyles: { fillColor: [33, 150, 243] },
            didDrawPage: (data) => {
               if(data.pageNumber > 1) return;
               docPdf.setFontSize(18);
               docPdf.text('Running EMIs', 14, lastTableY + 10);
            }
        });
        lastTableY = (docPdf as any).lastAutoTable.finalY;
      }

      // Autopays
       if(autopays.length > 0) {
        autoTable(docPdf, {
            startY: lastTableY + 15,
            head: [['Name', 'Category', 'Frequency', 'Amount', 'Next Payment']],
            body: autopays.map(a => [
            a.name,
            a.category,
            a.frequency,
            a.amount.toFixed(2),
            a.paymentDate.toLocaleDateString(),
            ]),
            headStyles: { fillColor: [33, 150, 243] },
            didDrawPage: (data) => {
              if(data.pageNumber > 1) return;
               docPdf.setFontSize(18);
               docPdf.text('Autopay', 14, lastTableY + 10);
            }
        });
       }

      docPdf.save('finsight_report.pdf');

       toast({
            title: "Export Successful",
            description: "Your data has been exported as a PDF file.",
        });

    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Could not export PDF. Please try again.",
      });
    }
  };

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
        if (typeof text !== 'string') {
          throw new Error('File could not be read');
        }
        const data = JSON.parse(text);

        const batch = writeBatch(db);

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
            const emiData = { ...e, paymentDate: Timestamp.fromDate(new Date(e.paymentDate)) };
            delete emiData.id;
            batch.set(docRef, emiData);
          });
        }
        if (data.autopays && Array.isArray(data.autopays)) {
          data.autopays.forEach((a: any) => {
            const docRef = doc(collection(db, `users/${user.uid}/autopays`));
            const autopayData = { ...a, paymentDate: Timestamp.fromDate(new Date(a.paymentDate)) };
            delete autopayData.id;
            batch.set(docRef, autopayData);
          });
        }

        if (data.budget) {
          const userDocRef = doc(db, `users/${user.uid}`);
          batch.set(userDocRef, { budget: data.budget }, { merge: true });
        }

        await batch.commit();

        toast({
          title: "Import Successful",
          description: "Your data has been imported successfully.",
        });
      } catch (error) {
        console.error("Error importing data: ", error);
        toast({
          variant: 'destructive',
          title: "Import Failed",
          description: "The file is not a valid JSON backup file.",
        });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh Data">
                <RefreshCw className="h-5 w-5" />
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
              <Button variant="ghost" size="icon" onClick={handleImportClick} title="Import Data">
                <Upload className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" title="Export Data">
                    <Download className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportJson}>Export as JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf}>Export as PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={() => setIsClearingData(true)} title="Clear All Data" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-5 w-5" />
              </Button>
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
