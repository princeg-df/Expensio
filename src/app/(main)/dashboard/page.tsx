'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addMonths } from 'date-fns';

import { SummaryCard } from '@/components/dashboard/summary-card';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { AddTransactionDialog } from '@/components/dashboard/add-transaction-dialog';
import { AddEmiDialog } from '@/components/dashboard/add-emi-dialog';
import { EmiTable } from '@/components/dashboard/emi-table';
import { AutopayTable } from '@/components/dashboard/autopay-table';
import { AddAutopayDialog } from '@/components/dashboard/add-autopay-dialog';
import { BudgetSetter } from '@/components/dashboard/budget-setter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { ArrowDown, ArrowUp, PiggyBank, Repeat, Wallet, Trash2, FileJson, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DeletionInfo = {
  id: string;
  type: 'transaction' | 'emi' | 'autopay';
} | null;


export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [autopays, setAutopays] = useState<Autopay[]>([]);
  const [budget, setBudget] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingEmi, setEditingEmi] = useState<Emi | null>(null);
  const [editingAutopay, setEditingAutopay] = useState<Autopay | null>(null);

  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo>(null);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  

  const fetchData = useCallback(async (showToast = false) => {
    if (!user) return;
    setIsRefreshing(true);

    const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactionsData: Transaction[] = [];
    transactionsSnapshot.forEach((doc) => {
      transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    setTransactions(transactionsData);

    const emisQuery = query(collection(db, `users/${user.uid}/emis`));
    const emisSnapshot = await getDocs(emisQuery);
    const emisData: Emi[] = [];
    const batch = writeBatch(db);
    const currentDate = new Date();
    let hasUpdates = false;

    emisSnapshot.forEach((doc) => {
      let emi = { id: doc.id, ...doc.data() } as Emi;
      const paymentDate = emi.paymentDate.toDate();

      if (paymentDate < currentDate) {
          let monthsPassed = 0;
          let nextPaymentDate = paymentDate;

          while(nextPaymentDate < currentDate) {
            monthsPassed++;
            nextPaymentDate = addMonths(nextPaymentDate, 1);
          }
          
          const newMonthsRemaining = emi.monthsRemaining - monthsPassed;

          if (newMonthsRemaining <= 0) {
              batch.delete(doc.ref);
              hasUpdates = true;
          } else {
              emi.monthsRemaining = newMonthsRemaining;
              emi.paymentDate = Timestamp.fromDate(nextPaymentDate);
              batch.update(doc.ref, { 
                  monthsRemaining: newMonthsRemaining,
                  paymentDate: Timestamp.fromDate(nextPaymentDate)
              });
              hasUpdates = true;
              emisData.push(emi);
          }
      } else {
          emisData.push(emi);
      }
    });
    
    if(hasUpdates) {
        await batch.commit();
    }
    setEmis(emisData);

    const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
    const autopaysSnapshot = await getDocs(autopaysQuery);
    const autopaysData: Autopay[] = [];
    autopaysSnapshot.forEach((doc) => {
      autopaysData.push({ id: doc.id, ...doc.data() } as Autopay);
    });
    setAutopays(autopaysData);

    const userDocRef = doc(db, `users/${user.uid}`);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      setBudget(userDocSnap.data().budget || 0);
    }

    setIsRefreshing(false);
    if (showToast) {
      toast({
        title: "Data Refreshed",
        description: "Your financial data is up-to-date.",
      });
    }
  }, [user, toast]);


  useEffect(() => {
    if (!user) return;

    fetchData(); // Initial fetch

    const transactionsUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/transactions`)), () => fetchData());
    const emisUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/emis`)), () => fetchData());
    const autopaysUnsubscribe = onSnapshot(query(collection(db, `users/${user.uid}/autopays`)), () => fetchData());
    const userUnsubscribe = onSnapshot(doc(db, `users/${user.uid}`), () => fetchData());

    return () => {
      transactionsUnsubscribe();
      emisUnsubscribe();
      autopaysUnsubscribe();
      userUnsubscribe();
    }
  }, [user, fetchData]);

  const handleSetBudget = async (newBudget: number) => {
    if (!user) return;
    const userDocRef = doc(db, `users/${user.uid}`);
    await setDoc(userDocRef, { budget: newBudget }, { merge: true });
    setBudget(newBudget);
  };
  
  const handleAddOrUpdateTransaction = async (data: Omit<Transaction, 'id' | 'date'> & { date: Date }, id?: string) => {
    if (!user) return;
    const transactionData = {
      ...data,
      date: Timestamp.fromDate(data.date),
      amount: Number(data.amount),
    };

    if (id) {
      await updateDoc(doc(db, `users/${user.uid}/transactions`, id), transactionData);
    } else {
      await addDoc(collection(db, `users/${user.uid}/transactions`), transactionData);
    }
    setEditingTransaction(null);
  };

  const handleAddOrUpdateEmi = async (data: Omit<Emi, 'id' | 'paymentDate'> & { paymentDate: Date }, id?: string) => {
    if (!user) return;
     const emiData = {
      ...data,
      paymentDate: Timestamp.fromDate(data.paymentDate),
      amount: Number(data.amount),
      monthsRemaining: Number(data.monthsRemaining),
    };
    if (id) {
        await updateDoc(doc(db, `users/${user.uid}/emis`, id), emiData);
    } else {
        await addDoc(collection(db, `users/${user.uid}/emis`), emiData);
    }
    setEditingEmi(null);
  };
  
  const handleAddOrUpdateAutopay = async (data: Omit<Autopay, 'id' | 'paymentDate'> & { paymentDate: Date }, id?: string) => {
    if (!user) return;
    const autopayData = {
      ...data,
      paymentDate: Timestamp.fromDate(data.paymentDate),
      amount: Number(data.amount),
    };
    if (id) {
      await updateDoc(doc(db, `users/${user.uid}/autopays`, id), autopayData);
    } else {
      await addDoc(collection(db, `users/${user.uid}/autopays`), autopayData);
    }
    setEditingAutopay(null);
  };

  const handleDelete = async () => {
    if (!user || !deletionInfo) return;
    const { id, type } = deletionInfo;
    await deleteDoc(doc(db, `users/${user.uid}/${type}s`, id));
    setDeletionInfo(null);
  };
  
  const openDeleteDialog = (id: string, type: 'transaction' | 'emi' | 'autopay') => {
    setDeletionInfo({ id, type });
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

      // Also reset the budget in the user's main doc
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
  
  const handleExportJson = () => {
    if (!user) return;
    const dataToExport = {
      transactions: transactions.map(t => ({...t, date: t.date.toDate()})),
      emis: emis.map(e => ({...e, paymentDate: e.paymentDate.toDate()})),
      autopays: autopays.map(a => ({...a, paymentDate: a.paymentDate.toDate()})),
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
  }


  const { totalIncome, totalExpenses, totalFixedPayments, remainingAmount, netFlow } = useMemo(() => {
    const incomeFromTransactions = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesFromTransactions = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const emisAmount = emis.reduce((sum, t) => sum + t.amount, 0);
    
    const autopaysAmount = autopays.reduce((sum, t) => sum + t.amount, 0);
    
    const fixed = emisAmount + autopaysAmount;
    
    const totalExp = expensesFromTransactions + fixed;

    return { 
      totalIncome: incomeFromTransactions, 
      totalExpenses: totalExp,
      totalFixedPayments: fixed,
      remainingAmount: budget - totalExp,
      netFlow: incomeFromTransactions - totalExp,
    };
  }, [transactions, emis, autopays, budget]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter(t => t.type === activeFilter);
  }, [transactions, activeFilter]);


  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your financial overview.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           <Button variant="ghost" size="icon" onClick={() => fetchData(true)} disabled={isRefreshing}>
             <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
           </Button>
           <BudgetSetter currentBudget={budget} onSetBudget={handleSetBudget} />
           <AddEmiDialog 
              key={`emi-${editingEmi?.id || 'new'}`}
              onAddOrUpdateEmi={handleAddOrUpdateEmi}
              existingEmi={editingEmi}
              onClose={() => setEditingEmi(null)}
            />
           <AddAutopayDialog 
              key={`autopay-${editingAutopay?.id || 'new'}`}
              onAddOrUpdateAutopay={handleAddOrUpdateAutopay}
              existingAutopay={editingAutopay}
              onClose={() => setEditingAutopay(null)}
            />
           <AddTransactionDialog 
              key={`transaction-${editingTransaction?.id || 'new'}`}
              onAddOrUpdateTransaction={handleAddOrUpdateTransaction}
              existingTransaction={editingTransaction}
              onClose={() => setEditingTransaction(null)}
            />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={ArrowUp} title="Monthly Budget" value={budget} />
        <SummaryCard icon={ArrowDown} title="Total Expenses" value={totalExpenses} />
        <SummaryCard icon={Wallet} title="Remaining Amount" value={remainingAmount} />
        <SummaryCard icon={PiggyBank} title="Net Flow" value={netFlow} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Recent Transactions</h2>
            <div className="flex space-x-2">
                <button onClick={() => setActiveFilter('all')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>All</button>
                <button onClick={() => setActiveFilter('income')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'income' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>Income</button>
                <button onClick={() => setActiveFilter('expense')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'expense' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>Expenses</button>
            </div>
           </div>
          <TransactionTable 
            transactions={filteredTransactions} 
            onEdit={setEditingTransaction}
            onDelete={(id) => openDeleteDialog(id, 'transaction')}
          />
        </div>
        <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Running EMIs</h2>
               <EmiTable 
                emis={emis} 
                onEdit={setEditingEmi}
                onDelete={(id) => openDeleteDialog(id, 'emi')}
               />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Autopay Subscriptions</h2>
               <AutopayTable 
                autopays={autopays} 
                onEdit={setEditingAutopay}
                onDelete={(id) => openDeleteDialog(id, 'autopay')}
               />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Expense Analysis</h2>
              <ExpenseChart data={transactions} />
            </div>
             <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Data Management</h2>
              <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={handleExportJson}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Export JSON
                  </Button>
                  <Button variant="destructive" onClick={() => setIsClearingData(true)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All Data
                  </Button>
              </div>
            </div>
        </div>
      </div>

      <AlertDialog open={!!deletionInfo} onOpenChange={() => setDeletionInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              entry from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletionInfo(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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

    </div>
  );
}
