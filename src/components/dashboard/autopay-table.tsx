import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Autopay } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Pencil, Trash2 } from 'lucide-react';

type AutopayTableProps = {
  autopays: Autopay[];
  onEdit: (autopay: Autopay) => void;
  onDelete: (id: string) => void;
};

export function AutopayTable({ autopays, onEdit, onDelete }: AutopayTableProps) {
  const sortedAutopays = [...autopays].sort((a, b) => a.paymentDate.seconds - b.paymentDate.seconds);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Payment Day</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAutopays.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No autopay setup yet.
              </TableCell>
            </TableRow>
          ) : (
            sortedAutopays.map((autopay) => {
                return (
              <TableRow key={autopay.id}>
                <TableCell className="font-medium">
                    {autopay.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{autopay.category}</Badge>
                </TableCell>
                 <TableCell>
                   <Badge variant="secondary">{autopay.frequency}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(autopay.paymentDate.seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </TableCell>
                <TableCell>
                  &#8377;{autopay.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(autopay)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(autopay.id)}>
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
