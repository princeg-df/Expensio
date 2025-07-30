
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ReactNode } from 'react';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  viewingUid: string | null;
  setViewingUid: (uid: string | null) => void;
  isSharedView: boolean;
  permissionLevel: 'viewer' | 'editor' | 'admin' | null;
  setPermissionLevel: (level: 'viewer' | 'editor' | 'admin' | null) => void;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  viewingUid: null,
  setViewingUid: () => {},
  isSharedView: false,
  permissionLevel: null,
  setPermissionLevel: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingUid, setViewingUidState] = useState<string | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<'viewer' | 'editor' | 'admin' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setViewingUidState(user ? user.uid : null);
      setPermissionLevel(null); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setViewingUid = useCallback((uid: string | null) => {
    if (uid === user?.uid) {
      setViewingUidState(user.uid);
      setPermissionLevel(null);
    } else {
      setViewingUidState(uid);
    }
  }, [user]);

  const isSharedView = user ? viewingUid !== user.uid : false;

  return (
    <AuthContext.Provider value={{ user, loading, viewingUid, setViewingUid, isSharedView, permissionLevel, setPermissionLevel }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
