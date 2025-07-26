
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

type BudgetSetterProps = {
  currentBudget: number;
  onSetBudget: (newBudget: number) => Promise<void>;
};

export function BudgetSetter({ currentBudget, onSetBudget }: BudgetSetterProps) {
  const [open, setOpen] = useState(false);
  const [newBudget, setNewBudget] = useState(currentBudget);
  const { toast } = useToast();

  const handleSave = async () => {
    await onSetBudget(newBudget);
    toast({
      title: 'Budget Updated',
      description: `Your monthly budget has been set to ₹${newBudget}.`,
    });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Your Monthly Budget</DialogTitle>
          <DialogDescription>
            Enter your total budget for the month. This will help you track your spending.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="budget" className="text-right">
              Budget (₹)
            </Label>
            <Input
              id="budget"
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(Number(e.target.value))}
              className="col-span-3"
              placeholder="e.g., 50000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
