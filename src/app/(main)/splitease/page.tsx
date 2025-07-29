
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { CreateGroupDialog } from '@/components/splitease/create-group-dialog';
import { GroupCard } from '@/components/splitease/group-card';
import { useAuth } from '@/providers/app-provider';
import { collection, addDoc, Timestamp, writeBatch, doc, getDocs, query, where, onSnapshot, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Group } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


export default function SplitEasePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupToLeave, setGroupToLeave] = useState<Group | null>(null);

  const handleCreateGroup = async (groupName: string, invitedEmails: string[]) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a group.' });
      return;
    }

    const batch = writeBatch(db);
    const memberIds = [user.uid];

    try {
      for (const email of invitedEmails) {
        const userQuery = query(collection(db, 'users'), where('email', '==', email));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          const newUserRef = doc(collection(db, 'users'));
           batch.set(newUserRef, {
            email: email,
            name: 'Guest',
            mobileNumber: '9999999999',
            createdAt: Timestamp.now(),
            isPlaceholder: true,
          });
          memberIds.push(newUserRef.id);
        } else {
            const existingUserId = userSnapshot.docs[0].id;
            if (!memberIds.includes(existingUserId)) {
              memberIds.push(existingUserId);
            }
        }
      }
      
      const groupRef = doc(collection(db, 'groups'));
      batch.set(groupRef, {
        name: groupName,
        members: memberIds,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
      });

      await batch.commit();

      toast({ title: 'Success', description: `Group "${groupName}" created successfully.` });
      setIsCreateGroupOpen(false);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create group. Please try again.' });
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(groupsQuery, (querySnapshot) => {
        const userGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        setGroups(userGroups);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching groups: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your groups.' });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handleLeaveGroup = async () => {
    if (!user || !groupToLeave) return;

    try {
      const groupRef = doc(db, 'groups', groupToLeave.id);
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid)
      });
      toast({ title: 'Success', description: `You have left the group "${groupToLeave.name}".` });
      setGroupToLeave(null);
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to leave the group. Please try again.' });
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
        
        {authLoading || loading ? (
            <div className="flex h-64 items-center justify-center">
            <Loader />
            </div>
        ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">No Groups Yet</h2>
                    <p className="text-muted-foreground mt-2">Get started by creating a group to split expenses.</p>
                </div>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map(group => (
                <GroupCard key={group.id} group={group} onLeave={() => setGroupToLeave(group)} />
            ))}
            </div>
        )}
      </div>
      <CreateGroupDialog
        isOpen={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onCreateGroup={handleCreateGroup}
      />
      <AlertDialog open={!!groupToLeave} onOpenChange={() => setGroupToLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to leave the group <span className="font-bold">{groupToLeave?.name}</span>. You will no longer be able to see or add expenses to this group. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup} className="bg-destructive hover:bg-destructive/90">Leave Group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
