import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Emi } from '@/lib/types';
import { Button } from '../ui/button';
import { Pencil, Trash2 } from 'lucide-react';

type EmiTableProps = {
  emis: Emi[];
  onEdit?: (emi: Emi) => void;
  onDelete?: (id: string) => void;
};

export function EmiTable({ emis, onEdit, onDelete }: EmiTableProps) {
  const sortedEmis = [...emis].sort((a, b) => {
    if (!a.nextPaymentDate && !b.nextPaymentDate) return 0;
    if (!a.nextPaymentDate) return 1;
    if (!b.nextPaymentDate) return -1;
    return a.nextPaymentDate.seconds - b.nextPaymentDate.seconds;
  });
  
  if (sortedEmis.length === 0) {
    return (
        <div className="flex items-center justify-center h-24">
            <p className="text-sm text-muted-foreground">No running EMIs.</p>
        </div>
    )
  }

  return (
    <Card className="bg-transparent border-none shadow-none -mt-4">
      <Table>
        <TableBody>
          {sortedEmis.map((emi) => {
              return (
            <TableRow key={emi.id} className="border-b-0">
              <TableCell className="font-medium p-2">
                {emi.name}
                <p className="text-xs text-muted-foreground">{emi.monthsRemaining > 0 ? `${emi.monthsRemaining} months left` : 'Completed'}</p>
              </TableCell>
              <TableCell className="text-right p-2 align-top">
                &#8377;{emi.amount.toFixed(2)}
                 {(onEdit || onDelete) && (
                    <div className="flex justify-end mt-1">
                      {onEdit && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(emi)} className="ml-2 h-7 w-7">
                            <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="ghost" size="icon" onClick={() => onDelete(emi.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                 )}
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </Card>
  );
}
