"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Organizer, Organization, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  organizer: Organizer | null;
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  organizer: null,
  organization: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setOrganizer(null);
          setOrganization(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId: string) {
    const [orgRes, organizerRes] = await Promise.all([
      supabase.from('organizations').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('organizers').select('*').eq('id', userId).maybeSingle(),
    ]);

    if (organizerRes.data) {
      setRole('organizer');
      setOrganizer(organizerRes.data);
    } else if (orgRes.data) {
      setRole('organization');
      setOrganization(orgRes.data);
    } else {
      setRole(null);
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setOrganizer(null);
    setOrganization(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, role, organizer, organization, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
