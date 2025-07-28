
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { CreateGroupDialog } from '@/components/splitease/create-group-dialog';
import { useAuth } from '@/providers/app-provider';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SplitEasePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const handleCreateGroup = async (groupName: string, selectedMembers: string[]) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a group.' });
      return;
    }

    try {
      await addDoc(collection(db, 'groups'), {
        name: groupName,
        members: [user.uid, ...selectedMembers],
        createdAt: Timestamp.now(),
        createdBy: user.uid,
      });
      toast({ title: 'Success', description: `Group "${groupName}" created successfully.` });
      setIsCreateGroupOpen(false);
      // Here you might want to refetch groups in the future
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create group. Please try again.' });
    }
  };


  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SplitEase</h1>
            <p className="text-muted-foreground">
              Create groups, add expenses, and split bills with friends.
            </p>
          </div>
          <Button onClick={() => setIsCreateGroupOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Groups</CardTitle>
            <CardDescription>
              Here are all the groups you are a part of.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
              <p className="text-muted-foreground">You are not in any groups yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <CreateGroupDialog
        isOpen={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onCreateGroup={handleCreateGroup}
      />
    </>
  );
}
