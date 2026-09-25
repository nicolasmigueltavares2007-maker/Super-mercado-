import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, StockMovement, SupabaseConfig } from '../types';

const STORAGE_KEY_CONFIG = 'supermarket_supabase_config';

export const getStoredSupabaseConfig = (): SupabaseConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore error
  }

  // Fallback to env variables if available
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: false,
  };
};

export const saveSupabaseConfig = (config: SupabaseConfig): void => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

let clientInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    clientInstance = null;
    return null;
  }

  const key = `${config.url}_${config.anonKey}`;
  if (clientInstance && currentConfigKey === key) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(config.url, config.anonKey);
    currentConfigKey = key;
    return clientInstance;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
};

export const testSupabaseConnection = async (
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string; tablesExist?: boolean }> => {
  if (!url || !anonKey) {
    return { success: false, message: 'URL e Chave Anon são obrigatórios.' };
  }

  try {
    const testClient = createClient(url, anonKey);
    // Try to query produtos table
    const { data: _data, error } = await testClient.from('produtos').select('id').limit(1);

    if (error) {
      // If table doesn't exist yet, connection is still valid but schema is missing
      if (error.code === '42P01' || error.message.includes('relation "produtos" does not exist') || error.message.includes('not found')) {
        return {
          success: true,
          message: 'Conectado com sucesso ao Supabase! As tabelas ainda precisam ser criadas executando o script SQL fornecido abaixo.',
          tablesExist: false,
        };
      }
      return {
        success: false,
        message: `Falha na conexão: ${error.message} (Código: ${error.code})`,
      };
    }

    return {
      success: true,
      message: 'Conexão estabelecida com sucesso e tabelas verificadas!',
      tablesExist: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      success: false,
      message: `Erro ao conectar: ${message}`,
    };
  }
};

export const getSupabaseSqlScript = (): string => {
  return `-- =======================================================
-- SCRIPT COMPLETO DE BANCO DE DADOS E ARMAZENAMENTO (SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase
-- =======================================================

-- 1. TABELA DE PRODUTOS / ESTOQUE
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  min_stock NUMERIC(12, 3) NOT NULL DEFAULT 5.000,
  supplier TEXT,
  expiration_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number BIGSERIAL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  customer_name TEXT,
  customer_doc TEXT,
  payment_method TEXT NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  change NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'concluida',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT
);

-- 3. TABELA DE MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste', 'venda', 'cancelamento_venda'
  quantity NUMERIC(12, 3) NOT NULL,
  previous_stock NUMERIC(12, 3) NOT NULL,
  new_stock NUMERIC(12, 3) NOT NULL,
  reason TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reference_id TEXT
);

-- 4. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_code ON public.produtos (code);
CREATE INDEX IF NOT EXISTS idx_produtos_name ON public.produtos (name);
CREATE INDEX IF NOT EXISTS idx_produtos_category ON public.produtos (category);
CREATE INDEX IF NOT EXISTS idx_vendas_date ON public.vendas (date DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas (status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_date ON public.movimentacoes_estoque (date DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_prod ON public.movimentacoes_estoque (product_id);

-- 5. TRIGGER PARA ATUALIZAR AUTOMATICAMENTE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_produtos_updated_at ON public.produtos;
CREATE TRIGGER trigger_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. HABILITAR ROW LEVEL SECURITY (RLS) NAS TABELAS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE ACESSO RLS (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
    -- PRODUTOS
    DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;
    CREATE POLICY "produtos_select_policy" ON public.produtos FOR SELECT USING (true);

    DROP POLICY IF EXISTS "produtos_insert_policy" ON public.produtos;
    CREATE POLICY "produtos_insert_policy" ON public.produtos FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "produtos_update_policy" ON public.produtos;
    CREATE POLICY "produtos_update_policy" ON public.produtos FOR UPDATE USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "produtos_delete_policy" ON public.produtos;
    CREATE POLICY "produtos_delete_policy" ON public.produtos FOR DELETE USING (true);

    -- VENDAS
    DROP POLICY IF EXISTS "vendas_select_policy" ON public.vendas;
    CREATE POLICY "vendas_select_policy" ON public.vendas FOR SELECT USING (true);

    DROP POLICY IF EXISTS "vendas_insert_policy" ON public.vendas;
    CREATE POLICY "vendas_insert_policy" ON public.vendas FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "vendas_update_policy" ON public.vendas;
    CREATE POLICY "vendas_update_policy" ON public.vendas FOR UPDATE USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "vendas_delete_policy" ON public.vendas;
    CREATE POLICY "vendas_delete_policy" ON public.vendas FOR DELETE USING (true);

    -- MOVIMENTAÇÕES
    DROP POLICY IF EXISTS "movimentacoes_select_policy" ON public.movimentacoes_estoque;
    CREATE POLICY "movimentacoes_select_policy" ON public.movimentacoes_estoque FOR SELECT USING (true);

    DROP POLICY IF EXISTS "movimentacoes_insert_policy" ON public.movimentacoes_estoque;
    CREATE POLICY "movimentacoes_insert_policy" ON public.movimentacoes_estoque FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "movimentacoes_update_policy" ON public.movimentacoes_estoque;
    CREATE POLICY "movimentacoes_update_policy" ON public.movimentacoes_estoque FOR UPDATE USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "movimentacoes_delete_policy" ON public.movimentacoes_estoque;
    CREATE POLICY "movimentacoes_delete_policy" ON public.movimentacoes_estoque FOR DELETE USING (true);
END $$;

-- 8. CONFIGURAÇÃO DE BUCKET DE ARMAZENAMENTO (STORAGE)
-- Criação do bucket para fotos de produtos, comprovantes e relatórios (RLS já vem ativado por padrão no Supabase)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supermercado-arquivos',
  'supermercado-arquivos',
  true,
  52428800, -- Limite de 50MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/csv'];

-- 9. POLÍTICAS DE ARMAZENAMENTO (STORAGE POLICIES)
-- Políticas para leitura, upload, edição e exclusão de arquivos no bucket 'supermercado-arquivos'
DO $$
BEGIN
    DROP POLICY IF EXISTS "storage_select_public" ON storage.objects;
    CREATE POLICY "storage_select_public" ON storage.objects
      FOR SELECT USING (bucket_id = 'supermercado-arquivos');

    DROP POLICY IF EXISTS "storage_insert_public" ON storage.objects;
    CREATE POLICY "storage_insert_public" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'supermercado-arquivos');

    DROP POLICY IF EXISTS "storage_update_public" ON storage.objects;
    CREATE POLICY "storage_update_public" ON storage.objects
      FOR UPDATE USING (bucket_id = 'supermercado-arquivos');

    DROP POLICY IF EXISTS "storage_delete_public" ON storage.objects;
    CREATE POLICY "storage_delete_public" ON storage.objects
      FOR DELETE USING (bucket_id = 'supermercado-arquivos');
END $$;

-- 10. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_estoque;
`;
};

// Data persistence sync helpers
export const syncProductsWithSupabase = async (
  localProducts: Product[]
): Promise<Product[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Fetch remote products
    const { data, error } = await client
      .from('produtos')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Erro ao buscar produtos no Supabase:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data as Product[];
    } else if (localProducts.length > 0) {
      // If remote is empty but we have local products, push local products to Supabase
      const { error: insertError } = await client.from('produtos').upsert(localProducts);
      if (insertError) {
        console.warn('Erro ao inserir produtos locais no Supabase:', insertError.message);
      }
      return localProducts;
    }
    return [];
  } catch (err) {
    console.error('Falha de sincronização de produtos:', err);
    return null;
  }
};

export const syncSalesWithSupabase = async (
  localSales: Sale[]
): Promise<Sale[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('vendas')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar vendas no Supabase:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data as Sale[];
    } else if (localSales.length > 0) {
      const { error: insertError } = await client.from('vendas').upsert(localSales);
      if (insertError) {
        console.warn('Erro ao inserir vendas locais no Supabase:', insertError.message);
      }
      return localSales;
    }
    return [];
  } catch (err) {
    console.error('Falha de sincronização de vendas:', err);
    return null;
  }
};

export const syncMovementsWithSupabase = async (
  localMovements: StockMovement[]
): Promise<StockMovement[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('movimentacoes_estoque')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar movimentações no Supabase:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data as StockMovement[];
    } else if (localMovements.length > 0) {
      const { error: insertError } = await client
        .from('movimentacoes_estoque')
        .upsert(localMovements);
      if (insertError) {
        console.warn('Erro ao inserir movimentações no Supabase:', insertError.message);
      }
      return localMovements;
    }
    return [];
  } catch (err) {
    console.error('Falha de sincronização de movimentações:', err);
    return null;
  }
};
