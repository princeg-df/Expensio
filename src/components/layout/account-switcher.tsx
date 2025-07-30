
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/app-provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, LogIn } from 'lucide-react';

export function AccountSwitcher() {
  const { user, viewingUid, isSharedView, setViewingUid, permissionLevel } = useAuth();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOwnerEmail() {
      if (isSharedView && viewingUid) {
        const ownerDocRef = doc(db, 'users', viewingUid);
        const docSnap = await getDoc(ownerDocRef);
        if (docSnap.exists()) {
          setOwnerEmail(docSnap.data().email);
        }
      }
    }
    fetchOwnerEmail();
  }, [isSharedView, viewingUid]);

  const handleSwitchBack = () => {
    if (user) {
      setViewingUid(user.uid);
    }
  };

  if (!isSharedView) {
    return null;
  }

  return (
    <Alert className="mb-6 bg-primary/10 border-primary/20">
      <Eye className="h-4 w-4 text-primary" />
      <AlertTitle className="font-semibold text-primary">
        Viewing Shared Account
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-primary/80">
          You are viewing the financials for <span className="font-semibold text-primary">{ownerEmail || '...'}</span> with {permissionLevel} access.
        </p>
        <Button onClick={handleSwitchBack} variant="outline" size="sm" className="bg-transparent text-primary border-primary/50 hover:bg-primary/20 hover:text-primary">
          <LogIn className="mr-2 h-4 w-4" />
          Switch to My Account
        </Button>
      </AlertDescription>
    </Alert>
  );
}
