
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/providers/app-provider';
import { useParams, useRouter, notFound } from 'next/navigation';
import { doc, getDoc, onSnapshot, collection, query, where, addDoc, updateDoc, deleteDoc, Timestamp, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Group, AppUser, GroupExpense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Users } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { AddExpenseDialog } from '@/components/splitease/add-expense-dialog';
import { ExpenseList } from '@/components/splitease/expense-list';
import { MembersList } from '@/components/splitease/members-list';
import { SettlementSummary } from '@/components/splitease/settlement-summary';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function GroupDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<GroupExpense | null>(null);

  useEffect(() => {
    if (!user || !groupId) return;

    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() } as Group;
        if (!groupData.members.includes(user.uid)) {
          setGroup(null);
          return notFound();
        }
        setGroup(groupData);

        const memberIds = groupData.members;
        const membersPromises = memberIds.map(id => getDoc(doc(db, 'users', id)));
        const memberDocs = await Promise.all(membersPromises);
        const membersData = memberDocs
            .filter(doc => doc.exists())
            .map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
        setMembers(membersData);

      } else {
        setGroup(null);
        notFound();
      }
      setLoading(false);
    });

    const expensesQuery = query(collection(db, 'groups', groupId, 'expenses'));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
      const expensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupExpense));
      setExpenses(expensesData.sort((a,b) => b.date.toMillis() - a.date.toMillis()));
    });
    
    return () => {
      unsubscribeGroup();
      unsubscribeExpenses();
    };

  }, [user, groupId, router]);

  const handleAddOrUpdateExpense = async (data: any, expenseId?: string) => {
    if (!user || !group) return;

    try {
      const expenseData = {
        description: data.description,
        amount: Number(data.amount),
        paidBy: data.paidBy,
        splitWith: data.splitWith.map((uid: string) => ({ uid })),
        date: Timestamp.now(),
        groupId: group.id,
      };
      
      if (expenseId) {
        await updateDoc(doc(db, 'groups', group.id, 'expenses', expenseId), expenseData);
        toast({ title: 'Success', description: 'Expense updated successfully.' });
      } else {
        await addDoc(collection(db, 'groups', group.id, 'expenses'), expenseData);
        toast({ title: 'Success', description: 'Expense added successfully.' });
      }

    } catch (error) {
      console.error('Error adding/updating expense:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to process expense.' });
    } finally {
        setIsAddExpenseOpen(false);
        setEditingExpense(null);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense || !group) return;
    try {
      await deleteDoc(doc(db, 'groups', group.id, 'expenses', deletingExpense.id));
      toast({ title: 'Success', description: 'Expense deleted successfully.' });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete expense.' });
    } finally {
      setDeletingExpense(null);
    }
  }
  
  const { owes, owed } = useMemo(() => {
    if (!user || members.length === 0 || expenses.length === 0) {
      return { owes: [], owed: [] };
    }

    const balances: { [key: string]: number } = {};
    members.forEach(m => {
        if(m.id) balances[m.id] = 0;
    });

    expenses.forEach(expense => {
      if (!balances[expense.paidBy]) balances[expense.paidBy] = 0;
      balances[expense.paidBy] += expense.amount;
      const share = expense.amount / expense.splitWith.length;
      expense.splitWith.forEach(split => {
        if (!balances[split.uid]) balances[split.uid] = 0;
        balances[split.uid] -= share;
      });
    });

    const debtors = Object.entries(balances)
      .filter(([, amount]) => amount < -0.01)
      .map(([uid, amount]) => ({ uid, amount: -amount }));

    const creditors = Object.entries(balances)
      .filter(([, amount]) => amount > 0.01)
      .map(([uid, amount]) => ({ uid, amount }));

    const transactions = [];

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];
      const amount = Math.min(debtor.amount, creditor.amount);

      transactions.push({ from: debtor.uid, to: creditor.uid, amount });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) debtors.shift();
      if (creditor.amount < 0.01) creditors.shift();
    }
    
    const userOwes = transactions
        .filter(t => t.from === user.uid)
        .map(t => ({ name: members.find(m => m.id === t.to)?.name || 'Unknown', amount: t.amount }));

    const userIsOwed = transactions
        .filter(t => t.to === user.uid)
        .map(t => ({ name: members.find(m => m.id === t.from)?.name || 'Unknown', amount: t.amount }));
    
    return { owes: userOwes, owed: userIsOwed };
    
  }, [user, members, expenses]);

  const handleOpenEditDialog = (expense: GroupExpense) => {
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  }

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center"><Loader /></div>;
  }
  
  if (!group) {
    return notFound();
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
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{group.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-1.5"><Users className="h-4 w-4"/> {members.length} member{members.length > 1 ? 's' : ''}</p>
                </div>
            </div>
            <Button onClick={() => { setEditingExpense(null); setIsAddExpenseOpen(true); } }>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ExpenseList expenses={expenses} members={members} onEdit={handleOpenEditDialog} onDelete={setDeletingExpense} />
                    </CardContent>
                 </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Settlements</CardTitle>
                        <CardDescription>Your current balance in the group.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SettlementSummary owes={owes} owed={owed} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MembersList members={members}/>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
      
      <AddExpenseDialog 
        isOpen={isAddExpenseOpen}
        onOpenChange={(open) => { if (!open) { setEditingExpense(null); setIsAddExpenseOpen(false) } else { setIsAddExpenseOpen(true) }}}
        onAddOrUpdateExpense={handleAddOrUpdateExpense}
        members={members}
        existingExpense={editingExpense}
      />
      
      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense: <span className="font-bold">{deletingExpense?.description} (₹{deletingExpense?.amount.toFixed(2)})</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    