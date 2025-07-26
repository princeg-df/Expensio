import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Emi } from '@/lib/types';
import { Banknote, CalendarDays, Hash } from 'lucide-react';

type EmiTableProps = {
  emis: Emi[];
};

export function EmiTable({ emis }: EmiTableProps) {
  const sortedEmis = [...emis].sort((a, b) => a.paymentDate.seconds - b.paymentDate.seconds);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead>Months Left</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEmis.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No running EMIs.
              </TableCell>
            </TableRow>
          ) : (
            sortedEmis.map((emi) => {
                return (
              <TableRow key={emi.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{emi.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(emi.paymentDate.seconds * 1000).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {emi.monthsRemaining}
                </TableCell>
                <TableCell className="text-right">
                ₹{emi.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
