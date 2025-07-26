import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { Autopay } from '@/lib/types';
import { Badge } from '../ui/badge';

type AutopayTableProps = {
  autopays: Autopay[];
};

export function AutopayTable({ autopays }: AutopayTableProps) {
  const sortedAutopays = [...autopays].sort((a, b) => a.paymentDate.seconds - b.paymentDate.seconds);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Payment Day</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAutopays.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
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
                  {new Date(autopay.paymentDate.seconds * 1000).toLocaleDateString(undefined, { day: 'numeric' })}
                </TableCell>
                <TableCell className="text-right">
                  ₹{autopay.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
