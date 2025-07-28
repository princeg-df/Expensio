
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/app-provider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '../ui/loader';
import { useToast } from '@/hooks/use-toast';

type AppUser = {
  id: string;
  email: string;
};

const formSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name must be at least 3 characters.' }),
  members: z.array(z.string()).min(1, { message: 'You must select at least one member.' }),
});

type CreateGroupDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateGroup: (groupName: string, selectedMembers: string[]) => Promise<void>;
};

export function CreateGroupDialog({ isOpen, onOpenChange, onCreateGroup }: CreateGroupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupName: '',
      members: [],
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onCreateGroup(values.groupName, values.members);
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
            <FormField
              control={form.control}
              name="members"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Select Members</FormLabel>
                  </div>
                  <ScrollArea className="h-48 w-full rounded-md border p-4">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader />
                      </div>
                    ) : allUsers.length > 0 ? (
                      allUsers.map((appUser) => (
                        <FormField
                          key={appUser.id}
                          control={form.control}
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
                                        ? field.onChange([...field.value, appUser.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== appUser.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{appUser.email}</FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">No other users found.</p>
                    )}
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
