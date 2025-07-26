import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

type SummaryCardProps = {
  icon: LucideIcon;
  title: string;
  value: number;
  isCurrency?: boolean;
  action?: React.ReactNode;
};

export function SummaryCard({ icon: Icon, title, value, isCurrency = true, action }: SummaryCardProps) {
  const formattedValue = isCurrency
    ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value.toLocaleString();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
           <Icon className="h-4 w-4 text-muted-foreground" />
           <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
      </CardContent>
    </Card>
  );
}
