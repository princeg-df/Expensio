'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { useMemo } from 'react';

type ExpenseChartProps = {
  transactions: Transaction[];
  emis: Emi[];
  autopays: Autopay[];
};

export function ExpenseChart({ transactions, emis, autopays }: ExpenseChartProps) {
    const chartData = useMemo(() => {
        const data: { [key: string]: number } = {};
        const now = new Date();

        // Initialize data for the last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const year = d.getFullYear();
            const key = `${monthName} '${String(year).slice(2)}'`;
            data[key] = 0;
        }

        // Add variable expenses from transactions
        transactions.forEach(t => {
            if (t.type === 'expense') {
                const transactionDate = t.date.toDate();
                const monthName = transactionDate.toLocaleString('default', { month: 'short' });
                const year = transactionDate.getFullYear();
                const key = `${monthName} '${String(year).slice(2)}'`;
                if (key in data) {
                    data[key] += t.amount;
                }
            }
        });

        // Add fixed expenses from EMIs and Autopays
        Object.keys(data).forEach(key => {
            const [monthName, yearShort] = key.split(' ');
            const year = parseInt(`20${yearShort.slice(1)}`);
            const month = new Date(Date.parse(monthName +" 1, " + year)).getMonth();

            emis.forEach(emi => {
                data[key] += emi.amount;
            });

            autopays.forEach(autopay => {
                let monthlyAmount = 0;
                if (autopay.frequency === 'Monthly') {
                    monthlyAmount = autopay.amount;
                } else if (autopay.frequency === 'Quarterly') {
                    const paymentMonth = autopay.paymentDate.toDate().getMonth();
                    if ((month - paymentMonth + 12) % 3 === 0) {
                        monthlyAmount = autopay.amount;
                    }
                } else if (autopay.frequency === 'Yearly') {
                    const paymentMonth = autopay.paymentDate.toDate().getMonth();
                    if (month === paymentMonth) {
                        monthlyAmount = autopay.amount;
                    }
                }
                data[key] += monthlyAmount;
            });
        });

        return Object.keys(data).map(key => ({
            name: key,
            total: data[key],
        }));

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
