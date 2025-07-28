
'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

type SettlementSummaryProps = {
  owes: { name: string; amount: number }[];
  owed: { name: string; amount: number }[];
};

export function SettlementSummary({ owes, owed }: SettlementSummaryProps) {
  if (owes.length === 0 && owed.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
        <p className="text-sm text-center text-muted-foreground">All settled up!</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {owes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-destructive">You Owe</h3>
          <ul className="space-y-2">
            {owes.map((item, index) => (
              <li key={index} className="flex items-center justify-between p-2 rounded-md bg-destructive/10">
                <div className="flex items-center gap-2">
                   <ArrowUpRight className="h-4 w-4 text-destructive" />
                   <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-semibold">₹{item.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
       {owed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-green-500">You Are Owed</h3>
          <ul className="space-y-2">
            {owed.map((item, index) => (
              <li key={index} className="flex items-center justify-between p-2 rounded-md bg-green-500/10">
                <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-semibold">₹{item.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
