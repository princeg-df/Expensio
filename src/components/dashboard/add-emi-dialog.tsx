'use client';

import { useEffect } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { Emi } from '@/lib/types';


const formSchema = z.object({
  name: z.string().min(1, 'Please enter a name for the EMI.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  loanAmount: z.coerce.number().min(0, 'Loan amount cannot be negative.'),
  startDate: z.date({
    required_error: "An EMI start date is required.",
  }),
  monthsRemaining: z.coerce.number().min(1, 'Months remaining must be at least 1.'),
  nextPaymentDate: z.date({
    required_error: "A payment day is required.",
  }),
});

type AddEmiDialogProps = {
    onAddOrUpdateEmi: (data: z.infer<typeof formSchema>, id?: string) => Promise<void>;
    existingEmi?: Emi | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
};

export function AddEmiDialog({ onAddOrUpdateEmi, existingEmi, open, onOpenChange, trigger }: AddEmiDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      amount: 0,
      loanAmount: 0,
      startDate: new Date(),
      monthsRemaining: 1,
      nextPaymentDate: new Date(),
    },
  });

  useEffect(() => {
    if (open && existingEmi) {
      form.reset({
        ...existingEmi,
        startDate: existingEmi.startDate.toDate(),
        nextPaymentDate: existingEmi.nextPaymentDate.toDate(),
      });
    } else if (!open) {
        form.reset({
            name: '',
            amount: 0,
            loanAmount: 0,
            startDate: new Date(),
            monthsRemaining: 1,
            nextPaymentDate: new Date(),
        });
    }
  }, [existingEmi, open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onAddOrUpdateEmi(values, existingEmi?.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingEmi ? 'Edit' : 'Add'} Running EMI</DialogTitle>
          <DialogDescription>
            {existingEmi ? 'Update the details of your ongoing EMI.' : 'Enter the details of your ongoing EMI.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EMI Name</FormLabel>
                   <FormControl>
                    <Input placeholder="e.g., Car Loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="loanAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Loan Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 500000" {...field} />
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
                  <FormLabel>Monthly EMI Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="monthsRemaining"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Months Remaining</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>EMI Start Date</FormLabel>
                  <Popover>
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextPaymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Payment Day</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? `Day ${format(field.value, 'd')}` : <span>Pick a day</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                       <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{existingEmi ? 'Save Changes' : 'Add EMI'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
