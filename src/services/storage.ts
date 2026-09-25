import { Product, Sale, StockMovement } from '../types';
import {
  getSupabaseClient,
  syncProductsWithSupabase,
  syncSalesWithSupabase,
  syncMovementsWithSupabase,
} from './supabase';

const STORAGE_KEY_PRODUCTS = 'supermarket_products';
const STORAGE_KEY_SALES = 'supermarket_sales';
const STORAGE_KEY_MOVEMENTS = 'supermarket_movements';

// 1. Initial State: STRICTLY EMPTY (No mock data, per user instructions: "(não crie informações modelo)")
export const getLocalProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler produtos locais:', err);
  }
  return [];
};

export const setLocalProducts = (products: Product[]): void => {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
};

export const getLocalSales = (): Sale[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler vendas locais:', err);
  }
  return [];
};

export const setLocalSales = (sales: Sale[]): void => {
  localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
};

export const getLocalMovements = (): StockMovement[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler movimentações locais:', err);
  }
  return [];
};

export const setLocalMovements = (movements: StockMovement[]): void => {
  localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
};

// Unified Data Fetchers
export const fetchAllProducts = async (): Promise<Product[]> => {
  const local = getLocalProducts();
  const remote = await syncProductsWithSupabase(local);
  if (remote) {
    setLocalProducts(remote);
    return remote;
  }
  return local;
};

export const fetchAllSales = async (): Promise<Sale[]> => {
  const local = getLocalSales();
  const remote = await syncSalesWithSupabase(local);
  if (remote) {
    setLocalSales(remote);
    return remote;
  }
  return local;
};

export const fetchAllMovements = async (): Promise<StockMovement[]> => {
  const local = getLocalMovements();
  const remote = await syncMovementsWithSupabase(local);
  if (remote) {
    setLocalMovements(remote);
    return remote;
  }
  return local;
};

// CRUD Operations
export const saveProductToStore = async (product: Product): Promise<void> => {
  const products = getLocalProducts();
  const index = products.findIndex((p) => p.id === product.id);

  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }

  setLocalProducts(products);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('produtos').upsert(product);
    } catch (err) {
      console.warn('Erro ao salvar produto no Supabase:', err);
    }
  }
};

export const deleteProductFromStore = async (id: string): Promise<void> => {
  const products = getLocalProducts().filter((p) => p.id !== id);
  setLocalProducts(products);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('produtos').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao remover produto no Supabase:', err);
    }
  }
};

export const saveSaleToStore = async (sale: Sale): Promise<void> => {
  const sales = getLocalSales();
  sales.unshift(sale); // Most recent first
  setLocalSales(sales);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('vendas').insert(sale);
    } catch (err) {
      console.warn('Erro ao salvar venda no Supabase:', err);
    }
  }
};

export const cancelSaleInStore = async (saleId: string): Promise<Sale | null> => {
  const sales = getLocalSales();
  const sale = sales.find((s) => s.id === saleId);
  if (!sale || sale.status === 'cancelada') return null;

  sale.status = 'cancelada';
  setLocalSales(sales);

  // Return items to inventory
  const products = getLocalProducts();
  const movements = getLocalMovements();

  for (const item of sale.items) {
    const product = products.find((p) => p.id === item.product_id);
    if (product) {
      const prev = product.current_stock;
      product.current_stock += item.quantity;
      product.updated_at = new Date().toISOString();

      const mov: StockMovement = {
        id: crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}_${Math.random()}`,
        product_id: product.id,
        product_name: product.name,
        type: 'cancelamento_venda',
        quantity: item.quantity,
        previous_stock: prev,
        new_stock: product.current_stock,
        reason: `Estorno de venda #${sale.sale_number}`,
        date: new Date().toISOString(),
        reference_id: sale.id,
      };
      movements.unshift(mov);
    }
  }

  setLocalProducts(products);
  setLocalMovements(movements);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('vendas').update({ status: 'cancelada' }).eq('id', saleId);
      await client.from('produtos').upsert(products);
      await client.from('movimentacoes_estoque').upsert(movements);
    } catch (err) {
      console.warn('Erro ao atualizar cancelamento no Supabase:', err);
    }
  }

  return sale;
};

export const saveMovementToStore = async (movement: StockMovement): Promise<void> => {
  const movements = getLocalMovements();
  movements.unshift(movement);
  setLocalMovements(movements);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('movimentacoes_estoque').insert(movement);
    } catch (err) {
      console.warn('Erro ao salvar movimentação no Supabase:', err);
    }
  }
};
