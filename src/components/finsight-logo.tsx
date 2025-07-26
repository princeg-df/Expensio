import { AreaChart } from 'lucide-react';

export function ExpensioLogo() {
  return (
    <div className="flex items-center gap-2">
      <AreaChart className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold text-foreground">Expensio</h1>
    </div>
  );
}
