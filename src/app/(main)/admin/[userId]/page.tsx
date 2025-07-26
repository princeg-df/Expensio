'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Transaction, Emi, Autopay } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { EmiTable } from '@/components/dashboard/emi-table';
import { AutopayTable } from '@/components/dashboard/autopay-table';

const ADMIN_EMAIL = 'imshardadeen1@gmail.com';

export default function UserDetailPage() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [autopays, setAutopays] = useState<Autopay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId || !adminUser) return;
    setLoading(true);
    try {
      // Fetch user details
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUser({ email: userDocSnap.data().email });
      } else {
        throw new Error('User not found');
      }

      // Fetch transactions
      const transactionsQuery = query(collection(db, `users/${userId}/transactions`));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      setTransactions(transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));

      // Fetch EMIs
      const emisQuery = query(collection(db, `users/${userId}/emis`));
      const emisSnapshot = await getDocs(emisQuery);
      setEmis(emisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Emi)));

      // Fetch Autopays
      const autopaysQuery = query(collection(db, `users/${userId}/autopays`));
      const autopaysSnapshot = await getDocs(autopaysQuery);
      setAutopays(autopaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Autopay)));

    } catch (error) {
      console.error("Error fetching user data: ", error);
    } finally {
      setLoading(false);
    }
  }, [userId, adminUser]);

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

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
         <Button asChild variant="outline" size="icon">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
            </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">User Financials</h1>
            <p className="text-muted-foreground">Viewing details for {user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>All income and expense records for this user.</CardDescription>
            </CardHeader>
            <CardContent>
                <TransactionTable transactions={transactions} onEdit={() => {}} onDelete={() => {}} />
            </CardContent>
        </Card>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Running EMIs</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmiTable emis={emis} onEdit={() => {}} onDelete={() => {}}/>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Autopay</CardTitle>
                </CardHeader>
                <CardContent>
                    <AutopayTable autopays={autopays} onEdit={() => {}} onDelete={() => {}}/>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
