import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "pp_session_only";
const ALIVE_KEY = "pp_alive";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If previous login was session-only and the browser was closed
    // (sessionStorage cleared), sign out before hydrating.
    const sessionOnly = localStorage.getItem(REMEMBER_KEY) === "1";
    const stillAlive = sessionStorage.getItem(ALIVE_KEY) === "1";
    const bootstrap = async () => {
      if (sessionOnly && !stillAlive) {
        await supabase.auth.signOut();
        localStorage.removeItem(REMEMBER_KEY);
      } else if (sessionOnly) {
        sessionStorage.setItem(ALIVE_KEY, "1");
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) sessionStorage.setItem(ALIVE_KEY, "1");
    });

    bootstrap();
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const markSessionOnly = (sessionOnly: boolean) => {
  if (sessionOnly) {
    localStorage.setItem(REMEMBER_KEY, "1");
    sessionStorage.setItem(ALIVE_KEY, "1");
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
};