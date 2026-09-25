export type ProductCategory =
  | 'Mercearia'
  | 'Hortifruti'
  | 'Carnes e Aves'
  | 'Laticínios e Frios'
  | 'Bebidas'
  | 'Padaria e Confeitaria'
  | 'Higiene Pessoal'
  | 'Limpeza'
  | 'Congelados'
  | 'Doces e Snacks'
  | 'Pet Shop'
  | 'Bazar e Utilidades'
  | 'Outros';

export type ProductUnit = 'un' | 'kg' | 'g' | 'lt' | 'ml' | 'pct' | 'cx' | 'dz';

export interface Product {
  id: string;
  code: string; // Código de Barras / SKU / EAN
  name: string;
  category: ProductCategory | string;
  unit: ProductUnit | string;
  cost_price: number; // Preço de Custo
  sale_price: number; // Preço de Venda
  current_stock: number; // Estoque Atual
  min_stock: number; // Estoque Mínimo para Alerta
  supplier?: string; // Fornecedor
  expiration_date?: string; // Data de Validade YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'outros';

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  total_price: number;
  total_cost: number;
  profit: number;
}

export interface Sale {
  id: string;
  sale_number: number;
  date: string; // ISO
  customer_name?: string;
  customer_doc?: string; // CPF
  payment_method: PaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  change: number;
  total_cost: number;
  gross_profit: number;
  status: 'concluida' | 'cancelada';
  items: SaleItem[];
  notes?: string;
}

export type MovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento_venda';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  date: string;
  reference_id?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSynced?: string;
}
