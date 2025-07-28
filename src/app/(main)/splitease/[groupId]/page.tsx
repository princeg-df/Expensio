
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Group } from '@/lib/types';
import { useAuth } from '@/providers/app-provider';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GroupDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroup() {
      if (!user || !groupId) return;
      setLoading(true);
      try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupDocSnap = await getDoc(groupDocRef);

        if (groupDocSnap.exists()) {
          const groupData = groupDocSnap.data() as Group;
          if (groupData.members.includes(user.uid)) {
            setGroup({ id: groupDocSnap.id, ...groupData });
          } else {
             router.push('/splitease');
          }
        } else {
           router.push('/splitease');
        }
      } catch (error) {
        console.error('Error fetching group:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchGroup();
    }
  }, [user, authLoading, groupId, router]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }
  
  if (!group) {
    return (
       <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle>Group Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The group you are looking for does not exist or you do not have permission to view it.</p>
          <Button asChild className="mt-4">
            <Link href="/splitease">Back to SplitEase</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/splitease">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">Manage your group expenses and members.</p>
        </div>
      </div>
    </div>
  );
}
