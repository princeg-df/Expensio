
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, Receipt, Car, Home, UtensilsCrossed, Plane, ShoppingCart, Lightbulb, Ticket, HandCoins, Briefcase, Pencil, Trash2 } from 'lucide-react';
import type { Transaction, Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

type TransactionTableProps = {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
};

const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    'Home Loan': Home,
    'Car Loan': Car,
    'Food': UtensilsCrossed,
    'Travel': Plane,
    'Shopping': ShoppingCart,
    'Utilities': Lightbulb,
    'Entertainment': Ticket,
    'Salary': Briefcase,
    'Freelance': HandCoins,
    'Investment': Landmark,
    'Other': Receipt,
};

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  const sortedTransactions = [...transactions].sort((a, b) => b.date.seconds - a.date.seconds);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedTransactions.map((transaction) => {
                  const Icon = categoryIcons[transaction.category] || Receipt;
                  return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-md">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span>{transaction.category}</span>
                        <Badge
                          variant={transaction.type === 'expense' ? 'destructive' : 'default'}
                          className={cn(
                            'w-fit text-xs',
                            transaction.type === 'income' && 'bg-green-500/20 text-green-400 border-green-500/20'
                          )}
                        >
                          {transaction.type}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.date.seconds * 1000).toLocaleDateString()}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-semibold",
                    transaction.type === 'expense' ? 'text-destructive' : 'text-green-400'
                  )}>
                    {transaction.type === 'expense' ? '-' : '+'} ₹{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)}>
                          <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(transaction.id)}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
