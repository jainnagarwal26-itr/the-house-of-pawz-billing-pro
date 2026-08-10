// ============================================================
// userService.ts — User Management & Permissions Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { User, UserRole } from '../types';

export async function fetchUsersFromSupabase(): Promise<User[]> {
  try {
    const { data: usersData, error } = await supabase
      .from('users')
      .select('*')
      .order('user_id', { ascending: true });

    if (error || !usersData) {
      console.error('Error fetching users from Supabase:', error);
      return [];
    }

    const { data: permData } = await supabase
      .from('user_permissions')
      .select('*');

    const permMap = new Map<string, Record<string, boolean>>();
    if (permData) {
      (permData as any[]).forEach(p => {
        const userMap = permMap.get(p.user_id) || {};
        userMap[p.permission_key] = p.is_granted;
        permMap.set(p.user_id, userMap);
      });
    }

    return (usersData as any[]).map(u => ({
      id: u.user_id,
      name: u.full_name,
      username: u.username,
      role: u.role as UserRole,
      email: u.email || '',
      phone: u.phone || '',
      designation: u.role === 'ADMIN' ? 'Admin / CA' : u.role === 'BILLING_STAFF' ? 'Billing / CA Staff' : 'Billing Operator',
      avatar: u.role === 'ADMIN' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
      lastLogin: new Date().toISOString(),
      isActive: u.is_active,
      permissions: permMap.get(u.user_id) || {}
    }));
  } catch (err) {
    console.error('Error in fetchUsersFromSupabase:', err);
    return [];
  }
}

export async function updateUserPermissionInSupabase(
  userId: string,
  permissionKey: string,
  overrideValue: boolean | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (overrideValue === null) {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('permission_key', permissionKey);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_key: permissionKey,
          is_granted: overrideValue
        } as any, { onConflict: 'user_id,permission_key' });

      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserRoleInSupabase(userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole } as any)
      .eq('user_id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
