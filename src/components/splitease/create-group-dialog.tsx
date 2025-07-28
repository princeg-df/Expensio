
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';
import type { AppUser, InvitedMember } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '../ui/loader';
import { useToast } from '@/hooks/use-toast';
import { X, UserPlus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';


const groupFormSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name must be at least 3 characters.' }),
  members: z.array(z.string()),
});

const inviteFormSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Invalid email address.'),
    mobileNumber: z.string().length(10, 'Must be 10 digits.'),
});


type CreateGroupDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateGroup: (groupName: string, selectedMembers: string[], invitedMembers: InvitedMember[]) => Promise<void>;
};

export function CreateGroupDialog({ isOpen, onOpenChange, onCreateGroup }: CreateGroupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const usersQuery = query(collection(db, 'users'), where('email', '!=', user.email));
        const querySnapshot = await getDocs(usersQuery);
        const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
        setAllUsers(usersList);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, user, toast]);

  const groupForm = useForm<z.infer<typeof groupFormSchema>>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      groupName: '',
      members: [],
    },
  });

  const inviteForm = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { name: '', email: '', mobileNumber: '' }
  });

  const handleClose = () => {
    groupForm.reset();
    inviteForm.reset();
    setInvitedMembers([]);
    onOpenChange(false);
  };
  
  const handleAddInvite = (values: z.infer<typeof inviteFormSchema>) => {
    if (invitedMembers.some(m => m.email === values.email) || allUsers.some(u => u.email === values.email) || user?.email === values.email) {
        toast({ variant: 'destructive', title: 'Duplicate Email', description: 'This user is already in the list.' });
        return;
    }
    setInvitedMembers(prev => [...prev, values]);
    inviteForm.reset();
  }
  
  const handleRemoveInvite = (emailToRemove: string) => {
    setInvitedMembers(prev => prev.filter(m => m.email !== emailToRemove));
  }

  async function onSubmit(values: z.infer<typeof groupFormSchema>) {
    if (values.members.length === 0 && invitedMembers.length === 0) {
        toast({ variant: 'destructive', title: 'No Members', description: 'You must add at least one other member or invite someone.' });
        return;
    }
    await onCreateGroup(values.groupName, values.members, invitedMembers);
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Give your group a name and add members to start splitting expenses.
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
            
             <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite New Member by Email
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                   <Form {...inviteForm}>
                    <div className="mt-4 p-4 border rounded-md space-y-4">
                       <FormField
                        control={inviteForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                        />
                        <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="name@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                        />
                        <FormField
                        control={inviteForm.control}
                        name="mobileNumber"
                        render={({ field }) => (
                            <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input type="tel" placeholder="9999999999" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                        />
                        <Button type="button" onClick={inviteForm.handleSubmit(handleAddInvite)} className="w-full">Add Invitee</Button>
                    </div>
                   </Form>
                </CollapsibleContent>
            </Collapsible>


            <FormField
              control={groupForm.control}
              name="members"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel>Select Members</FormLabel>
                  </div>
                  <ScrollArea className="h-48 w-full rounded-md border">
                    <div className="p-4">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader />
                      </div>
                    ) : (allUsers.length === 0 && invitedMembers.length === 0) ? (
                       <p className="text-sm text-muted-foreground text-center pt-14">No other users found. Invite someone by email!</p>
                    ) : (
                      <>
                        {invitedMembers.map(invite => (
                           <div key={invite.email} className="flex items-center justify-between mb-4">
                             <div className="flex items-center space-x-3">
                               <Badge variant="secondary">Invited</Badge>
                               <div className="flex flex-col">
                                 <span className="font-medium text-sm">{invite.name}</span>
                                 <span className="text-xs text-muted-foreground">{invite.email}</span>
                               </div>
                             </div>
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveInvite(invite.email)}>
                               <X className="h-4 w-4"/>
                             </Button>
                           </div>
                        ))}

                        {invitedMembers.length > 0 && allUsers.length > 0 && <Separator className="my-4"/>}

                        {allUsers.map((appUser) => (
                          <FormField
                            key={appUser.id}
                            control={groupForm.control}
                            name="members"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={appUser.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 mb-4"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(appUser.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), appUser.id])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== appUser.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <div className="flex flex-col">
                                    <FormLabel className="font-normal">{appUser.name || 'Guest'}</FormLabel>
                                    <p className="text-xs text-muted-foreground">{appUser.email}</p>
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </>
                    )}
                    </div>
                  </ScrollArea>
                   <FormMessage />
                </FormItem>
              )}
            />
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
