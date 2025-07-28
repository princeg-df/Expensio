
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/app-provider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { X, UserPlus } from 'lucide-react';
import { Badge } from '../ui/badge';


const groupFormSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name must be at least 3 characters.' }),
});

const inviteFormSchema = z.object({
    email: z.string().email('Invalid email address.'),
});


type CreateGroupDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateGroup: (groupName: string, invitedEmails: string[]) => Promise<void>;
};

export function CreateGroupDialog({ isOpen, onOpenChange, onCreateGroup }: CreateGroupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const groupForm = useForm<z.infer<typeof groupFormSchema>>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      groupName: '',
    },
  });

  const inviteForm = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: '' }
  });

  const handleClose = () => {
    groupForm.reset();
    inviteForm.reset();
    setInvitedEmails([]);
    onOpenChange(false);
  };
  
  const handleAddInvite = (values: z.infer<typeof inviteFormSchema>) => {
    if (invitedEmails.includes(values.email)) {
        toast({ variant: 'destructive', title: 'Duplicate Email', description: 'This user has already been invited.' });
        return;
    }
     if (user?.email === values.email) {
        toast({ variant: 'destructive', title: 'Cannot Invite Self', description: 'You are already a member of this group.' });
        return;
    }
    setInvitedEmails(prev => [...prev, values.email]);
    inviteForm.reset();
  }
  
  const handleRemoveInvite = (emailToRemove: string) => {
    setInvitedEmails(prev => prev.filter(email => email !== emailToRemove));
  }

  async function onSubmit(values: z.infer<typeof groupFormSchema>) {
    if (invitedEmails.length === 0) {
        toast({ variant: 'destructive', title: 'No Members', description: 'You must invite at least one person.' });
        return;
    }
    await onCreateGroup(values.groupName, invitedEmails);
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Give your group a name and invite members by email to start splitting expenses.
          </DialogDescription>
        </DialogHeader>
        <Form {...groupForm}>
          <form onSubmit={groupForm.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={groupForm.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Goa Trip, Flatmates" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Invite Members by Email</FormLabel>
               <Form {...inviteForm}>
                <div className="flex items-start gap-2 mt-2">
                    <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormControl>
                                <Input type="email" placeholder="name@example.com" {...field} />
                            </FormControl>
                            <FormMessage className="mt-1"/>
                        </FormItem>
                    )}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={inviteForm.handleSubmit(handleAddInvite)}>
                        <UserPlus className="h-4 w-4" />
                    </Button>
                </div>
               </Form>
            </div>

             {invitedEmails.length > 0 && (
                 <ScrollArea className="h-40 w-full rounded-md border">
                    <div className="p-4 space-y-2">
                    {invitedEmails.map(email => (
                        <div key={email} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-sm font-medium text-foreground truncate">{email}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveInvite(email)}>
                            <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
             )}


            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Create Group</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
