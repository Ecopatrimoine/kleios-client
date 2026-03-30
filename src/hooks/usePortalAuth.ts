// src/hooks/usePortalAuth.ts
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface PortalUser {
  user:      User;
  contactId: string;
  cgpUserId: string;
  role:      "client";
}

export type AuthState = "loading" | "authenticated" | "unauthenticated";

export function usePortalAuth() {
  const [authState, setAuthState]   = useState<AuthState>("loading");
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        if (meta?.role === "client") {
          setPortalUser({
            user:      session.user,
            contactId: meta.contact_id,
            cgpUserId: meta.cgp_user_id,
            role:      "client",
          });
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
        }
      } else {
        setAuthState("unauthenticated");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && session.user.user_metadata?.role === "client") {
        setPortalUser({
          user:      session.user,
          contactId: session.user.user_metadata.contact_id,
          cgpUserId: session.user.user_metadata.cgp_user_id,
          role:      "client",
        });
        setAuthState("authenticated");
      } else {
        setPortalUser(null);
        setAuthState("unauthenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = () => supabase.auth.signOut();

  return { authState, portalUser, signIn, signOut };
}
