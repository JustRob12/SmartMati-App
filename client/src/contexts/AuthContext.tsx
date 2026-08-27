import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RegisterFormData, UserProfile, VerificationStatus } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: RegisterFormData) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  resendOtp: (email: string) => Promise<{ error?: string }>;
  requestVerification: () => Promise<{ error?: string }>;
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  demoLogin: (
    email?: string,
    name?: string,
    barangay?: string,
    phone?: string,
    status?: VerificationStatus
  ) => void;
  setDemoVerificationStatus: (status: VerificationStatus) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active session on startup
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email || '');
        }
      } catch (err) {
        console.warn('Session retrieval error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching profile from Supabase:', error);
      }

      if (data) {
        const rawStatus = (data.verification_status || 'unverified').toString().trim().toLowerCase();
        let parsedStatus: VerificationStatus = 'unverified';
        if (rawStatus === 'approved' || rawStatus === 'verified') {
          parsedStatus = 'approved';
        } else if (rawStatus === 'pending' || rawStatus === 'under_review') {
          parsedStatus = 'pending';
        } else if (rawStatus === 'rejected') {
          parsedStatus = 'rejected';
        }

        const profileObj: UserProfile = {
          id: data.id,
          fullName: data.full_name || 'Resident',
          gender: data.gender,
          birthdate: data.birthdate,
          phone: data.phone,
          email: data.email || email,
          city: data.city || 'Mati City',
          barangay: data.barangay || 'Central (Poblacion)',
          purok: data.purok,
          role: data.role || 'resident',
          verificationStatus: parsedStatus,
          verificationRequestedAt: data.verification_requested_at,
          createdAt: data.created_at,
        };
        setUser(profileObj);
        return profileObj;
      } else {
        // Fallback user if profile row hasn't synced yet
        const fallbackObj: UserProfile = {
          id: userId,
          fullName: 'Mati Resident',
          email,
          city: 'Mati City',
          barangay: 'Central (Poblacion)',
          role: 'resident',
          verificationStatus: 'unverified',
        };
        setUser(fallbackObj);
        return fallbackObj;
      }
    } catch (e) {
      console.warn('Error in fetchUserProfile:', e);
    }
    return null;
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    let targetUserId = user?.id;
    let targetEmail = user?.email || '';

    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          targetUserId = session.user.id;
          targetEmail = session.user.email || targetEmail;
        }
      } catch (err) {
        console.warn('Error getting session during refresh:', err);
      }
    }

    if (targetUserId) {
      return await fetchUserProfile(targetUserId, targetEmail);
    }
    return user;
  };

  const requestVerification = async (): Promise<{ error?: string }> => {
    if (!user) return { error: 'No active user found.' };

    const now = new Date().toISOString();

    if (!isSupabaseConfigured) {
      // Offline / Demo state update
      setUser((prev) => (prev ? { ...prev, verificationStatus: 'pending', verificationRequestedAt: now } : null));
      return {};
    }

    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          verification_requested_at: now,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Also try inserting into user_verifications log table
      try {
        await supabase.from('user_verifications').insert({
          user_id: user.id,
          full_name: user.fullName,
          barangay: user.barangay,
          phone: user.phone,
          email: user.email,
          status: 'pending',
          requested_at: now,
        });
      } catch (e) {
        // Safe skip if table optional
      }

      // Update local state and refetch
      await fetchUserProfile(user.id, user.email);
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Could not submit verification request.' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      // Demo / Mock sign in for testing
      setUser({
        id: 'demo-user-123',
        fullName: 'Juan Dela Cruz',
        gender: 'Male',
        birthdate: '1995-06-15',
        phone: '09171234567',
        email: email || 'juan.delacruz@example.com',
        city: 'Mati City',
        barangay: 'Dahican',
        purok: 'Purok Mangga',
        role: 'resident',
        verificationStatus: 'unverified',
      });
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return { error: error.message };

      if (data.user) {
        await fetchUserProfile(data.user.id, data.user.email || email);
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'An unexpected error occurred during sign in.' };
    }
  };

  const signUp = async (
    data: RegisterFormData
  ): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
    if (!isSupabaseConfigured) {
      // Demo / Mock sign up
      setUser({
        id: 'demo-user-' + Date.now(),
        fullName: data.fullName,
        gender: data.gender,
        birthdate: data.birthdate,
        phone: data.phone,
        email: data.email,
        city: 'Mati City',
        barangay: data.barangay || 'Central (Poblacion)',
        purok: data.purok,
        role: 'resident',
        verificationStatus: 'unverified',
      });
      return {};
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName.trim(),
            gender: data.gender,
            birthdate: data.birthdate,
            phone: data.phone.trim(),
            city: 'Mati City',
            barangay: data.barangay,
            purok: data.purok.trim(),
            verification_status: 'unverified',
          },
        },
      });

      if (error) return { error: error.message };

      if (authData.user) {
        // Try direct upsert as safe backup in case DB trigger is pending
        try {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: data.fullName.trim(),
            gender: data.gender,
            birthdate: data.birthdate || null,
            phone: data.phone.trim(),
            email: data.email.trim(),
            city: 'Mati City',
            barangay: data.barangay,
            purok: data.purok.trim(),
            role: 'resident',
            verification_status: 'unverified',
          });
        } catch (e) {
          // Trigger will handle it if present
        }

        if (authData.session) {
          await fetchUserProfile(authData.user.id, authData.user.email || data.email);
          return {};
        } else {
          return { requiresEmailConfirmation: true };
        }
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'An unexpected error occurred during registration.' };
    }
  };

  const verifyOtp = async (email: string, token: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      setUser({
        id: 'demo-verified-' + Date.now(),
        fullName: 'Juan Dela Cruz',
        gender: 'Male',
        birthdate: '1995-06-15',
        phone: '09171234567',
        email: email || 'juan.delacruz@example.com',
        city: 'Mati City',
        barangay: 'Dahican',
        purok: 'Purok 1',
        role: 'resident',
        verificationStatus: 'unverified',
      });
      return {};
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup',
      });

      if (error) {
        const secondTry = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email',
        });

        if (secondTry.error) {
          return { error: error.message || secondTry.error.message };
        }

        if (secondTry.data.user) {
          await fetchUserProfile(secondTry.data.user.id, secondTry.data.user.email || email);
        }
        return {};
      }

      if (data.user) {
        await fetchUserProfile(data.user.id, data.user.email || email);
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Invalid or expired confirmation code.' };
    }
  };

  const resendOtp = async (email: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return {};
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to resend confirmation email.' };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const demoLogin = (
    email = 'juan.delacruz@mati.gov.ph',
    name = 'Juan Dela Cruz',
    barangay = 'Dahican',
    phone = '09171234567',
    status: VerificationStatus = 'unverified'
  ) => {
    setUser({
      id: 'demo-' + Date.now(),
      fullName: name,
      gender: 'Male',
      birthdate: '1996-08-20',
      phone,
      email,
      city: 'Mati City',
      barangay: barangay || 'Dahican',
      purok: 'Purok 4',
      role: 'resident',
      verificationStatus: status,
    });
  };

  const setDemoVerificationStatus = (status: VerificationStatus) => {
    setUser((prev) => (prev ? { ...prev, verificationStatus: status } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        verifyOtp,
        resendOtp,
        requestVerification,
        refreshProfile,
        signOut,
        demoLogin,
        setDemoVerificationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
