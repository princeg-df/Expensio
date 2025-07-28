
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, Timestamp, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { cn } from '@/lib/utils';
import { addMonths, startOfMonth, endOfMonth, isWithinInterval, isAfter } from 'date-fns';

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
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';

import { CircleDollarSign, Receipt, PiggyBank, Repeat, Wallet, PlusCircle, Edit } from 'lucide-react';

type DeletionInfo = {
  id: string;
  type: 'transaction' | 'emi' | 'autopay';
} | null;


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
        const userDocRef = doc(db, `users/${user.uid}`);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setBudget(userData.budget || 0);

            // Backfill existing user data
            if (!userData.name || !userData.mobileNumber) {
                await updateDoc(userDocRef, {
                    name: userData.name || 'Guest',
                    mobileNumber: userData.mobileNumber || '9999999999',
                });
            }
        }

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
        const emiBatch = writeBatch(db);
        const currentDate = new Date();
        let hasEmiUpdates = false;

        emisSnapshot.forEach((doc) => {
          let emi = { id: doc.id, ...doc.data() } as Emi;
          
          let needsUpdate = false;
          const updates: Partial<Emi> = {};

          if (!emi.startDate) {
            updates.startDate = emi.nextPaymentDate || Timestamp.fromDate(new Date());
            needsUpdate = true;
          }
           if (!emi.nextPaymentDate) {
            updates.nextPaymentDate = emi.startDate || Timestamp.fromDate(new Date());
            needsUpdate = true;
          }

          if (needsUpdate) {
            emiBatch.update(doc.ref, updates);
            hasEmiUpdates = true;
            emi = { ...emi, ...updates }; 
          }
          
          if (emi.nextPaymentDate && emi.monthsRemaining > 0) {
            const nextPaymentDate = emi.nextPaymentDate.toDate();

            if (nextPaymentDate < currentDate) {
                let monthsPassed = 0;
                let newNextPaymentDate = nextPaymentDate;
                
                while(newNextPaymentDate < currentDate && (emi.monthsRemaining - monthsPassed > 0)) {
                    monthsPassed++;
                    newNextPaymentDate = addMonths(newNextPaymentDate, 1);
                }
                
                const newMonthsRemaining = emi.monthsRemaining - monthsPassed;

                if (newMonthsRemaining > 0) {
                    emi.monthsRemaining = newMonthsRemaining;
                    emi.nextPaymentDate = Timestamp.fromDate(newNextPaymentDate);
                    emiBatch.update(doc.ref, { 
                        monthsRemaining: newMonthsRemaining,
                        nextPaymentDate: Timestamp.fromDate(newNextPaymentDate)
                    });
                } else {
                    emi.monthsRemaining = 0;
                    emiBatch.update(doc.ref, { monthsRemaining: 0 });
                }
                hasEmiUpdates = true;
            }
          }
          emisData.push(emi);
        });
        
        if(hasEmiUpdates) {
            await emiBatch.commit();
        }
        setEmis(emisData);

        const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
        const autopaysSnapshot = await getDocs(autopaysQuery);
        const autopaysData: Autopay[] = [];
        const autopayBatch = writeBatch(db);
        let hasAutopayUpdates = false;

        autopaysSnapshot.forEach((doc) => {
            let autopay = { id: doc.id, ...doc.data() } as Autopay;
            if (!autopay.startDate) {
                const updates = { startDate: autopay.nextPaymentDate || Timestamp.fromDate(new Date()) };
                autopayBatch.update(doc.ref, updates);
                autopay = { ...autopay, ...updates };
                hasAutopayUpdates = true;
            }
            autopaysData.push(autopay);
        });

        if (hasAutopayUpdates) {
            await autopayBatch.commit();
        }
        setAutopays(autopaysData);

    } catch (error) {
        console.error("Error fetching data: ", error);
        toast({
            variant: "destructive",
            title: "Error fetching data",
            description: "Could not retrieve your financial data. Please try again later.",
        });
    } finally {
        setLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (authLoading) return;
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
  }, [user, authLoading, fetchData]);

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

  const handleAddOrUpdateEmi = async (data: Omit<Emi, 'id' | 'startDate' | 'nextPaymentDate'> & { startDate: Date, nextPaymentDate: Date }, id?: string) => {
    if (!user) return;
     const emiData = {
      ...data,
      startDate: Timestamp.fromDate(data.startDate),
      nextPaymentDate: Timestamp.fromDate(data.nextPaymentDate),
      amount: Number(data.amount),
      loanAmount: Number(data.loanAmount),
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
  
  const handleAddOrUpdateAutopay = async (data: Omit<Autopay, 'id' | 'startDate' | 'nextPaymentDate'> & { startDate: Date, nextPaymentDate: Date }, id?: string) => {
    if (!user) return;
    const autopayData = {
      ...data,
      startDate: Timestamp.fromDate(data.startDate),
      nextPaymentDate: Timestamp.fromDate(data.nextPaymentDate),
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
  
  const { totalIncome, totalExpenses, remainingAmount, netFlow } = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };

    const incomeFromTransactions = transactions
      .filter((t) => t.type === 'income' && t.date && isWithinInterval(t.date.toDate(), interval))
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesFromTransactions = transactions
      .filter((t) => t.type === 'expense' && t.date && isWithinInterval(t.date.toDate(), interval))
      .reduce((sum, t) => sum + t.amount, 0);

    const emisAmount = emis.reduce((sum, emi) => {
        if (emi.monthsRemaining > 0 && emi.startDate && !isAfter(emi.startDate.toDate(), interval.end)) {
            return sum + emi.amount;
        }
        return sum;
    }, 0);
    
    const autopaysAmount = autopays.reduce((sum, autopay) => {
        if (autopay.startDate && !isAfter(autopay.startDate.toDate(), interval.end)) {
            let monthlyAmount = 0;
            switch (autopay.frequency) {
                case 'Monthly':
                    monthlyAmount = autopay.amount;
                    break;
                case 'Quarterly':
                    monthlyAmount = autopay.amount / 3;
                    break;
                case 'Half-Yearly':
                    monthlyAmount = autopay.amount / 6;
                    break;
                case 'Yearly':
                    monthlyAmount = autopay.amount / 12;
                    break;
            }
            return sum + monthlyAmount;
        }
        return sum;
    }, 0);
    
    const totalExp = expensesFromTransactions + emisAmount + autopaysAmount;

    return { 
      totalIncome: incomeFromTransactions, 
      totalExpenses: totalExp,
      remainingAmount: budget - totalExp,
      netFlow: incomeFromTransactions - totalExp,
    };
  }, [transactions, emis, autopays, budget]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter(t => t.type === activeFilter);
  }, [transactions, activeFilter]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

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
        <SummaryCard 
          icon={CircleDollarSign} 
          title="Monthly Budget" 
          value={budget} 
          action={<BudgetSetter currentBudget={budget} onSetBudget={handleSetBudget} />} 
        />
        <SummaryCard icon={Receipt} title="Total Expenses" value={totalExpenses} />
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
            <ExpenseChart transactions={transactions} emis={emis} autopays={autopays} />
        </div>
        <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                 <div className="grid gap-1">
                    <CardTitle>Running EMIs</CardTitle>
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
                <div className="grid gap-1">
                  <CardTitle>Autopay</CardTitle>
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
