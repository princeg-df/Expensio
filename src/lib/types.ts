import type { Timestamp } from 'firebase/firestore';

export type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: Timestamp;
  type: 'expense' | 'income';
};

export type Emi = {
  id: string;
  name: string;
  amount: number;
  loanAmount: number;
  startDate: Timestamp;
  monthsRemaining: number;
  nextPaymentDate: Timestamp;
}

export type Autopay = {
  id: string;
  name: string;
  amount: number;
  nextPaymentDate: Timestamp;
  category: 'Subscription' | 'Investment' | 'Insurance' | 'Other';
  frequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
}

export type Category = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
