
import type { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

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
  id:string;
  name: string;
  amount: number;
  startDate: Timestamp;
  nextPaymentDate: Timestamp;
  category: 'Subscription' | 'Investment' | 'Insurance' | 'Other';
  frequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
}

export type Category = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// User type
export type AppUser = {
  id: string;
  email: string;
  name: string;
  mobileNumber?: string;
  isPlaceholder?: boolean;
  user?: User;
};


// Types for SplitEase Feature
export type InvitedMember = string; // Just the email now

export type Group = {
  id: string;
  name: string;
  members: string[]; // Array of user UIDs
  createdAt: Timestamp;
  createdBy: string; // UID of the user who created the group
};

export type GroupExpense = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string; // UID of the user who paid
  splitWith: { uid: string; amount: number }[]; // Array of objects with UID and their share
  date: Timestamp;
};
