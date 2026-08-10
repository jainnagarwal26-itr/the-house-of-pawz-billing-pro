// ============================================================
// auditService.ts — Audit Log Supabase Service
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';
import { AuditLog, UserRole } from '../types';

export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching audit logs from Supabase:', error);
      return [];
    }

    return (data as any[]).map(l => ({
      id: l.log_id,
      timestamp: l.timestamp,
      userId: l.user_id,
      userName: l.username,
      userRole: l.role as UserRole,
      action: l.action as any,
      details: l.details || '',
      ipAddress: l.ip_address || undefined
    }));
  } catch (err) {
    console.error('Error in fetchAuditLogsFromSupabase:', err);
    return [];
  }
}

/**
 * Logs an audit event to public.audit_logs.
 *
 * Strategy:
 *  1. Try the SECURITY DEFINER RPC log_audit_event() which uses auth.uid() server-side.
 *     This is the preferred path when the user has an active Supabase Auth session.
 *  2. If the RPC fails (e.g. auth.uid() IS NULL because user is authenticated via
 *     localStorage session only), fall back to a direct INSERT using the current
 *     session's user metadata from the Supabase auth session object.
 *  3. If both fail, log to console only — never block billing operations.
 */
export async function logAuditEventToSupabase(action: string, details: string): Promise<void> {
  try {
    // Generate a unique log ID using timestamp + random suffix
    const logId = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Strategy 1: Try the SECURITY DEFINER RPC (preferred — uses auth.uid() server-side)
    const { error: rpcError } = await supabase.rpc('log_audit_event' as any, {
      p_log_id: logId,
      p_action: action,
      p_details: details
    });

    if (!rpcError) {
      // RPC succeeded — audit event written via server-side auth.uid()
      return;
    }

    // Strategy 2: RPC failed — try direct INSERT with session metadata
    // This handles cases where the user has a valid Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData?.session?.user;

    if (authUser) {
      // Fetch the public.users profile for correct role/username
      const { data: userProfile } = await supabase
        .from('users')
        .select('user_id, username, role')
        .eq('id', authUser.id)
        .single();

      const now = new Date();
      const timestampStr = now.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });

      await supabase.from('audit_logs').insert({
        log_id: logId,
        timestamp: timestampStr,
        user_id: userProfile?.user_id || authUser.id,
        username: userProfile?.username || authUser.email || 'authenticated',
        role: userProfile?.role || 'USER',
        action: action,
        details: details,
        created_at: now.toISOString()
      } as any);

      return;
    }

    // Strategy 3: No active Supabase session — log to console only
    // This prevents breaking billing operations for localStorage-fallback sessions
    console.warn(`[AuditLog] Could not write to Supabase (no auth session): ${action} — ${details}`);

  } catch (err) {
    // Never throw — audit failure must not block production billing operations
    console.error('[AuditLog] Error logging audit event (non-fatal):', err);
  }
}
