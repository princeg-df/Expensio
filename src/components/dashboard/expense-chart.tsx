'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';

type ExpenseChartProps = {
  data: Transaction[];
};

export function ExpenseChart({ data }: ExpenseChartProps) {
    const chartData = useMemo(() => {
        const monthlyExpenses: { [key: string]: number } = {};
        data.filter(t => t.type === 'expense').forEach(transaction => {
            const month = new Date(transaction.date.seconds * 1000).toLocaleString('default', { month: 'short' });
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + transaction.amount;
        });

        return Object.entries(monthlyExpenses).map(([name, total]) => ({ name, total }));
    }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Trends</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
            <Tooltip
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
             />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
