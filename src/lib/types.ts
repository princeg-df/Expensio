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
  monthsRemaining: number;
  paymentDate: Timestamp;
}

export type Autopay = {
  id: string;
  name: string;
  amount: number;
  paymentDate: Timestamp;
  category: 'Subscription' | 'Investment' | 'Insurance' | 'Other';
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
}

export type Category = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
