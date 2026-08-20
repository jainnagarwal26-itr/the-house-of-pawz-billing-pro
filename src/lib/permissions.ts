import { User, UserRole } from '../types';

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  title: string;
  description: string;
  iconName: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'dashboard',
    title: 'A. Dashboard',
    description: 'Overview KPIs, sales summaries, and boarding stats',
    iconName: 'LayoutDashboard',
    permissions: [
      { key: 'dashboard_view', label: 'View Dashboard', description: 'Access main dashboard and key business performance metrics' }
    ]
  },
  {
    id: 'invoices',
    title: 'B. Invoices',
    description: 'GST tax invoice generation, editing, printing & actions',
    iconName: 'Receipt',
    permissions: [
      { key: 'invoices_view', label: 'View Invoices', description: 'Browse and search GST tax invoice history' },
      { key: 'invoices_create', label: 'Create Invoice', description: 'Generate and save new GST invoices' },
      { key: 'invoices_edit', label: 'Edit Invoice Data', description: 'Modify client items, dates, and discounts' },
      { key: 'invoices_delete', label: 'Delete Invoice', description: 'Permanently remove saved invoice records' },
      { key: 'invoices_change_number', label: 'Change Invoice Number', description: 'Manually edit invoice sequence numbers' },
      { key: 'invoices_cancel', label: 'Cancel Invoice', description: 'Mark invoices as cancelled and adjust GST ledger' },
      { key: 'invoices_download_pdf', label: 'Download PDF', description: 'Export vector-sharp Tax Invoice PDFs' },
      { key: 'invoices_print', label: 'Print Invoice', description: 'Print hard-copy invoices on A4 printer' },
      { key: 'invoices_whatsapp', label: 'Send WhatsApp', description: 'Dispatch invoice PDF links to client phone via WhatsApp' },
      { key: 'invoices_email', label: 'Send Email', description: 'Email digital tax invoices to customers' }
    ]
  },
  {
    id: 'customers',
    title: 'C. Customers',
    description: 'Customer master directory, advance credits & contacts',
    iconName: 'Users',
    permissions: [
      { key: 'customers_view', label: 'View Customers', description: 'Access client directory and advance balance records' },
      { key: 'customers_create', label: 'Add New Customer', description: 'Register new pet owners into master database' },
      { key: 'customers_edit', label: 'Edit Customer', description: 'Update customer contact info, GSTIN, and advance credits' },
      { key: 'customers_delete', label: 'Delete Customer', description: 'Permanently remove customer master accounts' }
    ]
  },
  {
    id: 'pets',
    title: 'D. Pets',
    description: 'Pet profiles, medical records, and owner mapping',
    iconName: 'Dog',
    permissions: [
      { key: 'pets_view', label: 'View Pets', description: 'Browse pet profiles, breeds, and medical notes' },
      { key: 'pets_create', label: 'Add New Pet Profile', description: 'Register new pets linked to customer accounts' },
      { key: 'pets_edit', label: 'Edit Pet Profile', description: 'Update pet details, vaccination status, and photos' },
      { key: 'pets_delete', label: 'Delete Pet Profile', description: 'Permanently remove pet records' },
      { key: 'pets_checkin_checkout', label: 'Pet Check-In / Check-Out', description: 'Manage active pet boarding check-ins and room assignments' }
    ]
  },
  {
    id: 'boarding',
    title: 'E. Boarding & Daycare',
    description: 'Recurring boarding subscriptions & kennel management',
    iconName: 'Repeat',
    permissions: [
      { key: 'boarding_view', label: 'View Boarding Log', description: 'Monitor daily pet boarding and room occupancy' },
      { key: 'boarding_manage', label: 'Manage Recurring Subscriptions', description: 'Configure auto-recurring billing for long-term boarding' }
    ]
  },
  {
    id: 'payments',
    title: 'F. Payments',
    description: 'Payment receipts, UPI logs, cash and bank registers',
    iconName: 'CreditCard',
    permissions: [
      { key: 'payments_view', label: 'View Payments Log', description: 'Inspect payment history and transaction modes' },
      { key: 'payments_record', label: 'Record Payment', description: 'Log incoming customer cash/UPI/card payments' },
      { key: 'payments_delete', label: 'Delete Payment Record', description: 'Remove payment transaction entries' }
    ]
  },
  {
    id: 'gst_reports',
    title: 'G. GST Reports (CA)',
    description: 'GSTR-1, GSTR-3B audit reports & CA exports',
    iconName: 'FileSpreadsheet',
    permissions: [
      { key: 'gst_reports_view', label: 'View GST Reports', description: 'Access Monthly/Quarterly GST summary tables' },
      { key: 'gst_reports_export', label: 'Export CA Excel/JSON', description: 'Download GSTR-1 ready Excel files for CA filing' }
    ]
  },
  {
    id: 'excel_db',
    title: 'H. Excel Database',
    description: 'Production workbook manager & database backups',
    iconName: 'HardDrive',
    permissions: [
      { key: 'excel_db_view', label: 'View Excel Database', description: 'Inspect 9-sheet Excel workbook structure' },
      { key: 'excel_db_export', label: 'Backup / Export Excel', description: 'Export THOP_BILLING_DATABASE.xlsx' },
      { key: 'excel_db_restore', label: 'Restore Database', description: 'Upload and overwrite system state from Excel workbook' }
    ]
  },
  {
    id: 'import_export',
    title: 'I. Import / Export Engine',
    description: 'Smart AI excel database parser and bulk data loader',
    iconName: 'Zap',
    permissions: [
      { key: 'import_engine_view', label: 'View Import Engine', description: 'Access Smart Excel Import tool' },
      { key: 'import_engine_execute', label: 'Execute Bulk Import', description: 'Batch import client data into production database' }
    ]
  },
  {
    id: 'audit_logs',
    title: 'J. Audit Logs',
    description: 'System security audit trail & activity history',
    iconName: 'History',
    permissions: [
      { key: 'audit_logs_view', label: 'View Audit Logs', description: 'Review system security logs and user action history' }
    ]
  },
  {
    id: 'communication_center',
    title: 'K. Communication Centre',
    description: 'WhatsApp, Email, PDF Dispatch, Payment Receipts & Customer Statements',
    iconName: 'Send',
    permissions: [
      { key: 'communication_center_view', label: 'View Communication Centre', description: 'Access WhatsApp, Email & PDF Communication hub' },
      { key: 'invoices_whatsapp', label: 'Send Invoice WhatsApp', description: 'Dispatch invoice details via WhatsApp' },
      { key: 'invoices_email', label: 'Send Invoice Email', description: 'Email digital tax invoices to customers' },
      { key: 'receipt_share', label: 'Share Payment Receipts', description: 'Send payment receipts via WhatsApp or Email' },
      { key: 'statement_share', label: 'Share Customer Statements', description: 'Send customer ledger statements via WhatsApp or Email' }
    ]
  },
  {
    id: 'user_management',
    title: 'L. User Management',
    description: 'Role assignment, password resets & permission editing',
    iconName: 'UserCog',
    permissions: [
      { key: 'user_management_view', label: 'View User Accounts', description: 'Browse staff accounts and role assignments' },
      { key: 'user_management_edit', label: 'Create / Edit Users', description: 'Add new staff members or update designations' },
      { key: 'user_management_permissions', label: 'Edit Permissions', description: 'Configure action-level permissions and overrides' },
      { key: 'user_management_reset_password', label: 'Reset Password', description: 'Change passwords for other staff accounts' }
    ]
  },
  {
    id: 'settings',
    title: 'M. Software Settings',
    description: 'Company bank details, GSTIN, branding & factory reset',
    iconName: 'Settings',
    permissions: [
      { key: 'settings_view', label: 'View Software Settings', description: 'Inspect company address, bank, and GST config' },
      { key: 'settings_edit', label: 'Edit Settings', description: 'Modify IndusInd Bank details, logo, signature & prefix' },
      { key: 'settings_factory_reset', label: 'Factory Reset App', description: 'Perform full system database reset' }
    ]
  },
  {
    id: 'reports',
    title: 'N. Reports',
    description: 'Business analytics, sales ledgers & performance exports',
    iconName: 'FileSpreadsheet',
    permissions: [
      { key: 'reports_view', label: 'View Business Reports', description: 'Access revenue and client growth reports' },
      { key: 'reports_export', label: 'Export Reports', description: 'Download CSV/Excel business reports' }
    ]
  },
  {
    id: 'pick_drop',
    title: 'O. Pick & Drop Service',
    description: 'Pet transportation, driver/vehicle allocation & trip lifecycle',
    iconName: 'Car',
    permissions: [
      { key: 'pick_drop_view', label: 'View Pick & Drop', description: 'Access Pick & Drop dashboard, bookings, and trip schedules' },
      { key: 'pick_drop_create', label: 'Book New Trip', description: 'Create and register new Pick & Drop transportation bookings' },
      { key: 'pick_drop_edit', label: 'Edit Trip Details', description: 'Modify addresses, dates, preferred times, and notes' },
      { key: 'pick_drop_delete', label: 'Delete Trip', description: 'Permanently remove booking records' },
      { key: 'pick_drop_assign', label: 'Assign Driver & Vehicle', description: 'Allocate drivers and vehicles to scheduled trips' },
      { key: 'pick_drop_status_update', label: 'Update Trip Status', description: 'Mark arrived, confirm pet pickup, mark delivered & complete trip' },
      { key: 'pick_drop_pricing_view', label: 'View Pricing Rules', description: 'Inspect base and per-km pricing matrix' },
      { key: 'pick_drop_pricing_edit', label: 'Edit Pricing Rules', description: 'Configure and update dynamic pricing rules' },
      { key: 'pick_drop_reports_view', label: 'View Trip Analytics', description: 'Access Pick & Drop trip summary statistics' },
      { key: 'pick_drop_recurring_view', label: 'View Recurring Transit', description: 'Inspect recurring Pick & Drop subscription schedules' },
      { key: 'pick_drop_recurring_edit', label: 'Manage Recurring Transit', description: 'Create and generate recurring Pick & Drop trips' },
      { key: 'pick_drop_reports_export', label: 'Export Transit Reports', description: 'Download CSV reports for trips, fleet and revenue' }
    ]
  },
  {
    id: 'services',
    title: 'P. Service & Package Masters',
    description: 'Care catalog, manual amounts, species tariffs, package tiers & monthly subscriptions',
    iconName: 'Package',
    permissions: [
      { key: 'service_catalog_view', label: 'View Service Catalog', description: 'Inspect care services, tariffs and GST rates' },
      { key: 'service_catalog_edit', label: 'Add / Edit Services', description: 'Create and update service master records' },
      { key: 'service_catalog_delete', label: 'Delete Services', description: 'Permanently remove service master records' },
      { key: 'package_master_view', label: 'View Package Master', description: 'Inspect bundled care package tiers' },
      { key: 'package_master_edit', label: 'Add / Edit Packages', description: 'Create and update package master records' },
      { key: 'package_master_delete', label: 'Delete Packages', description: 'Permanently remove package master records' },
      { key: 'monthly_package_view', label: 'View Monthly Subscriptions', description: 'Inspect recurring client monthly packages' },
      { key: 'monthly_package_manage', label: 'Manage Monthly Packages', description: 'Create, renew and bill monthly client packages' },
      { key: 'monthly_package_delete', label: 'Delete Monthly Package', description: 'Permanently remove client monthly package subscriptions' }
    ]
  }
];

// Default Permission Matrices per Role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  ACCOUNTANT: {
    dashboard_view: true,
    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: true,
    invoices_change_number: true,
    invoices_cancel: true,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: true,
    invoices_email: true,
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: true,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: true,
    pets_checkin_checkout: true,
    boarding_view: true,
    boarding_manage: true,
    payments_view: true,
    payments_record: true,
    payments_delete: true,
    gst_reports_view: true,
    gst_reports_export: true,
    excel_db_view: true,
    excel_db_export: true,
    excel_db_restore: true,
    import_engine_view: true,
    import_engine_execute: true,
    audit_logs_view: true,
    communication_center_view: true,
    receipt_share: true,
    statement_share: true,
    user_management_view: true,
    user_management_edit: true,
    user_management_permissions: true,
    user_management_reset_password: true,
    settings_view: true,
    settings_edit: true,
    settings_factory_reset: true,
    reports_view: true,
    reports_export: true,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: true,
    pick_drop_delete: true,
    pick_drop_assign: true,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: true,
    pick_drop_reports_view: true,
    pick_drop_recurring_view: true,
    pick_drop_recurring_edit: true,
    pick_drop_reports_export: true,
    service_catalog_view: true,
    service_catalog_edit: true,
    service_catalog_delete: true,
    package_master_view: true,
    package_master_edit: true,
    package_master_delete: true,
    monthly_package_view: true,
    monthly_package_manage: true,
    monthly_package_delete: true
  },

  ADMIN: {
    dashboard_view: true,
    invoices_view: false,
    invoices_create: true,
    invoices_edit: false,
    invoices_delete: false,
    invoices_change_number: false,
    invoices_cancel: false,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: true,
    invoices_email: true,
    customers_view: true,
    customers_create: true,
    customers_edit: false,
    customers_delete: false,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: false,
    pets_checkin_checkout: true,
    boarding_view: false,
    boarding_manage: false,
    payments_view: true,
    payments_record: true,
    payments_delete: false,
    gst_reports_view: false,
    gst_reports_export: false,
    excel_db_view: false,
    excel_db_export: false,
    excel_db_restore: false,
    import_engine_view: false,
    import_engine_execute: false,
    audit_logs_view: false,
    communication_center_view: true,
    receipt_share: true,
    statement_share: false,
    user_management_view: false,
    user_management_edit: false,
    user_management_permissions: false,
    user_management_reset_password: false,
    settings_view: false,
    settings_edit: false,
    settings_factory_reset: false,
    reports_view: false,
    reports_export: false,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: true,
    pick_drop_delete: false,
    pick_drop_assign: true,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: true,
    pick_drop_reports_view: true,
    pick_drop_recurring_view: true,
    pick_drop_recurring_edit: true,
    pick_drop_reports_export: true,
    service_catalog_view: true,
    service_catalog_edit: true,
    service_catalog_delete: false,
    package_master_view: true,
    package_master_edit: true,
    package_master_delete: false,
    monthly_package_view: true,
    monthly_package_manage: true,
    monthly_package_delete: false
  },

  SUPER_ADMIN: {
    dashboard_view: true,
    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: true,
    invoices_change_number: true,
    invoices_cancel: true,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: true,
    invoices_email: true,
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: true,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: true,
    pets_checkin_checkout: true,
    boarding_view: true,
    boarding_manage: true,
    payments_view: true,
    payments_record: true,
    payments_delete: true,
    gst_reports_view: true,
    gst_reports_export: true,
    excel_db_view: true,
    excel_db_export: true,
    excel_db_restore: true,
    import_engine_view: true,
    import_engine_execute: true,
    audit_logs_view: true,
    communication_center_view: true,
    receipt_share: true,
    statement_share: true,
    user_management_view: true,
    user_management_edit: true,
    user_management_permissions: true,
    user_management_reset_password: true,
    settings_view: true,
    settings_edit: true,
    settings_factory_reset: true,
    reports_view: true,
    reports_export: true,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: true,
    pick_drop_delete: true,
    pick_drop_assign: true,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: true,
    pick_drop_reports_view: true,
    pick_drop_recurring_view: true,
    pick_drop_recurring_edit: true,
    pick_drop_reports_export: true
  },

  USER: {
    dashboard_view: false,
    invoices_view: false,
    invoices_create: false,
    invoices_edit: false,
    invoices_delete: false,
    invoices_change_number: false,
    invoices_cancel: false,
    invoices_download_pdf: false,
    invoices_print: false,
    invoices_whatsapp: false,
    invoices_email: false,
    customers_view: false,
    customers_create: false,
    customers_edit: false,
    customers_delete: false,
    pets_view: false,
    pets_create: false,
    pets_edit: false,
    pets_delete: false,
    pets_checkin_checkout: false,
    boarding_view: false,
    boarding_manage: false,
    payments_view: false,
    payments_record: false,
    payments_delete: false,
    gst_reports_view: false,
    gst_reports_export: false,
    excel_db_view: false,
    excel_db_export: false,
    excel_db_restore: false,
    import_engine_view: false,
    import_engine_execute: false,
    audit_logs_view: false,
    communication_center_view: false,
    receipt_share: false,
    statement_share: false,
    user_management_view: false,
    user_management_edit: false,
    user_management_permissions: false,
    user_management_reset_password: false,
    settings_view: false,
    settings_edit: false,
    settings_factory_reset: false,
    reports_view: false,
    reports_export: false,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: false,
    pick_drop_delete: false,
    pick_drop_assign: false,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: false,
    pick_drop_reports_view: false,
    pick_drop_recurring_view: false,
    pick_drop_recurring_edit: false,
    pick_drop_reports_export: false
  },

  BILLING_STAFF: {
    dashboard_view: false,
    invoices_view: true,
    invoices_create: true,
    invoices_edit: false,
    invoices_delete: false,
    invoices_change_number: false,
    invoices_cancel: false,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: false,
    invoices_email: false,
    customers_view: true,
    customers_create: true,
    customers_edit: false,
    customers_delete: false,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: false,
    pets_checkin_checkout: true,
    boarding_view: false,
    boarding_manage: false,
    payments_view: false,
    payments_record: false,
    payments_delete: false,
    gst_reports_view: false,
    gst_reports_export: false,
    excel_db_view: false,
    excel_db_export: false,
    excel_db_restore: false,
    import_engine_view: false,
    import_engine_execute: false,
    audit_logs_view: false,
    communication_center_view: false,
    receipt_share: false,
    statement_share: false,
    user_management_view: false,
    user_management_edit: false,
    user_management_permissions: false,
    user_management_reset_password: false,
    settings_view: false,
    settings_edit: false,
    settings_factory_reset: false,
    reports_view: false,
    reports_export: false,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: false,
    pick_drop_delete: false,
    pick_drop_assign: false,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: false,
    pick_drop_reports_view: false,
    pick_drop_recurring_view: false,
    pick_drop_recurring_edit: false,
    pick_drop_reports_export: false,
    service_catalog_view: true,
    service_catalog_edit: false,
    service_catalog_delete: false,
    package_master_view: true,
    package_master_edit: false,
    package_master_delete: false,
    monthly_package_view: true,
    monthly_package_manage: false,
    monthly_package_delete: false
  },

  MANAGER: {
    dashboard_view: true,
    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: false,
    invoices_change_number: false,
    invoices_cancel: false,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: true,
    invoices_email: true,
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: false,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: false,
    pets_checkin_checkout: true,
    boarding_view: true,
    boarding_manage: true,
    payments_view: true,
    payments_record: true,
    payments_delete: false,
    gst_reports_view: false,
    gst_reports_export: false,
    excel_db_view: false,
    excel_db_export: false,
    excel_db_restore: false,
    import_engine_view: false,
    import_engine_execute: false,
    audit_logs_view: false,
    communication_center_view: true,
    receipt_share: true,
    statement_share: true,
    user_management_view: false,
    user_management_edit: false,
    user_management_permissions: false,
    user_management_reset_password: false,
    settings_view: false,
    settings_edit: false,
    settings_factory_reset: false,
    reports_view: true,
    reports_export: false,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: true,
    pick_drop_delete: false,
    pick_drop_assign: true,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: false,
    pick_drop_reports_view: true,
    pick_drop_recurring_view: true,
    pick_drop_recurring_edit: true,
    pick_drop_reports_export: false
  },

  RECEPTION: {
    dashboard_view: true,
    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: false,
    invoices_change_number: false,
    invoices_cancel: false,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: false,
    invoices_email: false,
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: false,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: false,
    pets_checkin_checkout: true,
    boarding_view: true,
    boarding_manage: false,
    payments_view: true,
    payments_record: true,
    payments_delete: false,
    gst_reports_view: false,
    gst_reports_export: false,
    excel_db_view: false,
    excel_db_export: false,
    excel_db_restore: false,
    import_engine_view: false,
    import_engine_execute: false,
    audit_logs_view: false,
    communication_center_view: true,
    receipt_share: true,
    statement_share: true,
    user_management_view: false,
    user_management_edit: false,
    user_management_permissions: false,
    user_management_reset_password: false,
    settings_view: false,
    settings_edit: false,
    settings_factory_reset: false,
    reports_view: false,
    reports_export: false,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: false,
    pick_drop_delete: false,
    pick_drop_assign: false,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: false,
    pick_drop_reports_view: false,
    pick_drop_recurring_view: false,
    pick_drop_recurring_edit: false,
    pick_drop_reports_export: false
  },

  BILLING_USER: {
    dashboard_view: true,
    invoices_view: true,
    invoices_create: true,
    invoices_edit: true,
    invoices_delete: false,
    invoices_change_number: false,
    invoices_cancel: false,
    invoices_download_pdf: true,
    invoices_print: true,
    invoices_whatsapp: true,
    invoices_email: true,
    customers_view: true,
    customers_create: true,
    customers_edit: true,
    customers_delete: false,
    pets_view: true,
    pets_create: true,
    pets_edit: true,
    pets_delete: false,
    pets_checkin_checkout: true,
    boarding_view: true,
    boarding_manage: false,
    payments_view: true,
    payments_record: true,
    payments_delete: false,
    gst_reports_view: false,
    gst_reports_export: false,
    excel_db_view: false,
    excel_db_export: false,
    excel_db_restore: false,
    import_engine_view: false,
    import_engine_execute: false,
    audit_logs_view: false,
    communication_center_view: true,
    receipt_share: true,
    statement_share: true,
    user_management_view: false,
    user_management_edit: false,
    user_management_permissions: false,
    user_management_reset_password: false,
    settings_view: false,
    settings_edit: false,
    settings_factory_reset: false,
    reports_view: false,
    reports_export: false,
    pick_drop_view: true,
    pick_drop_create: true,
    pick_drop_edit: false,
    pick_drop_delete: false,
    pick_drop_assign: false,
    pick_drop_status_update: true,
    pick_drop_pricing_view: true,
    pick_drop_pricing_edit: false,
    pick_drop_reports_view: false,
    pick_drop_recurring_view: false,
    pick_drop_recurring_edit: false,
    pick_drop_reports_export: false
  }
};

export interface EffectivePermissionDetail {
  effective: boolean;
  roleDefault: boolean;
  isOverridden: boolean;
  source: 'ROLE_DEFAULT' | 'USER_OVERRIDE';
  state: 'ALLOWED' | 'DENIED';
  overrideState: 'DEFAULT' | 'ALLOWED' | 'DENIED';
}

/**
 * Single Authoritative Evaluator for Effective Permissions
 */
export function getEffectivePermissionDetails(user: User | null | undefined, actionKey: string): EffectivePermissionDetail {
  if (!user) {
    return {
      effective: false,
      roleDefault: false,
      isOverridden: false,
      source: 'ROLE_DEFAULT',
      state: 'DENIED',
      overrideState: 'DEFAULT'
    };
  }

  // Security Rule: Unknown permission keys return FALSE for ALL roles
  const validKeys = DEFAULT_ROLE_PERMISSIONS.ACCOUNTANT;
  if (!(actionKey in validKeys)) {
    return {
      effective: false,
      roleDefault: false,
      isOverridden: false,
      source: 'ROLE_DEFAULT',
      state: 'DENIED',
      overrideState: 'DEFAULT'
    };
  }

  // ACCOUNTANT & SUPER_ADMIN have full privileges for valid defined permissions
  if (user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') {
    return {
      effective: true,
      roleDefault: true,
      isOverridden: false,
      source: 'ROLE_DEFAULT',
      state: 'ALLOWED',
      overrideState: 'DEFAULT'
    };
  }

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.BILLING_STAFF;
  const roleDefaultVal = roleDefaults[actionKey] ?? false;

  let hasOverride = false;
  let overrideVal = false;

  if (user.permissions && user.permissions[actionKey] !== undefined) {
    hasOverride = true;
    overrideVal = user.permissions[actionKey];
  }

  const effectiveVal = hasOverride ? overrideVal : roleDefaultVal;

  return {
    effective: effectiveVal,
    roleDefault: roleDefaultVal,
    isOverridden: hasOverride,
    source: hasOverride ? 'USER_OVERRIDE' : 'ROLE_DEFAULT',
    state: effectiveVal ? 'ALLOWED' : 'DENIED',
    overrideState: !hasOverride ? 'DEFAULT' : overrideVal ? 'ALLOWED' : 'DENIED'
  };
}

/**
 * Check if a user has permission for a specific action key, considering user-specific overrides.
 */
export function hasPermission(user: User | null | undefined, actionKey: string): boolean {
  return getEffectivePermissionDetails(user, actionKey).effective;
}
