
'use client';

import { ArrowDownRight, ArrowUpRight, CheckCircle } from 'lucide-react';

type SettlementSummaryProps = {
  owes: { name: string; amount: number }[];
  owed: { name: string; amount: number }[];
};

export function SettlementSummary({ owes, owed }: SettlementSummaryProps) {
  if (owes.length === 0 && owed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/50 h-32">
        <CheckCircle className="h-8 w-8 text-green-500 mb-2"/>
        <h3 className="font-semibold">All Settled Up!</h3>
        <p className="text-sm text-muted-foreground">You have no outstanding balances in this group.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {owes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-destructive">YOU OWE</h3>
          <ul className="space-y-2">
            {owes.map((item, index) => (
              <li key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2">
                   <ArrowUpRight className="h-5 w-5 text-destructive" />
                   <span className="font-medium text-destructive">{item.name}</span>
                </div>
                <span className="font-semibold text-destructive">₹{item.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
       {owed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-green-500">YOU ARE OWED</h3>
          <ul className="space-y-2">
            {owed.map((item, index) => (
              <li key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-green-500/10">
                <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-500">{item.name}</span>
                </div>
                <span className="font-semibold text-green-500">₹{item.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
