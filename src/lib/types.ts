import type { Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: Timestamp;
  type: 'expense' | 'emi';
};

export type Category = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type FinancialAdvice = {
  advice: string;
};
