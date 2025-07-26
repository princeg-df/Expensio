'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { cn } from '@/lib/utils';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ArrowDown, ArrowUp, PiggyBank, Repeat, Wallet, PlusCircle, Edit } from 'lucide-react';

type DeletionInfo = {
  id: string;
  type: 'transaction' | 'emi' | 'autopay';
} | null;


export default function DashboardPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [autopays, setAutopays] = useState<Autopay[]>([]);
  const [budget, setBudget] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddEmiOpen, setIsAddEmiOpen] = useState(false);
  const [isAddAutopayOpen, setIsAddAutopayOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingEmi, setEditingEmi] = useState<Emi | null>(null);
  const [editingAutopay, setEditingAutopay] = useState<Autopay | null>(null);

  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

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
  }, [user]);


  useEffect(() => {
    if (!user) return;

    fetchData(); 

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
    setIsAddTransactionOpen(false);
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
    setIsAddEmiOpen(false);
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
    setIsAddAutopayOpen(false);
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
           <AddTransactionDialog 
              open={isAddTransactionOpen || !!editingTransaction}
              onOpenChange={(open) => {
                if(!open) { setEditingTransaction(null); setIsAddTransactionOpen(false); }
              }}
              trigger={
                <Button onClick={() => setIsAddTransactionOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add Transaction
                </Button>
              }
              onAddOrUpdateTransaction={handleAddOrUpdateTransaction}
              existingTransaction={editingTransaction}
            />
            <AddEmiDialog
              open={isAddEmiOpen || !!editingEmi}
              onOpenChange={(open) => {
                if(!open) { setEditingEmi(null); setIsAddEmiOpen(false); }
              }}
              trigger={
                <Button variant="secondary" onClick={() => setIsAddEmiOpen(true)}>
                    <Repeat className="mr-2 h-4 w-4"/>
                    Add EMI
                </Button>
              }
              onAddOrUpdateEmi={handleAddOrUpdateEmi}
              existingEmi={editingEmi}
            />
            <AddAutopayDialog 
              open={isAddAutopayOpen || !!editingAutopay}
              onOpenChange={(open) => {
                if(!open) { setEditingAutopay(null); setIsAddAutopayOpen(false); }
              }}
              trigger={
                <Button variant="secondary" onClick={() => setIsAddAutopayOpen(true)}>
                    <Repeat className="mr-2 h-4 w-4"/>
                    Add Autopay
                </Button>
              }
              onAddOrUpdateAutopay={handleAddOrUpdateAutopay}
              existingAutopay={editingAutopay}
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
        <div className="lg:col-span-2 space-y-6">
           <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Recent Transactions</CardTitle>
                <div className="flex space-x-1 bg-muted p-1 rounded-full text-sm">
                    <button onClick={() => setActiveFilter('all')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'all' ? 'bg-background shadow' : '')}>All</button>
                    <button onClick={() => setActiveFilter('income')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'income' ? 'bg-background shadow' : '')}>Income</button>
                    <button onClick={() => setActiveFilter('expense')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'expense' ? 'bg-background shadow' : '')}>Expenses</button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionTable 
                transactions={filteredTransactions} 
                onEdit={(t) => { setEditingTransaction(t); setIsAddTransactionOpen(true); }}
                onDelete={(id) => openDeleteDialog(id, 'transaction')}
              />
            </CardContent>
           </Card>
            <ExpenseChart data={transactions} />
        </div>
        <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Budget</CardTitle>
                    <CardDescription className="text-xs">Set your monthly budget.</CardDescription>
                </div>
                <BudgetSetter currentBudget={budget} onSetBudget={handleSetBudget} />
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                 <div className="flex-1">
                    <CardTitle>Running EMIs</CardTitle>
                    <CardDescription className="text-xs">Your ongoing EMIs.</CardDescription>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsAddEmiOpen(true)}><PlusCircle className="h-4 w-4"/></Button>
              </CardHeader>
              <CardContent>
               <EmiTable 
                emis={emis} 
                onEdit={(e) => { setEditingEmi(e); setIsAddEmiOpen(true); }}
                onDelete={(id) => openDeleteDialog(id, 'emi')}
               />
              </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                    <CardTitle>Autopay</CardTitle>
                    <CardDescription className="text-xs">Your recurring payments.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsAddAutopayOpen(true)}><PlusCircle className="h-4 w-4"/></Button>
              </CardHeader>
              <CardContent>
               <AutopayTable 
                autopays={autopays} 
                onEdit={(a) => { setEditingAutopay(a); setIsAddAutopayOpen(true); }}
                onDelete={(id) => openDeleteDialog(id, 'autopay')}
               />
              </CardContent>
            </Card>
            
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
      
    </div>
  );
}
