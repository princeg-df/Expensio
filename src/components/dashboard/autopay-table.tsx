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

  if (sortedAutopays.length === 0) {
    return (
        <div className="flex items-center justify-center h-24">
            <p className="text-sm text-muted-foreground">No autopay setup yet.</p>
        </div>
    )
  }

  return (
    <Card className="bg-transparent border-none shadow-none -mt-4">
      <Table>
        <TableBody>
          {sortedAutopays.map((autopay) => {
              return (
            <TableRow key={autopay.id} className="border-b-0">
              <TableCell className="font-medium p-2">
                  <div className="flex flex-col">
                    <span>{autopay.name}</span>
                    <Badge variant="outline" className="w-fit mt-1">{autopay.category}</Badge>
                  </div>
              </TableCell>
              <TableCell className="text-right p-2 align-top">
                &#8377;{autopay.amount.toFixed(2)}
                  <div className="flex justify-end mt-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(autopay)} className="ml-2 h-7 w-7">
                          <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(autopay.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </Card>
  );
}
