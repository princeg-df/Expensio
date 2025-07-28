
'use client';

import type { GroupExpense, AppUser } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, User } from 'lucide-react';

type ExpenseListProps = {
  expenses: GroupExpense[];
  members: AppUser[];
  onEdit: (expense: GroupExpense) => void;
  onDelete: (expense: GroupExpense) => void;
};

export function ExpenseList({ expenses, members, onEdit, onDelete }: ExpenseListProps) {
  const getMemberName = (uid: string) => {
    return members.find(m => m.id === uid)?.name || 'Unknown User';
  };

  if (expenses.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
        <p className="text-muted-foreground">No expenses added yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {expenses.map(expense => (
        <li key={expense.id} className="flex items-center gap-4 rounded-md border p-4">
           <Avatar className="h-10 w-10">
            <AvatarFallback>
                {getMemberName(expense.paidBy).charAt(0).toUpperCase()}
            </AvatarFallback>
           </Avatar>
           <div className="flex-1">
             <p className="font-semibold">{expense.description}</p>
             <p className="text-sm text-muted-foreground">
                Paid by {getMemberName(expense.paidBy)} on {format(expense.date.toDate(), 'dd MMM yyyy')}
             </p>
           </div>
           <div className="text-right">
                <p className="font-bold text-lg">₹{expense.amount.toFixed(2)}</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-1">
             <Button variant="ghost" size="icon" onClick={() => onEdit(expense)} className="h-8 w-8">
                <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(expense)} className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
            </Button>
           </div>
        </li>
      ))}
    </ul>
  );
}
