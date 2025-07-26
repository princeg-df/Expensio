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
    <Card className="bg-transparent border-none shadow-none">
      <Table>
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
              <TableRow key={emi.id} className="border-b-0">
                <TableCell className="font-medium p-2">
                  {emi.name} ({emi.monthsRemaining} left)
                </TableCell>
                <TableCell className="text-right p-2">
                  &#8377;{emi.amount.toFixed(2)}
                   <Button variant="ghost" size="icon" onClick={() => onEdit(emi)} className="ml-2 h-7 w-7">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(emi.id)} className="h-7 w-7">
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
