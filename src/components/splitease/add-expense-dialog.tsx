
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/app-provider';
import type { AppUser, GroupExpense } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const expenseFormSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  paidBy: z.string().min(1, 'Please select who paid.'),
  splitWith: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one member to split with.',
  }),
});

type AddExpenseDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddOrUpdateExpense: (data: z.infer<typeof expenseFormSchema>, expenseId?: string) => Promise<void>;
  members: AppUser[];
  existingExpense: GroupExpense | null;
};

export function AddExpenseDialog({ isOpen, onOpenChange, onAddOrUpdateExpense, members, existingExpense }: AddExpenseDialogProps) {
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
  });

  useEffect(() => {
    if (isOpen && existingExpense) {
        form.reset({
            description: existingExpense.description,
            amount: existingExpense.amount,
            paidBy: existingExpense.paidBy,
            splitWith: existingExpense.splitWith.map(s => s.uid),
        });
    } else if (isOpen) {
        form.reset({
            description: '',
            amount: 0,
            paidBy: user?.uid || '',
            splitWith: members.map(m => m.id),
        });
    }
  }, [isOpen, existingExpense, form, user, members]);

  const handleClose = () => {
    onOpenChange(false);
  };

  async function onSubmit(values: z.infer<typeof expenseFormSchema>) {
    await onAddOrUpdateExpense(values, existingExpense?.id);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
          <DialogDescription>
            {existingExpense ? 'Update the details of the expense.' : 'Enter the details of the expense and how it should be split.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="expense-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto px-1">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries, Dinner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid by</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select who paid" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="splitWith"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Split with (Equally)</FormLabel>
                    <FormMessage />
                  </div>
                  <ScrollArea className="h-40 w-full rounded-md border">
                    <div className="p-4 space-y-2">
                      {members.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="splitWith"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form">{existingExpense ? 'Save Changes' : 'Add Expense'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
