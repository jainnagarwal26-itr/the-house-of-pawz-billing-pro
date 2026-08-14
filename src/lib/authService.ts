// ============================================================
// authService.ts — Supabase Authentication & Profile Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { User, UserRole } from '../types';


export async function loginWithSupabase(emailInput: string, passwordInput: string): Promise<{ user: User | null; error?: string }> {
  try {
    const cleanInput = emailInput.trim().toLowerCase();
    let authEmail = cleanInput;

    // Map common username inputs to full email addresses
    if (cleanInput === 'chirag' || cleanInput === 'chirag jain' || cleanInput === 'accountant') {
      authEmail = 'chirag@thehouseofpawz.com';
    } else if (cleanInput === 'shruti' || cleanInput === 'shruti roy' || cleanInput === 'admin') {
      authEmail = 'shruti@thehouseofpawz.com';
    } else if (cleanInput === 'staff' || cleanInput === 'hop staff') {
      authEmail = 'staff@thehouseofpawz.com';
    }

    // ONLY use Supabase GoTrue authentication — no plaintext password fallback
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: passwordInput
    });

    if (authError || !authData.user) {
      return { user: null, error: authError?.message || 'Invalid Login ID or Password. Please try again.' };
    }

    const profileResult = await fetchUserProfileByAuthId(authData.user.id);
    if (profileResult.user) {
      return { user: profileResult.user };
    }

    return { user: null, error: 'Account profile not found. Please contact Admin.' };
  } catch (err: any) {
    return { user: null, error: err.message || 'Authentication error' };
  }
}


export async function logoutSupabase(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error signing out:', err);
  }
}

export async function fetchUserProfileByAuthId(authId: string): Promise<{ user: User | null; error?: string }> {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authId)
      .single();

    if (userError || !userData) {
      return { user: null, error: userError?.message || 'Profile not found' };
    }

    const u = userData as any;
    const { data: permData } = await supabase
      .from('user_permissions')
      .select('permission_key, is_granted')
      .eq('user_id', u.user_id);

    const userPermissions: Record<string, boolean> = {};
    if (permData) {
      (permData as any[]).forEach(p => {
        userPermissions[p.permission_key] = p.is_granted;
      });
    }

    const appUser: User = {
      id: u.user_id,
      name: u.full_name,
      username: u.username,
      role: u.role as UserRole,
      email: u.email || '',
      phone: u.phone || '',
      designation: u.role === 'ACCOUNTANT' ? 'Accountant / Full Control' : u.role === 'ADMIN' ? 'Admin' : u.role === 'BILLING_STAFF' ? 'Billing Staff' : u.role,
      avatar: u.role === 'ACCOUNTANT' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' : u.role === 'ADMIN' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces' : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
      lastLogin: new Date().toISOString(),
      isActive: u.is_active,
      permissions: userPermissions
    };

    return { user: appUser };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
}

export async function fetchActiveSessionUser(): Promise<User | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return null;
    }
    const profile = await fetchUserProfileByAuthId(sessionData.session.user.id);
    return profile.user;
  } catch (err) {
    console.error('Error fetching active session:', err);
    return null;
  }
}
