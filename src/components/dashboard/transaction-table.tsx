import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Landmark, Receipt, Car, Home, UtensilsCrossed, Plane, ShoppingCart, Lightbulb, Ticket, HandCoins, Briefcase } from 'lucide-react';
import type { Transaction, Category } from '@/lib/types';

type TransactionTableProps = {
  transactions: Transaction[];
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

export function TransactionTable({ transactions }: TransactionTableProps) {
  const sortedTransactions = [...transactions].sort((a, b) => b.date.seconds - a.date.seconds);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
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
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{transaction.category}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={transaction.type === 'expense' ? 'secondary' : 'outline'} className={cn({'bg-green-200/50 text-green-700': transaction.type === 'income'})}>
                    {transaction.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(transaction.date.seconds * 1000).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                ₹{transaction.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
