
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, isAfter } from 'date-fns';

type ExpenseChartProps = {
  transactions: Transaction[];
  emis: Emi[];
  autopays: Autopay[];
};

export function ExpenseChart({ transactions, emis, autopays }: ExpenseChartProps) {
    const chartData = useMemo(() => {
        const data: { name: string, total: number }[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const year = d.getFullYear();
            const key = `${monthName} '${String(year).slice(2)}'`;
            
            const interval = { start: startOfMonth(d), end: endOfMonth(d) };

            const expensesFromTransactions = transactions
                .filter(t => t.type === 'expense' && t.date && isWithinInterval(t.date.toDate(), interval))
                .reduce((sum, t) => sum + t.amount, 0);

            const emisAmount = emis.reduce((sum, emi) => {
                if (emi.monthsRemaining > 0 && emi.startDate && !isAfter(emi.startDate.toDate(), interval.end)) {
                    return sum + emi.amount;
                }
                return sum;
            }, 0);

            const autopaysAmount = autopays.reduce((sum, autopay) => {
                if (autopay.startDate && !isAfter(autopay.startDate.toDate(), interval.end)) {
                    let monthlyAmount = 0;
                    switch (autopay.frequency) {
                        case 'Monthly': monthlyAmount = autopay.amount; break;
                        case 'Quarterly': monthlyAmount = autopay.amount / 3; break;
                        case 'Half-Yearly': monthlyAmount = autopay.amount / 6; break;
                        case 'Yearly': monthlyAmount = autopay.amount / 12; break;
                    }
                    return sum + monthlyAmount;
                }
                return sum;
            }, 0);
            
            const total = expensesFromTransactions + emisAmount + autopaysAmount;
            data.push({ name: key, total });
        }

        return data;

    }, [transactions, emis, autopays]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Analysis</CardTitle>
        <CardDescription>Your spending trends over the last 6 months, including fixed payments.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {chartData.some(d => d.total > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip
                  contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{
                    fontWeight: 600
                  }}
                  cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">No expense data for the last 6 months.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
