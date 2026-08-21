// ============================================================
// serviceCatalogService.ts — Care Services & Package Master Service
// Project: The House of Pawz – Billing Pro
// Phase 4: Service Catalog + Package Master + Monthly Subscriptions
// ============================================================

import { supabase } from './supabase';
import { 
  ServiceCatalogItem, 
  ServicePackageMaster, 
  MonthlyServicePackage, 
  MonthlyPackageBillingRecord,
  User 
} from '../types';
import { hasPermission } from './permissions';

// ============================================================
// 1. SERVICE CATALOG MASTER
// ============================================================

export async function fetchServiceCatalogFromSupabase(): Promise<ServiceCatalogItem[]> {
  try {
    const { data, error } = await supabase
      .from('service_catalog')
      .select('*')
      .order('service_name', { ascending: true });

    if (error || !data) {
      console.warn('Supabase returned 0 services (or table empty):', error?.message);
      return [];
    }

    return (data as any[]).map(s => {
      // Safely parse billing_unit and pricing_method from metadata/description if columns don't exist yet
      let unit = s.billing_unit;
      let pricing = s.pricing_method;
      let cleanDesc = s.description || '';

      if (!unit && cleanDesc.includes('[UNIT:')) {
        const match = cleanDesc.match(/\[UNIT:([^\]]+)\]/);
        if (match) unit = match[1];
      }
      if (!pricing && cleanDesc.includes('[PRICING:')) {
        const match = cleanDesc.match(/\[PRICING:([^\]]+)\]/);
        if (match) pricing = match[1];
      }

      return {
        id: s.id,
        serviceName: s.service_name,
        category: s.category,
        speciesApplicable: s.species_applicable,
        billingUnit: (unit || 'Night') as any,
        pricingMethod: (pricing || 'FIXED_RATE') as any,
        description: cleanDesc.replace(/\[UNIT:[^\]]+\]/g, '').replace(/\[PRICING:[^\]]+\]/g, '').trim(),
        baseRate: Number(s.base_rate) || 0,
        isGstApplicable: Boolean(s.is_gst_applicable),
        gstRate: Number(s.gst_rate) || 0,
        hsnSac: s.hsn_sac || '999799',
        isActive: Boolean(s.is_active),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      };
    });
  } catch (err) {
    console.error('Error fetching service catalog from Supabase:', err);
    return [];
  }
}

export async function saveServiceCatalogItemInSupabase(
  item: ServiceCatalogItem,
  currentUser?: User | null
): Promise<{ data?: ServiceCatalogItem; error?: string }> {
  try {
    if (currentUser && !hasPermission(currentUser, 'service_catalog_edit')) {
      return { error: 'Access Denied: You do not have permission to add or edit services.' };
    }

    const isUUID = item.id && item.id.length === 36 && item.id.includes('-');

    // Embed billingUnit and pricingMethod into description tag as fallback for 100% database schema compatibility
    const metaTags = `[UNIT:${item.billingUnit || 'Night'}][PRICING:${item.pricingMethod || 'FIXED_RATE'}]`;
    const cleanDesc = (item.description || '').replace(/\[UNIT:[^\]]+\]/g, '').replace(/\[PRICING:[^\]]+\]/g, '').trim();
    const finalDescription = cleanDesc ? `${cleanDesc} ${metaTags}` : metaTags;

    const payload = {
      service_name: item.serviceName,
      category: item.category,
      species_applicable: item.speciesApplicable,
      description: finalDescription,
      base_rate: item.baseRate,
      is_gst_applicable: item.isGstApplicable,
      gst_rate: item.isGstApplicable ? (item.gstRate ?? 18) : 0,
      hsn_sac: item.hsnSac || '999799',
      is_active: item.isActive
    };

    if (isUUID) {
      const { data, error } = await supabase
        .from('service_catalog')
        .update(payload as any)
        .eq('id', item.id)
        .select()
        .single();

      if (error) return { error: error.message };
      return {
        data: {
          ...item,
          id: (data as any).id,
          updatedAt: (data as any).updated_at
        }
      };
    } else {
      const { data, error } = await supabase
        .from('service_catalog')
        .insert(payload as any)
        .select()
        .single();

      if (error) return { error: error.message };
      return {
        data: {
          ...item,
          id: (data as any).id,
          createdAt: (data as any).created_at,
          updatedAt: (data as any).updated_at
        }
      };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteServiceCatalogItemFromSupabase(
  serviceId: string,
  currentUser?: User | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser && !hasPermission(currentUser, 'service_catalog_delete')) {
      return { success: false, error: 'Access Denied: You do not have permission to delete services.' };
    }

    const { error } = await supabase
      .from('service_catalog')
      .delete()
      .eq('id', serviceId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// 2. PACKAGE MASTER
// ============================================================

export async function fetchPackageMasterFromSupabase(): Promise<ServicePackageMaster[]> {
  try {
    const { data, error } = await supabase
      .from('service_package_master')
      .select('*')
      .order('package_name', { ascending: true });

    if (error || !data) {
      console.warn('Supabase returned 0 packages (or table empty):', error?.message);
      return [];
    }

    return (data as any[]).map(p => ({
      id: p.id,
      packageName: p.package_name,
      category: p.category,
      petSpecies: p.pet_species,
      description: p.description || '',
      includedServices: Array.isArray(p.included_services) ? p.included_services : [],
      validityDays: Number(p.validity_days) || 30,
      packagePrice: Number(p.package_price) || 0,
      isGstApplicable: Boolean(p.is_gst_applicable),
      gstRate: Number(p.gst_rate) || 0,
      hsnSac: p.hsn_sac || '999799',
      isActive: Boolean(p.is_active),
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  } catch (err) {
    console.error('Error fetching package master from Supabase:', err);
    return [];
  }
}

export async function savePackageMasterInSupabase(
  pkg: ServicePackageMaster,
  currentUser?: User | null
): Promise<{ data?: ServicePackageMaster; error?: string }> {
  try {
    if (currentUser && !hasPermission(currentUser, 'package_master_edit')) {
      return { error: 'Access Denied: You do not have permission to add or edit packages.' };
    }

    const isUUID = pkg.id && pkg.id.length === 36 && pkg.id.includes('-');
    const payload = {
      package_name: pkg.packageName,
      category: pkg.category,
      pet_species: pkg.petSpecies,
      description: pkg.description || null,
      included_services: pkg.includedServices || [],
      validity_days: pkg.validityDays,
      package_price: pkg.packagePrice,
      is_gst_applicable: pkg.isGstApplicable,
      gst_rate: pkg.gstRate,
      hsn_sac: pkg.hsnSac || '999799',
      is_active: pkg.isActive
    };

    if (isUUID) {
      const { data, error } = await supabase
        .from('service_package_master')
        .update(payload as any)
        .eq('id', pkg.id)
        .select()
        .single();

      if (error) return { error: error.message };
      return {
        data: {
          ...pkg,
          id: (data as any).id,
          updatedAt: (data as any).updated_at
        }
      };
    } else {
      const { data, error } = await supabase
        .from('service_package_master')
        .insert(payload as any)
        .select()
        .single();

      if (error) return { error: error.message };
      return {
        data: {
          ...pkg,
          id: (data as any).id,
          createdAt: (data as any).created_at,
          updatedAt: (data as any).updated_at
        }
      };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deletePackageMasterFromSupabase(
  packageId: string,
  currentUser?: User | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser && !hasPermission(currentUser, 'package_master_delete')) {
      return { success: false, error: 'Access Denied: You do not have permission to delete packages.' };
    }

    const { error } = await supabase
      .from('service_package_master')
      .delete()
      .eq('id', packageId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// 3. MONTHLY PACKAGE SUBSCRIPTIONS
// ============================================================

export async function fetchMonthlyPackagesFromSupabase(): Promise<MonthlyServicePackage[]> {
  try {
    const { data, error } = await supabase
      .from('monthly_service_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Supabase returned 0 monthly packages:', error?.message);
      return [];
    }

    return (data as any[]).map(m => ({
      id: m.id,
      subscriptionCode: m.subscription_code,
      customerId: m.customer_id,
      customerName: m.customer_name,
      customerPhone: m.customer_phone || '',
      petId: m.pet_id,
      petName: m.pet_name,
      petSpecies: m.pet_species,
      packageId: m.package_id,
      packageName: m.package_name,
      startDate: m.start_date,
      endDate: m.end_date,
      monthlyAmount: Number(m.monthly_amount) || 0,
      gstRate: Number(m.gst_rate) || 0,
      gstAmount: Number(m.gst_amount) || 0,
      totalMonthlyAmount: Number(m.total_monthly_amount) || 0,
      paidAmount: Number(m.paid_amount) || 0,
      balanceDue: Number(m.balance_due) || 0,
      status: m.status,
      notes: m.notes || '',
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
  } catch (err) {
    console.error('Error fetching monthly packages from Supabase:', err);
    return [];
  }
}

export async function saveMonthlyPackageInSupabase(
  sub: MonthlyServicePackage,
  currentUser?: User | null
): Promise<{ data?: MonthlyServicePackage; error?: string }> {
  try {
    if (currentUser && !hasPermission(currentUser, 'monthly_package_manage')) {
      return { error: 'Access Denied: You do not have permission to manage monthly subscriptions.' };
    }

    const isUUID = sub.id && sub.id.length === 36 && sub.id.includes('-');
    const payload = {
      subscription_code: sub.subscriptionCode,
      customer_id: sub.customerId,
      customer_name: sub.customerName,
      customer_phone: sub.customerPhone || null,
      pet_id: sub.petId,
      pet_name: sub.petName,
      pet_species: sub.petSpecies,
      package_id: sub.packageId,
      package_name: sub.packageName,
      start_date: sub.startDate,
      end_date: sub.endDate,
      monthly_amount: sub.monthlyAmount,
      gst_rate: sub.gstRate,
      gst_amount: sub.gstAmount,
      total_monthly_amount: sub.totalMonthlyAmount,
      paid_amount: sub.paidAmount,
      balance_due: sub.balanceDue,
      status: sub.status,
      notes: sub.notes || null
    };

    if (isUUID) {
      const { data, error } = await supabase
        .from('monthly_service_packages')
        .update(payload as any)
        .eq('id', sub.id)
        .select()
        .single();

      if (error) return { error: error.message };
      return {
        data: {
          ...sub,
          id: (data as any).id,
          updatedAt: (data as any).updated_at
        }
      };
    } else {
      const { data, error } = await supabase
        .from('monthly_service_packages')
        .insert(payload as any)
        .select()
        .single();

      if (error) return { error: error.message };
      return {
        data: {
          ...sub,
          id: (data as any).id,
          createdAt: (data as any).created_at,
          updatedAt: (data as any).updated_at
        }
      };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteMonthlyPackageFromSupabase(
  subId: string,
  currentUser?: User | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser && !hasPermission(currentUser, 'monthly_package_delete')) {
      return { success: false, error: 'Access Denied: You do not have permission to delete monthly subscriptions.' };
    }

    const { error } = await supabase
      .from('monthly_service_packages')
      .delete()
      .eq('id', subId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
