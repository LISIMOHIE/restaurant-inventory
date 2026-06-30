export type UserRole = 'admin' | 'manager' | 'staff';
export type TransactionType = 'purchase' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'consumption' | 'waste' | 'return';
export type POStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

export interface Branch {
  id: string;
  name: string;
  name_ar: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  name_ar: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  parent_id: string | null;
  color: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  name_ar: string | null;
  category_id: string | null;
  supplier_id: string | null;
  unit: string;
  unit_ar: string | null;
  price: number;
  reorder_level: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  supplier?: Supplier;
}

export interface Inventory {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  last_counted_at: string | null;
  last_counted_by: string | null;
  updated_at: string;
  product?: Product;
  branch?: Branch;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  branch_id: string;
  type: TransactionType;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  product?: Product;
  branch?: Branch;
  performer?: Profile;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  branch_id: string;
  status: POStatus;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  branch?: Branch;
  items?: PurchaseOrderItem[];
  creator?: Profile;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  is_received: boolean;
  notes: string | null;
  created_at: string;
  product?: Product;
}

export interface LowStockAlert {
  product_id: string;
  name: string;
  name_ar: string | null;
  reorder_level: number;
  unit: string;
  category: string;
  supplier: string;
  branch_id: string;
  branch: string;
  current_quantity: number;
  shortage: number;
}

export interface InventoryValuation {
  branch_id: string;
  branch: string;
  category: string;
  total_value: number;
  product_count: number;
  zero_stock_count: number;
  low_stock_count: number;
}

export interface DashboardStats {
  total_products: number;
  total_branches: number;
  total_suppliers: number;
  active_purchase_orders: number;
  low_stock_count: number;
  total_inventory_value: number;
  recent_transactions: InventoryTransaction[];
  low_stock_alerts: LowStockAlert[];
  valuation_by_branch: InventoryValuation[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
