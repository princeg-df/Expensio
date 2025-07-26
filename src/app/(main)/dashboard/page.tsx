'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { cn } from '@/lib/utils';

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


import { ArrowDown, ArrowUp, PiggyBank, Repeat } from 'lucide-react';

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
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingEmi, setEditingEmi] = useState<Emi | null>(null);
  const [editingAutopay, setEditingAutopay] = useState<Autopay | null>(null);

  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo>(null);
  

  useEffect(() => {
    if (!user) return;

    const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
    const transactionsUnsubscribe = onSnapshot(transactionsQuery, (querySnapshot) => {
      const transactionsData: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(transactionsData);
    });

    const emisQuery = query(collection(db, `users/${user.uid}/emis`));
    const emisUnsubscribe = onSnapshot(emisQuery, (querySnapshot) => {
      const emisData: Emi[] = [];
      querySnapshot.forEach((doc) => {
        emisData.push({ id: doc.id, ...doc.data() } as Emi);
      });
      setEmis(emisData);
    });

    const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
    const autopaysUnsubscribe = onSnapshot(autopaysQuery, (querySnapshot) => {
      const autopaysData: Autopay[] = [];
      querySnapshot.forEach((doc) => {
        autopaysData.push({ id: doc.id, ...doc.data() } as Autopay);
      });
      setAutopays(autopaysData);
    });

    const userDocRef = doc(db, `users/${user.uid}`);
    const userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBudget(docSnap.data().budget || 0);
      }
    });

    return () => {
      transactionsUnsubscribe();
      emisUnsubscribe();
      autopaysUnsubscribe();
      userUnsubscribe();
    }
  }, [user]);

  const handleSetBudget = async (newBudget: number) => {
    if (!user) return;
    const userDocRef = doc(db, `users/${user.uid}`);
    await updateDoc(userDocRef, { budget: newBudget });
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


  const { totalIncome, totalExpenses, totalFixedPayments, balance } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const emisAmount = emis.reduce((sum, t) => sum + t.amount, 0);
    
    const autopaysAmount = autopays.reduce((sum, t) => sum + t.amount, 0);
    
    const fixed = emisAmount + autopaysAmount;

    return { 
      totalIncome: income, 
      totalExpenses: expenses + fixed,
      totalFixedPayments: fixed,
      balance: income - expenses - fixed,
    };
  }, [transactions, emis, autopays]);

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
        <SummaryCard icon={ArrowUp} title="Total Income" value={totalIncome} />
        <SummaryCard icon={ArrowDown} title="Total Expenses" value={totalExpenses} />
        <SummaryCard icon={Repeat} title="Total Fixed Payments" value={totalFixedPayments} />
        <SummaryCard icon={PiggyBank} title="Your Balance" value={balance} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Recent Transactions</h2>
          <div className="flex space-x-2 mb-4">
            <button onClick={() => setActiveFilter('all')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>All</button>
            <button onClick={() => setActiveFilter('income')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'income' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>Income</button>
            <button onClick={() => setActiveFilter('expense')} className={cn('px-3 py-1 rounded-full text-sm font-medium', activeFilter === 'expense' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>Expenses</button>
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
