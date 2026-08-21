import { supabase } from './supabase';
import { 
  LongTermContract, 
  LongTermContractItem, 
  LongTermServiceUsage, 
  LongTermBillingPeriod 
} from '../types';

/**
 * Fetch all Long-Term Packages / Contracts with their nested component items
 */
export async function fetchLongTermContractsFromSupabase(): Promise<LongTermContract[]> {
  try {
    const { data: contractsData, error: contractsError } = await supabase
      .from('long_term_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (contractsError) {
      console.error('[b2bContractService] fetchLongTermContracts error:', contractsError);
      return [];
    }

    if (!contractsData || contractsData.length === 0) {
      return [];
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('long_term_contract_items')
      .select('*');

    if (itemsError) {
      console.error('[b2bContractService] fetchContractItems error:', itemsError);
    }

    const allItems = (itemsData || []) as any[];

    return (contractsData as any[]).map(c => {
      const contractItems = allItems
        .filter(item => item.contract_id === c.id)
        .map(item => ({
          id: item.id,
          contractId: item.contract_id,
          serviceId: item.service_id,
          serviceName: item.service_name,
          speciesApplicable: item.species_applicable || 'All',
          pricingMethod: item.pricing_method || 'FIXED_RATE',
          allocatedQuantity: Number(item.allocated_quantity || 0),
          unit: item.unit || 'Nights',
          rate: Number(item.rate || 0),
          fixedAmount: Number(item.fixed_amount || 0),
          isGstApplicable: item.is_gst_applicable !== false,
          gstRate: Number(item.gst_rate || 18),
          hsnSac: item.hsn_sac || '999799',
          usedQuantity: Number(item.used_quantity || 0),
          notes: item.notes || '',
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })) as LongTermContractItem[];

      return {
        id: c.id,
        contractCode: c.contract_code,
        contractName: c.contract_name,
        customerId: c.customer_id,
        customerName: c.customer_name,
        customerPhone: c.customer_phone || '',
        customerEmail: c.customer_email || '',
        customerGstin: c.customer_gstin || '',
        customerType: c.customer_type || 'INDIVIDUAL',
        contractType: c.contract_type || 'MONTHLY',
        startDate: c.start_date,
        endDate: c.end_date,
        billingFrequency: c.billing_frequency || 'Monthly',
        paymentTerms: c.payment_terms || 'Net 30',
        creditDays: Number(c.credit_days || 30),
        currency: c.currency || 'INR',
        isGstApplicable: c.is_gst_applicable !== false,
        gstRate: Number(c.gst_rate || 18),
        totalContractValue: Number(c.total_contract_value || 0),
        totalBilledAmount: Number(c.total_billed_amount || 0),
        balanceDue: Number(c.balance_due || 0),
        status: c.status || 'ACTIVE',
        notes: c.notes || '',
        components: contractItems,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      } as LongTermContract;
    });
  } catch (err) {
    console.error('[b2bContractService] Exception in fetchLongTermContracts:', err);
    return [];
  }
}

/**
 * Save or update a Long-Term Package / Contract with all components
 */
export async function saveLongTermContractToSupabase(contract: LongTermContract): Promise<{ success: boolean; contractId?: string; error?: string }> {
  try {
    const isNew = !contract.id || contract.id.startsWith('ltp-local-') || contract.id.startsWith('LTP-');
    const contractPayload = {
      contract_code: contract.contractCode,
      contract_name: contract.contractName,
      customer_id: contract.customerId,
      customer_name: contract.customerName,
      customer_phone: contract.customerPhone || null,
      customer_email: contract.customerEmail || null,
      customer_gstin: contract.customerGstin || null,
      customer_type: contract.customerType || 'INDIVIDUAL',
      contract_type: contract.contractType || 'MONTHLY',
      start_date: contract.startDate,
      end_date: contract.endDate,
      billing_frequency: contract.billingFrequency || 'Monthly',
      payment_terms: contract.paymentTerms || 'Net 30',
      credit_days: contract.creditDays || 30,
      currency: contract.currency || 'INR',
      is_gst_applicable: contract.isGstApplicable !== false,
      gst_rate: contract.gstRate || 18,
      total_contract_value: contract.totalContractValue || 0,
      total_billed_amount: contract.totalBilledAmount || 0,
      balance_due: contract.balanceDue || 0,
      status: contract.status || 'ACTIVE',
      notes: contract.notes || null,
      updated_at: new Date().toISOString()
    };

    let targetContractId = contract.id;

    if (isNew) {
      const { data, error } = await supabase
        .from('long_term_contracts')
        .insert(contractPayload)
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create long term contract' };
      }
      targetContractId = data.id;
    } else {
      const { error } = await supabase
        .from('long_term_contracts')
        .update(contractPayload)
        .eq('id', targetContractId);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    // Save or update components
    if (contract.components && contract.components.length > 0) {
      for (const comp of contract.components) {
        const compPayload = {
          contract_id: targetContractId,
          service_id: comp.serviceId || null,
          service_name: comp.serviceName,
          species_applicable: comp.speciesApplicable || 'All',
          pricing_method: comp.pricingMethod || 'FIXED_RATE',
          allocated_quantity: comp.allocatedQuantity || 0,
          unit: comp.unit || 'Nights',
          rate: comp.rate || 0,
          fixed_amount: comp.fixedAmount || 0,
          is_gst_applicable: comp.isGstApplicable !== false,
          gst_rate: comp.gstRate || 18,
          hsn_sac: comp.hsnSac || '999799',
          used_quantity: comp.usedQuantity || 0,
          notes: comp.notes || null,
          updated_at: new Date().toISOString()
        };

        const isNewComp = !comp.id || comp.id.startsWith('comp-local-');
        if (isNewComp) {
          await supabase.from('long_term_contract_items').insert(compPayload);
        } else {
          await supabase.from('long_term_contract_items').update(compPayload).eq('id', comp.id);
        }
      }
    }

    return { success: true, contractId: targetContractId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a Long-Term Package / Contract (Accountant only)
 */
export async function deleteLongTermContractFromSupabase(contractId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('long_term_contracts')
      .delete()
      .eq('id', contractId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all Service Usages logged against contracts
 */
export async function fetchLongTermServiceUsagesFromSupabase(): Promise<LongTermServiceUsage[]> {
  try {
    const { data, error } = await supabase
      .from('long_term_service_usage')
      .select('*')
      .order('service_date', { ascending: false });

    if (error) {
      console.error('[b2bContractService] fetchServiceUsages error:', error);
      return [];
    }

    return (data || []).map((u: any) => ({
      id: u.id,
      contractId: u.contract_id,
      contractCode: u.contract_code,
      contractItemId: u.contract_item_id,
      customerId: u.customer_id,
      customerName: u.customer_name,
      petId: u.pet_id || '',
      petName: u.pet_name || '',
      petSpecies: u.pet_species || 'Dog',
      serviceName: u.service_name,
      serviceDate: u.service_date,
      startDate: u.start_date || '',
      endDate: u.end_date || '',
      quantityUsed: Number(u.quantity_used || 0),
      unit: u.unit || 'Nights',
      pickDropBookingId: u.pick_drop_booking_id || '',
      pickupAddress: u.pickup_address || '',
      dropAddress: u.drop_address || '',
      driverName: u.driver_name || '',
      vehicleNumber: u.vehicle_number || '',
      baseAmount: Number(u.base_amount || 0),
      gstAmount: Number(u.gst_amount || 0),
      totalAmount: Number(u.total_amount || 0),
      billingStatus: u.billing_status || 'PENDING',
      invoiceNumber: u.invoice_number || '',
      notes: u.notes || '',
      loggedBy: u.logged_by || 'Chirag Jain',
      createdAt: u.created_at
    }));
  } catch (err) {
    console.error('[b2bContractService] Exception in fetchServiceUsages:', err);
    return [];
  }
}

/**
 * Log new service usage against a contract component via PostgreSQL Atomic RPC (concurrency & allocation safe)
 */
export async function logLongTermServiceUsageToSupabase(
  usage: LongTermServiceUsage,
  component: LongTermContractItem
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const rpcPayload = {
      p_contract_id: usage.contractId,
      p_contract_item_id: usage.contractItemId,
      p_customer_id: usage.customerId,
      p_customer_name: usage.customerName,
      p_pet_id: usage.petId || null,
      p_pet_name: usage.petName || null,
      p_pet_species: usage.petSpecies || null,
      p_service_name: usage.serviceName,
      p_service_date: usage.serviceDate,
      p_start_date: usage.startDate || null,
      p_end_date: usage.endDate || null,
      p_quantity_used: usage.quantityUsed,
      p_unit: usage.unit || 'Nights',
      p_pick_drop_booking_id: usage.pickDropBookingId || null,
      p_pickup_address: usage.pickupAddress || null,
      p_drop_address: usage.dropAddress || null,
      p_driver_name: usage.driverName || null,
      p_vehicle_number: usage.vehicleNumber || null,
      p_base_amount: usage.baseAmount,
      p_gst_amount: usage.gstAmount,
      p_total_amount: usage.totalAmount,
      p_notes: usage.notes || null,
      p_logged_by: usage.loggedBy || 'Chirag Jain'
    };

    const { data, error } = await (supabase.rpc as any)('log_contract_service_usage', rpcPayload);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all Billing Periods generated for contracts
 */
export async function fetchLongTermBillingPeriodsFromSupabase(): Promise<LongTermBillingPeriod[]> {
  try {
    const { data, error } = await supabase
      .from('long_term_billing_periods')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[b2bContractService] fetchBillingPeriods error:', error);
      return [];
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      contractId: b.contract_id,
      contractCode: b.contract_code,
      customerId: b.customer_id,
      customerName: b.customer_name,
      periodName: b.period_name,
      periodStartDate: b.period_start_date,
      periodEndDate: b.period_end_date,
      servicePeriodDescription: b.service_period_description,
      invoiceId: b.invoice_id || '',
      invoiceNumber: b.invoice_number || '',
      subTotal: Number(b.sub_total || 0),
      taxableAmount: Number(b.taxable_amount || 0),
      cgstAmount: Number(b.cgst_amount || 0),
      sgstAmount: Number(b.sgst_amount || 0),
      igstAmount: Number(b.igst_amount || 0),
      totalGst: Number(b.total_gst || 0),
      grandTotal: Number(b.grand_total || 0),
      billingDate: b.billing_date,
      status: b.status || 'PENDING',
      notes: b.notes || '',
      createdAt: b.created_at
    }));
  } catch (err) {
    console.error('[b2bContractService] Exception in fetchBillingPeriods:', err);
    return [];
  }
}

/**
 * Record a finalized Billing Period with duplicate prevention check
 */
export async function recordLongTermBillingPeriodToSupabase(period: LongTermBillingPeriod): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      contract_id: period.contractId,
      contract_code: period.contractCode,
      customer_id: period.customerId,
      customer_name: period.customerName,
      period_name: period.periodName,
      period_start_date: period.periodStartDate,
      period_end_date: period.periodEndDate,
      service_period_description: period.servicePeriodDescription,
      invoice_id: period.invoiceId || null,
      invoice_number: period.invoiceNumber || null,
      sub_total: period.subTotal,
      taxable_amount: period.taxableAmount,
      cgst_amount: period.cgstAmount,
      sgst_amount: period.sgstAmount,
      igst_amount: period.igstAmount,
      total_gst: period.totalGst,
      grand_total: period.grandTotal,
      billing_date: period.billingDate,
      status: period.status || 'INVOICED',
      notes: period.notes || null
    };

    const { error } = await supabase
      .from('long_term_billing_periods')
      .insert(payload);

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Invoice already generated for this contract billing period.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
