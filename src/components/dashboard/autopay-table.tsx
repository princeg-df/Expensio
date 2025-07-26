import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="bg-transparent border-none shadow-none">
      <Table>
        <TableBody>
          {sortedAutopays.length === 0 ? (
            <TableRow>
              <TableCell className="text-center h-24 text-muted-foreground">
                No autopay setup yet.
              </TableCell>
            </TableRow>
          ) : (
            sortedAutopays.map((autopay) => {
                return (
              <TableRow key={autopay.id} className="border-b-0">
                <TableCell className="font-medium p-2">
                    {autopay.name}
                     <Badge variant="outline" className="ml-2">{autopay.category}</Badge>
                </TableCell>
                <TableCell className="text-right p-2">
                  &#8377;{autopay.amount.toFixed(2)}
                   <Button variant="ghost" size="icon" onClick={() => onEdit(autopay)} className="ml-2 h-7 w-7">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(autopay.id)} className="h-7 w-7">
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
