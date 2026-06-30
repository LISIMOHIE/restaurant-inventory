import * as XLSX from 'xlsx';
import { Product, Inventory, PurchaseOrder } from '@/types';

export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

// ─── EXPORT FUNCTIONS ─────────────────────────────────────────────

export function exportProductsToExcel(products: (Product & { inventory?: Record<string, number> })[], branches: string[]) {
  const wb = XLSX.utils.book_new();

  // Products sheet
  const productData = products.map(p => ({
    SKU: p.sku || '',
    'Name (EN)': p.name,
    'Name (AR)': p.name_ar || '',
    Category: p.category?.name || '',
    Supplier: p.supplier?.name || '',
    Unit: p.unit,
    'Price (EGP)': p.price,
    'Reorder Level': p.reorder_level,
    Status: p.is_active ? 'Active' : 'Inactive',
  }));
  const ws1 = XLSX.utils.json_to_sheet(productData);
  ws1['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Products');

  // Inventory per branch
  if (branches.length > 0 && products[0]?.inventory) {
    const invData = products.map(p => {
      const row: Record<string, string | number> = {
        'Name (EN)': p.name,
        Unit: p.unit,
        Price: p.price,
      };
      branches.forEach(b => {
        row[b] = p.inventory?.[b] ?? 0;
      });
      return row;
    });
    const ws2 = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Inventory by Branch');
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return buf;
}

export function exportPurchaseOrdersToExcel(orders: PurchaseOrder[]) {
  const wb = XLSX.utils.book_new();

  const orderData = orders.flatMap(po =>
    (po.items || []).map(item => ({
      'PO Number': po.po_number,
      Supplier: po.supplier?.name || '',
      Branch: po.branch?.name || '',
      Status: po.status,
      'Order Date': po.order_date,
      Product: item.product?.name || '',
      Unit: item.product?.unit || '',
      'Qty Ordered': item.quantity_ordered,
      'Qty Received': item.quantity_received,
      'Unit Cost': item.unit_cost,
      'Total Cost': item.total_cost,
      Received: item.is_received ? 'Yes' : 'No',
    }))
  );

  const ws = XLSX.utils.json_to_sheet(orderData);
  ws['!cols'] = Array(13).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

export function exportInventoryValuationToExcel(data: {
  branch: string; category: string; total_value: number;
  product_count: number; zero_stock_count: number; low_stock_count: number;
}[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data.map(d => ({
    Branch: d.branch,
    Category: d.category,
    'Total Value (EGP)': d.total_value,
    'Products Count': d.product_count,
    'Zero Stock': d.zero_stock_count,
    'Low Stock': d.low_stock_count,
  })));
  ws['!cols'] = Array(6).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Valuation');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

// ─── IMPORT FUNCTIONS ─────────────────────────────────────────────

export interface ProductImportRow {
  name: string;
  name_ar?: string;
  category?: string;
  supplier?: string;
  unit: string;
  unit_ar?: string;
  price: number;
  reorder_level?: number;
  sku?: string;
}

export function parseProductImport(buffer: ArrayBuffer): { rows: ProductImportRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

  const rows: ProductImportRow[] = [];
  const errors: string[] = [];

  raw.forEach((row, i) => {
    const name = String(row['Name (EN)'] || row['name'] || row['Name'] || '').trim();
    const price = Number(row['Price (EGP)'] || row['price'] || row['Price'] || 0);

    if (!name) {
      errors.push(`Row ${i + 2}: Missing product name`);
      return;
    }

    rows.push({
      name,
      name_ar: String(row['Name (AR)'] || row['name_ar'] || '').trim() || undefined,
      category: String(row['Category'] || row['category'] || '').trim() || undefined,
      supplier: String(row['Supplier'] || row['supplier'] || '').trim() || undefined,
      unit: String(row['Unit'] || row['unit'] || 'piece').trim(),
      unit_ar: String(row['Unit (AR)'] || row['unit_ar'] || '').trim() || undefined,
      price,
      reorder_level: Number(row['Reorder Level'] || row['reorder_level'] || 0),
      sku: String(row['SKU'] || row['sku'] || '').trim() || undefined,
    });
  });

  return { rows, errors };
}

export interface InventoryImportRow {
  product_name: string;
  branch_name: string;
  quantity: number;
}

export function parseInventoryImport(buffer: ArrayBuffer): { rows: InventoryImportRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

  const rows: InventoryImportRow[] = [];
  const errors: string[] = [];

  raw.forEach((row, i) => {
    const product_name = String(row['Product'] || row['product_name'] || '').trim();
    const branch_name = String(row['Branch'] || row['branch_name'] || '').trim();
    const quantity = Number(row['Quantity'] || row['quantity'] || 0);

    if (!product_name || !branch_name) {
      errors.push(`Row ${i + 2}: Missing product or branch name`);
      return;
    }

    rows.push({ product_name, branch_name, quantity });
  });

  return { rows, errors };
}

export function downloadBlob(buffer: Buffer | ArrayBuffer, filename: string) {
  const uint8 = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength);
  const blob = new Blob([uint8], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
