
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/app-provider';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Share, Role } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/ui/loader';
import { UserPlus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AccountSwitcher } from '@/components/layout/account-switcher';


const inviteFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  role: z.enum(['viewer', 'editor', 'admin']),
});

export default function SharingPage() {
  const { user, loading: authLoading, isSharedView, setViewingUid } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [outgoingShares, setOutgoingShares] = useState<Share[]>([]);
  const [incomingShares, setIncomingShares] = useState<Share[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  });

  const fetchShares = useCallback(() => {
    if (!user?.email) return;
    setLoading(true);

    const outgoingQuery = query(collection(db, 'shares'), where('ownerUid', '==', user.uid));
    const incomingQuery = query(collection(db, 'shares'), where('sharedWithEmail', '==', user.email));
    
    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const sharesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Share));
      setOutgoingShares(sharesData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching outgoing shares:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load your shared accounts.' });
        setLoading(false);
    });

    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const sharesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Share));
      setIncomingShares(sharesData);
    }, (error) => {
        console.error("Error fetching incoming shares:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load incoming invitations.' });
    });

    return () => {
      unsubscribeOutgoing();
      unsubscribeIncoming();
    };
  }, [user, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setLoading(false);
        return;
    };
    return fetchShares();
  }, [user, authLoading, fetchShares]);

  const handleInvite = async (values: z.infer<typeof inviteFormSchema>) => {
    if (!user || !user.email) return;

    if (values.email === user.email) {
      toast({ variant: 'destructive', title: 'Error', description: "You cannot share your account with yourself." });
      return;
    }
    
    if (outgoingShares.some(share => share.sharedWithEmail === values.email)) {
        toast({ variant: 'destructive', title: 'Error', description: "You have already shared your account with this user." });
        return;
    }

    setIsSubmitting(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", values.email));
      const querySnapshot = await getDocs(q);
      
      const shareData: Omit<Share, 'id'> = {
        ownerUid: user.uid,
        ownerEmail: user.email,
        sharedWithEmail: values.email,
        role: values.role as Role,
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      if (!querySnapshot.empty) {
        shareData.sharedWithUid = querySnapshot.docs[0].id;
      }
      
      const shareId = `${user.uid}_${values.email}`;
      const shareDocRef = doc(db, 'shares', shareId);
      await setDoc(shareDocRef, shareData);

      toast({ title: 'Success', description: 'Invitation sent successfully.' });
      form.reset();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send invitation.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await deleteDoc(doc(db, 'shares', shareId));
      toast({ title: 'Success', description: 'Access has been revoked.' });
    } catch (error) {
      console.error('Error revoking access:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to revoke access.' });
    }
  };
  
  const handleLeaveShare = async (share: Share) => {
     if (!user) return;
    try {
      await deleteDoc(doc(db, 'shares', share.id));
       // If currently viewing the deleted share, switch back to own account
      if (isSharedView && share.ownerUid === user.uid) {
        setViewingUid(user.uid);
      }
      toast({ title: 'Success', description: 'You have left the shared account.' });
    } catch (error) {
      console.error('Error leaving share:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to leave the shared account.' });
    }
  }

  const handleInvitation = async (share: Share, accept: boolean) => {
    if(!user) return;
    try {
        if (accept) {
            await updateDoc(doc(db, 'shares', share.id), {
                status: 'accepted',
                sharedWithUid: user.uid,
            });
            toast({ title: 'Success', description: 'Invitation accepted.' });
        } else {
            await deleteDoc(doc(db, 'shares', share.id));
            toast({ title: 'Success', description: 'Invitation declined.' });
        }
    } catch (error) {
         console.error('Error responding to invitation:', error);
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to respond to invitation.' });
    }
  }

  const pendingInvitations = incomingShares.filter(s => s.status === 'pending');
  const acceptedShares = incomingShares.filter(s => s.status === 'accepted');


  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        {isSharedView ? <AccountSwitcher /> : (
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Sharing</h1>
                <p className="text-muted-foreground">Share your financial data with family or an advisor.</p>
            </div>
        )}

        {isSharedView ? (
             <Card>
                <CardHeader>
                    <CardTitle>Feature Disabled</CardTitle>
                    <CardDescription>Sharing management is not available when viewing a shared account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Please switch back to your own account to manage sharing settings.</p>
                </CardContent>
             </Card>
        ) : (
            <>
                <Card>
                    <CardHeader>
                    <CardTitle>Invite Someone</CardTitle>
                    <CardDescription>Enter the email address of the person you want to share your account with.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleInvite)} className="flex flex-col sm:flex-row items-end gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem className="flex-1 w-full">
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="name@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                            <FormItem className="w-full sm:w-auto">
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-full sm:w-[120px]">
                                    <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Send Invite
                        </Button>
                        </form>
                    </Form>
                    </CardContent>
                </Card>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Shared By You</CardTitle>
                            <CardDescription>Accounts you have shared with others.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outgoingShares.length > 0 ? outgoingShares.map(share => (
                                        <TableRow key={share.id}>
                                            <TableCell className="font-medium break-all">{share.sharedWithEmail}</TableCell>
                                            <TableCell><Badge variant="secondary">{share.role}</Badge></TableCell>
                                            <TableCell><Badge variant={share.status === 'pending' ? 'outline' : 'default'} className={share.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/20' : ''}>{share.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRevoke(share.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">You haven't shared your account with anyone.</TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Accounts Shared With Me</CardTitle>
                            <CardDescription>Accounts you have access to.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {acceptedShares.length > 0 ? acceptedShares.map(share => (
                                        <TableRow key={share.id}>
                                            <TableCell className="font-medium break-all">{share.ownerEmail}</TableCell>
                                            <TableCell><Badge variant="secondary">{share.role}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleLeaveShare(share)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No accounts are shared with you.</TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Invitations</CardTitle>
                            <CardDescription>Invitations to access other accounts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>From</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingInvitations.length > 0 ? pendingInvitations.map(share => (
                                        <TableRow key={share.id}>
                                            <TableCell className="font-medium break-all">{share.ownerEmail}</TableCell>
                                            <TableCell><Badge variant="secondary">{share.role}</Badge></TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleInvitation(share, true)}>
                                                    <CheckCircle className="h-4 w-4 text-green-500"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleInvitation(share, false)}>
                                                    <XCircle className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No pending invitations.</TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </>
        )}
    </div>
  );
}


