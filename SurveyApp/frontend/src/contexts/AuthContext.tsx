import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    session: SupabaseSession | null;
    loading: boolean;
    authError: string | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<SupabaseSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const refreshUser = async () => {
        try {
            setAuthError(null);
            const { data } = await api.get('/users/me');
            setUser(data);
        } catch (error: any) {
            console.error('Error fetching user profile:', error);
            const errorMessage = error.response?.data?.error;
            if (error.response?.status === 403) {
                // Account disabled or deleted
                setAuthError(errorMessage || 'Your account access has been restricted. Please contact an administrator.');
                setUser(null);
                // Sign out from Supabase to clear the session
                await supabase.auth.signOut();
            } else if (error.response?.status === 401) {
                setAuthError(errorMessage || 'Authentication failed. Please sign in again.');
                setUser(null);
            }
        }
    };

    useEffect(() => {
        // Debug: Log URL params on load (OAuth callback includes tokens in URL)
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (params.get('error') || hashParams.get('error')) {
            console.error('OAuth Error:', params.get('error') || hashParams.get('error'));
            console.error('Error Description:', params.get('error_description') || hashParams.get('error_description'));
        }
        if (hashParams.get('access_token')) {
            console.log('OAuth callback received with access token');
        }

        // Check active session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            console.log('getSession result:', { session: !!session, error });
            setSession(session);
            if (session) {
                refreshUser().finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                refreshUser();
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/login`
            }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, authError, signInWithGoogle, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
