'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';

type ExpenseChartProps = {
  data: Transaction[];
};

export function ExpenseChart({ data }: ExpenseChartProps) {
    const chartData = useMemo(() => {
        const monthlyExpenses: { [key: string]: number } = {};
        const expenseTransactions = data.filter(t => t.type === 'expense');
        
        // Ensure we have data for the last 6 months, even if it's zero
        const lastSixMonths: { [key: string]: number } = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const month = d.toLocaleString('default', { month: 'short' });
            lastSixMonths[month] = 0;
        }

        expenseTransactions.forEach(transaction => {
            const month = new Date(transaction.date.seconds * 1000).toLocaleString('default', { month: 'short' });
            if(month in lastSixMonths) {
                lastSixMonths[month] += transaction.amount;
            }
        });

        return Object.entries(lastSixMonths).map(([name, total]) => ({ name, total }));
    }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Analysis</CardTitle>
        <CardDescription>Your spending trends over the last 6 months.</CardDescription>
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
