import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser } from "../services/authService";

import {
  getSession,
  signInWithCognito as svcCognito,
  signInWithPassword as svcPassword,
  signOut as svcSignOut,
} from "../services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signInWithCognito: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Restore the Cognito session when the application starts.
   *
   * This is especially important after returning from
   * the Cognito Hosted UI.
   */
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const u = await getSession();

        if (mounted) {
          setUser(u);
        }
      } catch (error) {
        console.error("Failed to restore authentication session:", error);

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);


  
  const handleCognitoSignIn = async (): Promise<void> => {
    await svcCognito();
  };

 
  const handlePasswordSignIn = async (
    email: string,
    password: string,
  ): Promise<void> => {
    const u = await svcPassword(email, password);
    setUser(u);
  };


  const handleSignOut = async (): Promise<void> => {
    await svcSignOut();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    signInWithCognito: handleCognitoSignIn,
    signInWithPassword: handlePasswordSignIn,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}