'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '@/utils/firebase';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  name: string;
  email: string;
  college: string;
  isProfileComplete: boolean;
  registeredEvents?: string[];
  role?: 'superAdmin' | 'admin' | 'abheriAdmin' | 'basicScienceAdmin' | 'user';
  department?: string; // For department admins
}

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache user profile in memory with 5-minute TTL to prevent repeated Firestore reads on navigation
const profileCache = new Map<string, { data: UserProfile; timestamp: number }>();
let inFlightProfilePromise: Promise<UserProfile | null> | null = null;
let inFlightUid: string | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = async (uid: string, email: string, forceRefresh = false): Promise<UserProfile | null> => {
    const now = Date.now();
    const cached = profileCache.get(uid);

    // Reuse cached profile if available and not expired
    if (!forceRefresh && cached && now - cached.timestamp < 5 * 60 * 1000) {
      setUserData(cached.data);
      return cached.data;
    }

    // Reuse in-flight request if one is already running for the same UID
    if (!forceRefresh && inFlightUid === uid && inFlightProfilePromise) {
      const result = await inFlightProfilePromise;
      if (result) setUserData(result);
      return result;
    }

    inFlightUid = uid;
    inFlightProfilePromise = (async () => {
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          
          // List of superAdmin emails (configurable via env)
          const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || 'joeljoy1237@gmail.com')
            .split(',')
            .map(e => e.trim().toLowerCase());
          const isSuperAdmin = superAdminEmails.includes(email.toLowerCase());

          // Auto-promote configured users to superAdmin
          if (isSuperAdmin && data.role !== 'superAdmin') {
              await setDoc(userDocRef, { ...data, role: 'superAdmin' }, { merge: true });
              data.role = 'superAdmin';
          }

          // Ensure role exists, default to user if not
          if (!data.role) {
               data.role = 'user'; 
          }
          profileCache.set(uid, { data, timestamp: Date.now() });
          setUserData(data);
          return data;
        } else {
          // Create initial user doc if it doesn't exist
          const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || 'joeljoy1237@gmail.com')
            .split(',')
            .map(e => e.trim().toLowerCase());
          const isSuperAdmin = superAdminEmails.includes(email.toLowerCase());

          // Check if there was an offline / manual user record created by admin for this email
          let existingOfflineData: Partial<UserProfile> = {};
          let offlineDocIdToDelete: string | null = null;

          try {
            const offlineQuery = query(
              collection(db, 'users'),
              where('email', '==', email.toLowerCase())
            );
            const offlineSnapshot = await getDocs(offlineQuery);
            if (!offlineSnapshot.empty) {
              const firstMatch = offlineSnapshot.docs[0];
              if (firstMatch.id !== uid) {
                existingOfflineData = firstMatch.data() as Partial<UserProfile>;
                offlineDocIdToDelete = firstMatch.id;
              }
            }
          } catch (err) {
            console.warn('Error checking offline user records:', err);
          }

          const initialData: UserProfile = {
            name: existingOfflineData.name || '',
            email: email,
            college: existingOfflineData.college || '',
            isProfileComplete: Boolean(existingOfflineData.name && existingOfflineData.college),
            registeredEvents: existingOfflineData.registeredEvents || [],
            role: isSuperAdmin ? 'superAdmin' : (existingOfflineData.role || 'user'),
            department: existingOfflineData.department || '',
          };
          await setDoc(userDocRef, initialData);
          profileCache.set(uid, { data: initialData, timestamp: Date.now() });
          setUserData(initialData);

          // If an offline placeholder record existed, sync existing registrations to new UID
          if (offlineDocIdToDelete) {
            try {
              await deleteDoc(doc(db, 'users', offlineDocIdToDelete));
              const regsQuery = query(
                collection(db, 'registrations'),
                where('userId', '==', offlineDocIdToDelete)
              );
              const regsSnapshot = await getDocs(regsQuery);
              if (!regsSnapshot.empty) {
                const batch = writeBatch(db);
                regsSnapshot.docs.forEach((rDoc) => {
                  batch.update(rDoc.ref, { userId: uid });
                });
                await batch.commit();
              }
            } catch (syncErr) {
              console.warn('Error linking offline registrations to new user uid:', syncErr);
            }
          }
          return initialData;
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
      } finally {
        inFlightUid = null;
        inFlightProfilePromise = null;
      }
    })();

    return inFlightProfilePromise;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.email) {
            await fetchUserProfile(currentUser.uid, currentUser.email, false);
        }
      } else {
        profileCache.clear();
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      profileCache.clear();
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const refetchUserProfile = async () => {
    if (user && user.email) {
      await fetchUserProfile(user.uid, user.email, true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout, refetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
