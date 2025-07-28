
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, addDoc, Timestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Group, AppUser, GroupExpense } from '@/lib/types';
import { useAuth } from '@/providers/app-provider';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import Link from 'next/link';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { MembersList } from '@/components/splitease/members-list';
import { AddExpenseDialog } from '@/components/splitease/add-expense-dialog';
import { ExpenseList } from '@/components/splitease/expense-list';
import { SettlementSummary } from '@/components/splitease/settlement-summary';

export default function GroupDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  useEffect(() => {
    if (!user || !groupId) return;
    setLoading(true);

    const groupDocRef = doc(db, 'groups', groupId);
    
    const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const groupData = docSnap.data() as Group;
            if (groupData.members.includes(user.uid)) {
                setGroup({ id: docSnap.id, ...groupData });

                // Fetch member details
                const memberUsers: AppUser[] = [];
                for (const memberId of groupData.members) {
                    const userDocRef = doc(db, 'users', memberId);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        memberUsers.push({ id: userDocSnap.id, ...userDocSnap.data() } as AppUser);
                    }
                }
                setMembers(memberUsers);

            } else {
                router.push('/splitease');
            }
        } else {
            router.push('/splitease');
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching group details:", error);
        setLoading(false);
    });
    
    const expensesQuery = query(collection(db, 'groups', groupId, 'expenses'));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
        const groupExpenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupExpense));
        setExpenses(groupExpenses.sort((a, b) => b.date.seconds - a.date.seconds));
    });

    return () => {
        unsubscribeGroup();
        unsubscribeExpenses();
    };

  }, [user, groupId, router]);

  const handleAddExpense = async (data: any) => {
    if (!user || !group) return;

    const { description, amount, paidBy, splitWith } = data;
    const splitAmount = amount / splitWith.length;

    const expenseData: Omit<GroupExpense, 'id'> = {
      groupId,
      description,
      amount,
      paidBy,
      splitWith: splitWith.map((uid: string) => ({ uid, amount: splitAmount })),
      date: Timestamp.now(),
    };
    
    try {
        await addDoc(collection(db, 'groups', groupId, 'expenses'), expenseData);
        toast({ title: 'Success', description: 'Expense added successfully.' });
        setIsAddExpenseOpen(false);
    } catch (error) {
        console.error('Error adding expense:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add expense.' });
    }
  };
  
  const { owes, owed } = useMemo(() => {
    if (!user || !members.length || !expenses.length) return { owes: [], owed: [] };

    const balances: { [uid: string]: number } = {};
    members.forEach(m => { balances[m.id] = 0; });

    expenses.forEach(expense => {
        balances[expense.paidBy] += expense.amount;
        expense.splitWith.forEach(share => {
            balances[share.uid] -= share.amount;
        });
    });

    const debtors = Object.entries(balances).filter(([, amount]) => amount < 0).map(([uid, amount]) => ({ uid, amount: -amount }));
    const creditors = Object.entries(balances).filter(([, amount]) => amount > 0).map(([uid, amount]) => ({ uid, amount }));

    const owesList: { name: string, amount: number }[] = [];
    const owedList: { name: string, amount: number }[] = [];
    
    const currentUserBalance = balances[user.id];

    if (currentUserBalance < 0) { // Current user is a debtor
        let amountToSettle = -currentUserBalance;
        for (const creditor of creditors) {
            if (amountToSettle <= 0) break;
            const settlementAmount = Math.min(amountToSettle, creditor.amount);
            if (settlementAmount > 0.01) {
                owesList.push({
                    name: members.find(m => m.id === creditor.uid)?.name || 'Unknown',
                    amount: settlementAmount
                });
                amountToSettle -= settlementAmount;
            }
        }
    } else if (currentUserBalance > 0) { // Current user is a creditor
        let amountToReceive = currentUserBalance;
         for (const debtor of debtors) {
            if (amountToReceive <= 0) break;
            const settlementAmount = Math.min(amountToReceive, debtor.amount);
             if (settlementAmount > 0.01) {
                owedList.push({
                    name: members.find(m => m.id === debtor.uid)?.name || 'Unknown',
                    amount: settlementAmount
                });
                amountToReceive -= settlementAmount;
             }
        }
    }

    return { owes: owesList, owed: owedList };

  }, [expenses, members, user]);


  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }
  
  if (!group) {
    return (
       <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle>Group Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The group you are looking for does not exist or you do not have permission to view it.</p>
          <Button asChild className="mt-4">
            <Link href="/splitease">Back to SplitEase</Link>
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
            <Link href="/splitease">
                <ArrowLeft className="h-4 w-4" />
            </Link>
            </Button>
            <div>
            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
            <p className="text-muted-foreground">Manage your group expenses and members.</p>
            </div>
        </div>
        <Button onClick={() => setIsAddExpenseOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Members</CardTitle>
                </CardHeader>
                <CardContent>
                    <MembersList members={members} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Settlement</CardTitle>
                    <CardDescription>A summary of who owes who.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SettlementSummary owes={owes} owed={owed} />
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Expenses</CardTitle>
                    <CardDescription>All expenses for this group.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ExpenseList expenses={expenses} members={members} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
     <AddExpenseDialog
        isOpen={isAddExpenseOpen}
        onOpenChange={setIsAddExpenseOpen}
        onAddExpense={handleAddExpense}
        members={members}
      />
    </>
  );
}
