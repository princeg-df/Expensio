
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { Transaction, Emi, Autopay } from '@/lib/types';
import { startOfMonth, endOfMonth, isWithinInterval, getYear, format, addMonths, isBefore, getMonth, isAfter } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { HandCoins, Landmark, PiggyBank, Receipt, UtensilsCrossed, Car, Home, Plane, ShoppingCart, Lightbulb, Ticket, Briefcase, CircleDollarSign, Wallet } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

type FinancialEvent = {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'fixed';
  category: string;
  icon: React.ComponentType<{ className?: string }>;
};

const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    'Home Loan': Home,
    'Car Loan': Car,
    'Food': UtensilsCrossed,
    'Travel': Plane,
    'Shopping': ShoppingCart,
    'Utilities': Lightbulb,
    'Entertainment': Ticket,
    'Salary': Briefcase,
    'Freelance': HandCoins,
    'Investment': Landmark,
    'Subscription': Receipt,
    'Insurance': Receipt,
    'Other': Receipt,
};


export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [autopays, setAutopays] = useState<Autopay[]>([]);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  
  const years = useMemo(() => {
    const allDates = [
      ...transactions.filter(t => t.date).map(t => t.date.toDate()),
      ...emis.filter(e => e.startDate).map(e => e.startDate.toDate()),
      ...autopays.filter(a => a.nextPaymentDate).map(a => a.nextPaymentDate.toDate())
    ].filter(Boolean);

    if (allDates.length === 0) return [new Date().getFullYear().toString()];
    
    const allYears = new Set(allDates.map(d => getYear(d)));
    const currentYear = new Date().getFullYear();
    if (!allYears.has(currentYear)) {
        allYears.add(currentYear);
    }
    return Array.from(allYears).sort((a, b) => b - a).map(String);
  }, [transactions, emis, autopays]);

  const months = [
    { value: '0', label: 'January' }, { value: '1', label: 'February' },
    { value: '2', label: 'March' }, { value: '3', label: 'April' },
    { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', 'label': 'August' },
    { value: '8', label: 'September' }, { value: '9', 'label': 'October' },
    { value: '10', label: 'November' }, { value: '11', 'label': 'December' }
  ];

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setBudget(userDocSnap.data().budget || 0);
      }
      
      const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      setTransactions(transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      
      const emisQuery = query(collection(db, `users/${user.uid}/emis`));
      const emisSnapshot = await getDocs(emisQuery);
      setEmis(emisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Emi)));

      const autopaysQuery = query(collection(db, `users/${user.uid}/autopays`));
      const autopaysSnapshot = await getDocs(autopaysQuery);
      setAutopays(autopaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Autopay)));
    } catch(e) {
        console.error(e)
    } finally {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);


  const { monthlyEvents, totalExpenses, totalIncome, netFlow, remainingAmount } = useMemo(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    if (isNaN(month) || isNaN(year)) {
      return { monthlyEvents: [], totalIncome: 0, totalExpenses: 0, netFlow: 0, remainingAmount: 0 };
    }
    const interval = { start: startOfMonth(new Date(year, month)), end: endOfMonth(new Date(year, month)) };

    // --- Create list of events that physically occur this month ---
    let events: FinancialEvent[] = [];
    
    transactions.forEach(t => {
      if (t.date) {
        const tDate = t.date.toDate();
        if (isWithinInterval(tDate, interval)) {
          events.push({
            date: tDate,
            description: t.category,
            amount: t.amount,
            type: t.type,
            category: t.category,
            icon: categoryIcons[t.category] || Receipt,
          });
        }
      }
    });
    
    emis.forEach(emi => {
        if (!emi.startDate || emi.monthsRemaining <= 0 || isAfter(emi.startDate.toDate(), interval.end)) return;
        
        let paymentDate = emi.startDate.toDate();

        while(isBefore(paymentDate, emi.startDate.toDate())) {
          paymentDate = addMonths(paymentDate, 1);
        }

        const loanEndDate = addMonths(emi.startDate.toDate(), emi.monthsRemaining);

        while(isBefore(paymentDate, loanEndDate)) {
             if (getMonth(paymentDate) === month && getYear(paymentDate) === year) {
                events.push({
                   date: paymentDate,
                   description: emi.name,
                   amount: emi.amount,
                   type: 'fixed',
                   category: 'EMI',
                   icon: categoryIcons[emi.name.includes('Car') ? 'Car Loan' : 'Home Loan'] || Home
                });
                break;
            }
            if (isAfter(paymentDate, interval.end)) break;
            paymentDate = addMonths(paymentDate, 1);
        }
    });
    
    autopays.forEach(autopay => {
        if (!autopay.nextPaymentDate || isAfter(autopay.nextPaymentDate.toDate(), interval.end)) return;

        let monthIncrement = 1;
        switch (autopay.frequency) {
            case 'Quarterly': monthIncrement = 3; break;
            case 'Half-Yearly': monthIncrement = 6; break;
            case 'Yearly': monthIncrement = 12; break;
        }

        let paymentDate = autopay.nextPaymentDate.toDate();

        while (isAfter(paymentDate, interval.start) && getYear(paymentDate) > year - 2) {
             paymentDate = addMonths(paymentDate, -monthIncrement);
        }
        
        while (isBefore(paymentDate, interval.end)) {
             if (getMonth(paymentDate) === month && getYear(paymentDate) === year) {
                events.push({
                    date: paymentDate,
                    description: autopay.name,
                    amount: autopay.amount,
                    type: 'fixed',
                    category: autopay.category,
                    icon: categoryIcons[autopay.category] || Receipt,
                });
                break;
             }
            paymentDate = addMonths(paymentDate, monthIncrement);
             if(isAfter(paymentDate, interval.end)) break;
        }
    });

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // --- Calculate monthly cost for summary cards (Accrual Method) ---
    
    const variableExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date && isWithinInterval(t.date.toDate(), interval))
      .reduce((sum, t) => sum + t.amount, 0);

    const emisAmount = emis.reduce((sum, emi) => {
        if (emi.monthsRemaining > 0 && emi.startDate && !isAfter(emi.startDate.toDate(), interval.end)) {
            return sum + emi.amount;
        }
        return sum;
    }, 0);
    
    const autopaysAmount = autopays.reduce((sum, autopay) => {
        if (autopay.nextPaymentDate && !isAfter(autopay.nextPaymentDate.toDate(), interval.end)) {
            let monthlyAmount = 0;
            switch (autopay.frequency) {
                case 'Monthly':
                    monthlyAmount = autopay.amount;
                    break;
                case 'Quarterly':
                    monthlyAmount = autopay.amount / 3;
                    break;
                case 'Half-Yearly':
                    monthlyAmount = autopay.amount / 6;
                    break;
                case 'Yearly':
                    monthlyAmount = autopay.amount / 12;
                    break;
            }
            return sum + monthlyAmount;
        }
        return sum;
    }, 0);
    
    const totalMonthlyExpenses = variableExpenses + emisAmount + autopaysAmount;

    const income = events
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      monthlyEvents: events,
      totalIncome: income,
      totalExpenses: totalMonthlyExpenses,
      netFlow: income - totalMonthlyExpenses,
      remainingAmount: budget - totalMonthlyExpenses,
    };
  }, [transactions, emis, autopays, selectedMonth, selectedYear, budget]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Report</h1>
          <p className="text-muted-foreground">An overview of your finances for a selected month.</p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                    {months.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                    {years.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={CircleDollarSign} title="Monthly Budget" value={budget} />
        <SummaryCard icon={Receipt} title="Total Monthly Cost" value={totalExpenses} />
        <SummaryCard icon={Wallet} title="Remaining Budget" value={remainingAmount} />
        <SummaryCard icon={PiggyBank} title="Net Flow" value={netFlow} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Events for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
          <CardDescription className="p-0 pt-2 text-sm text-muted-foreground">
            This list shows actual transactions scheduled for this month. The summary cards above reflect your average monthly cost.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      No financial events for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyEvents.map((event, index) => {
                    const Icon = event.icon;
                    return (
                      <TableRow key={index}>
                        <TableCell>{format(event.date, 'dd MMM, yyyy')}</TableCell>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                               <div className="bg-muted p-2 rounded-md">
                                 <Icon className="h-4 w-4 text-muted-foreground" />
                               </div>
                               <span>{event.description}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge
                            variant={event.type === 'income' ? 'default' : (event.type === 'expense' ? 'destructive' : 'secondary')}
                            className={cn(
                                'w-fit text-xs',
                                event.type === 'income' && 'bg-green-500/20 text-green-400 border-green-500/20',
                                event.type === 'fixed' && 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                            )}
                            >
                            {event.category}
                            </Badge>
                        </TableCell>
                        <TableCell className={cn(
                            "text-right font-semibold",
                            event.type === 'income' ? 'text-green-400' : 'text-destructive'
                        )}>
                            {event.type === 'income' ? '+' : '-'} ₹{event.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );

    