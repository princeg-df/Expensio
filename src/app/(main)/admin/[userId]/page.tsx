
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, ShieldAlert, CircleDollarSign, PlusCircle, Repeat } from 'lucide-react';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { EmiTable } from '@/components/dashboard/emi-table';
import { AutopayTable } from '@/components/dashboard/autopay-table';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { AddTransactionDialog } from '@/components/dashboard/add-transaction-dialog';
import { AddEmiDialog } from '@/components/dashboard/add-emi-dialog';
import { AddAutopayDialog } from '@/components/dashboard/add-autopay-dialog';


const ADMIN_EMAIL = 'princegupta619@gmail.com';

type DeletionInfo = {
  id: string;
  type: 'transaction' | 'emi' | 'autopay';
} | null;

export default function UserDetailPage() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [autopays, setAutopays] = useState<Autopay[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddEmiOpen, setIsAddEmiOpen] = useState(false);
  const [isAddAutopayOpen, setIsAddAutopayOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingEmi, setEditingEmi] = useState<Emi | null>(null);
  const [editingAutopay, setEditingAutopay] = useState<Autopay | null>(null);

  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo>(null);

  const fetchData = useCallback(async () => {
    if (!userId || !adminUser) return;
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUser({ email: userData.email });
        setBudget(userData.budget || 0);
      } else {
        throw new Error('User not found');
      }

      const transactionsQuery = query(collection(db, `users/${userId}/transactions`));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      setTransactions(transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));

      const emisQuery = query(collection(db, `users/${userId}/emis`));
      const emisSnapshot = await getDocs(emisQuery);
      setEmis(emisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Emi)));

      const autopaysQuery = query(collection(db, `users/${userId}/autopays`));
      const autopaysSnapshot = await getDocs(autopaysQuery);
      setAutopays(autopaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Autopay)));

    } catch (error) {
      console.error("Error fetching user data: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch user data.' });
    } finally {
      setLoading(false);
    }
  }, [userId, adminUser, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
        router.replace('/login');
        return;
    }
    if (adminUser.email !== ADMIN_EMAIL) {
      router.replace('/dashboard');
      return;
    }
    fetchData();
  }, [adminUser, authLoading, fetchData, router]);

  const handleAddOrUpdateTransaction = async (data: Omit<Transaction, 'id' | 'date'> & { date: Date }, id?: string) => {
    const transactionData = { ...data, date: Timestamp.fromDate(data.date), amount: Number(data.amount) };
    const path = `users/${userId}/transactions`;
    if (id) {
      await updateDoc(doc(db, path, id), transactionData);
    } else {
      await addDoc(collection(db, path), transactionData);
    }
    setEditingTransaction(null);
    setIsAddTransactionOpen(false);
    fetchData();
  };

  const handleAddOrUpdateEmi = async (data: Omit<Emi, 'id' | 'paymentDate'> & { paymentDate: Date }, id?: string) => {
     const emiData = { ...data, paymentDate: Timestamp.fromDate(data.paymentDate), amount: Number(data.amount), monthsRemaining: Number(data.monthsRemaining) };
    const path = `users/${userId}/emis`;
    if (id) {
      await updateDoc(doc(db, path, id), emiData);
    } else {
      await addDoc(collection(db, path), emiData);
    }
    setEditingEmi(null);
    setIsAddEmiOpen(false);
    fetchData();
  };
  
  const handleAddOrUpdateAutopay = async (data: Omit<Autopay, 'id' | 'paymentDate'> & { paymentDate: Date }, id?: string) => {
    const autopayData = { ...data, paymentDate: Timestamp.fromDate(data.paymentDate), amount: Number(data.amount) };
    const path = `users/${userId}/autopays`;
    if (id) {
      await updateDoc(doc(db, path, id), autopayData);
    } else {
      await addDoc(collection(db, path), autopayData);
    }
    setEditingAutopay(null);
    setIsAddAutopayOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deletionInfo) return;
    const { id, type } = deletionInfo;
    await deleteDoc(doc(db, `users/${userId}/${type}s`, id));
    setDeletionInfo(null);
    fetchData();
  };

  const openDeleteDialog = (id: string, type: 'transaction' | 'emi' | 'autopay') => {
    setDeletionInfo({ id, type });
  };
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsAddTransactionOpen(true);
  };
  
  const handleEditEmi = (emi: Emi) => {
    setEditingEmi(emi);
    setIsAddEmiOpen(true);
  };

  const handleEditAutopay = (autopay: Autopay) => {
    setEditingAutopay(autopay);
    setIsAddAutopayOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (adminUser?.email !== ADMIN_EMAIL) {
     return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/admin">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Financials</h1>
                <p className="text-muted-foreground break-all">Viewing details for {user?.email}</p>
            </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => setIsAddTransactionOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add Transaction
            </Button>
            <Button variant="secondary" onClick={() => setIsAddEmiOpen(true)}>
                <Repeat className="mr-2 h-4 w-4"/>
                Add EMI
            </Button>
            <Button variant="secondary" onClick={() => setIsAddAutopayOpen(true)}>
                <Repeat className="mr-2 h-4 w-4"/>
                Add Autopay
            </Button>
        </div>
      </div>

       {budget !== null && (
        <div className="grid max-w-xs">
          <SummaryCard 
            icon={CircleDollarSign} 
            title="Monthly Budget" 
            value={budget} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>All income and expense records for this user.</CardDescription>
            </CardHeader>
            <CardContent>
                <TransactionTable transactions={transactions} onEdit={handleEditTransaction} onDelete={(id) => openDeleteDialog(id, 'transaction')} />
            </CardContent>
        </Card>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Running EMIs</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmiTable emis={emis} onEdit={handleEditEmi} onDelete={(id) => openDeleteDialog(id, 'emi')}/>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Autopay</CardTitle>
                </CardHeader>
                <CardContent>
                    <AutopayTable autopays={autopays} onEdit={handleEditAutopay} onDelete={(id) => openDeleteDialog(id, 'autopay')}/>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
    
    <AddTransactionDialog 
      open={isAddTransactionOpen || !!editingTransaction}
      onOpenChange={(open) => { if(!open) { setEditingTransaction(null); setIsAddTransactionOpen(false); } }}
      onAddOrUpdateTransaction={handleAddOrUpdateTransaction}
      existingTransaction={editingTransaction}
    />
    <AddEmiDialog
      open={isAddEmiOpen || !!editingEmi}
      onOpenChange={(open) => { if(!open) { setEditingEmi(null); setIsAddEmiOpen(false); } }}
      onAddOrUpdateEmi={handleAddOrUpdateEmi}
      existingEmi={editingEmi}
    />
    <AddAutopayDialog 
      open={isAddAutopayOpen || !!editingAutopay}
      onOpenChange={(open) => { if(!open) { setEditingAutopay(null); setIsAddAutopayOpen(false); } }}
      onAddOrUpdateAutopay={handleAddOrUpdateAutopay}
      existingAutopay={editingAutopay}
    />
    
    <AlertDialog open={!!deletionInfo} onOpenChange={() => setDeletionInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
