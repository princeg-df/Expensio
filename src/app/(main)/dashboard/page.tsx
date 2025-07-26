'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { Transaction } from '@/lib/types';

import { SummaryCard } from '@/components/dashboard/summary-card';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { AddTransactionDialog } from '@/components/dashboard/add-transaction-dialog';
import { BudgetSetter } from '@/components/dashboard/budget-setter';

import { DollarSign, Landmark, Receipt } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, `users/${user.uid}/transactions`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactionsData: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(transactionsData);
    });

    const userDocRef = doc(db, `users/${user.uid}`);
    getDoc(userDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        setBudget(docSnap.data().budget || 0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleSetBudget = async (newBudget: number) => {
    if (!user) return;
    const userDocRef = doc(db, `users/${user.uid}`);
    await updateDoc(userDocRef, { budget: newBudget });
    setBudget(newBudget);
  };
  
  const handleAddTransaction = async (data: { type: 'expense' | 'emi'; category: string; amount: number; date: Date }) => {
    if (!user) return;
    await addDoc(collection(db, `users/${user.uid}/transactions`), {
      ...data,
      date: Timestamp.fromDate(data.date),
      amount: Number(data.amount),
    });
  };

  const { totalExpenses, totalEmis, remainingBudget } = useMemo(() => {
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalEmis = transactions
      .filter((t) => t.type === 'emi')
      .reduce((sum, t) => sum + t.amount, 0);
    const remainingBudget = budget - totalExpenses - totalEmis;
    return { totalExpenses, totalEmis, remainingBudget };
  }, [transactions, budget]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your financial overview.</p>
        </div>
        <div className="flex items-center gap-2">
           <BudgetSetter currentBudget={budget} onSetBudget={handleSetBudget} />
           <AddTransactionDialog onAddTransaction={handleAddTransaction} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard icon={DollarSign} title="Total Expenses" value={totalExpenses} />
        <SummaryCard icon={Landmark} title="Total EMIs" value={totalEmis} />
        <SummaryCard icon={Receipt} title="Remaining Budget" value={remainingBudget} isCurrency={budget > 0} />
      </div>

      <div className="grid gap-6">
        <div className="lg:col-span-3">
          <ExpenseChart data={transactions} />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Recent Transactions</h2>
        <TransactionTable transactions={transactions} />
      </div>
    </div>
  );
}
