import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Emi } from '@/lib/types';
import { Button } from '../ui/button';
import { Pencil, Trash2 } from 'lucide-react';

type EmiTableProps = {
  emis: Emi[];
  onEdit: (emi: Emi) => void;
  onDelete: (id: string) => void;
};

export function EmiTable({ emis, onEdit, onDelete }: EmiTableProps) {
  const sortedEmis = [...emis].sort((a, b) => a.paymentDate.seconds - b.paymentDate.seconds);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Payment Date</TableHead>
            <TableHead>Months Left</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEmis.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
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
                  {new Date(emi.paymentDate.seconds * 1000).toLocaleDateString(undefined, { day: 'numeric' })}
                </TableCell>
                <TableCell>
                  {emi.monthsRemaining}
                </TableCell>
                <TableCell>
                  &#8377;{emi.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(emi)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(emi.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
