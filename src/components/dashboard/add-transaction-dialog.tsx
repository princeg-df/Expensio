
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { Transaction } from '@/lib/types';


const formSchema = z.object({
  type: z.enum(['expense', 'income']),
  category: z.string().min(1, 'Please select a category.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  date: z.date(),
});

const expenseCategories = ['Food', 'Travel', 'Shopping', 'Utilities', 'Entertainment', 'Other'];
const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Other'];

type AddTransactionDialogProps = {
    onAddOrUpdateTransaction: (data: z.infer<typeof formSchema>, id?: string) => Promise<void>;
    existingTransaction?: Transaction | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
};

export function AddTransactionDialog({ onAddOrUpdateTransaction, existingTransaction, open, onOpenChange, trigger }: AddTransactionDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      category: '',
      amount: 0,
      date: new Date(),
    },
  });
  
  const transactionType = form.watch('type');
  
  useEffect(() => {
    if (open && existingTransaction) {
      form.reset({
        ...existingTransaction,
        date: existingTransaction.date.toDate(),
      });
    } else if (!open) {
        form.reset({
            type: 'expense',
            category: '',
            amount: 0,
            date: new Date(),
        });
    }
  }, [existingTransaction, open, form]);
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onAddOrUpdateTransaction(values, existingTransaction?.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingTransaction ? 'Edit' : 'Add New'} Transaction</DialogTitle>
          <DialogDescription>
            {existingTransaction ? 'Update the details of your transaction.' : 'Enter the details of your income or expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="overflow-y-auto px-1">
            <form id="transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(transactionType === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </div>
        </Form>
        <DialogFooter>
          <Button type="submit" form="transaction-form">{existingTransaction ? 'Save Changes' : 'Add Transaction'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
