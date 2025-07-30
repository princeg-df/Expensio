
'use client';

import type { GroupExpense, AppUser } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, User } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ExpenseListProps = {
  expenses: GroupExpense[];
  members: AppUser[];
  onEdit: (expense: GroupExpense) => void;
  onDelete: (expense: GroupExpense) => void;
};

export function ExpenseList({ expenses, members, onEdit, onDelete }: ExpenseListProps) {
  const getMember = (uid: string) => {
    return members.find(m => m.id === uid);
  };

  const regularExpenses = expenses.filter(e => !e.isSettlement);

  if (regularExpenses.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card">
        <h3 className="text-lg font-semibold">No Expenses Yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">Add an expense to get started.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {regularExpenses.map(expense => {
        const paidByMember = getMember(expense.paidBy);
        return (
          <li key={expense.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Avatar>
                            <AvatarFallback>
                                {paidByMember?.name ? paidByMember.name.charAt(0).toUpperCase() : <User className="h-4 w-4"/>}
                            </AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Paid by {paidByMember?.name || 'Unknown'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <div className="flex-1">
              <p className="font-semibold">{expense.description}</p>
              <p className="text-sm text-muted-foreground">
                 {format(expense.date.toDate(), 'dd MMM, yyyy')}
              </p>
            </div>
            <div className="text-right">
                 <p className="font-bold text-lg">₹{expense.amount.toFixed(2)}</p>
                 <p className="text-xs text-muted-foreground">
                    Split with {expense.splitWith.length}
                 </p>
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
        )
      })}
    </ul>
  );
}
