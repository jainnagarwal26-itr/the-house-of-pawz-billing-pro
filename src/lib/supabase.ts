// ============================================================
// supabase.ts — Centralized Supabase Primary Database Client
// Project: The House of Pawz – Billing Pro
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://dxvnemdmgdckdfzilnkr.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dm5lbWRtZ2Rja2RmemlsbmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODY2NDAsImV4cCI6MjEwMTg2MjY0MH0.OoCEj2WVg_irDAaETZ-xZTuT_z_OrWVfBTIysgCxMqw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
