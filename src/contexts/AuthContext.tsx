import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Allowed email domain for Google sign-in
// Set to null to allow any domain during development
const ALLOWED_DOMAIN: string | null = 'caferio.com';

// For development/testing, set this to true to bypass domain check
const DEV_BYPASS_DOMAIN_CHECK = import.meta.env.DEV;

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function logout() {
    await signOut(auth);
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    // Only set hd parameter if domain restriction is active and not in dev bypass mode
    // Note: hd only works with valid Google Workspace domains
    if (ALLOWED_DOMAIN && !DEV_BYPASS_DOMAIN_CHECK) {
      provider.setCustomParameters({
        hd: ALLOWED_DOMAIN,
      });
    }
    
    const result = await signInWithPopup(auth, provider);
    
    // Validate domain after sign-in (unless bypassed in dev)
    if (ALLOWED_DOMAIN && !DEV_BYPASS_DOMAIN_CHECK) {
      const email = result.user.email;
      if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await signOut(auth);
        throw new Error(`Access restricted to @${ALLOWED_DOMAIN} accounts only`);
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    logout,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
