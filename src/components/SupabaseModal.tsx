import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  X,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';
import { SupabaseConfig, Product, Sale, StockMovement } from '../types';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  getSupabaseSqlScript,
  getSupabaseClient,
} from '../services/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  onConfigUpdated: (config: SupabaseConfig) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  products,
  sales,
  movements,
  onConfigUpdated,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tablesExist?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      setTestResult(null);
      setSyncMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    setTesting(true);
    const result = await testSupabaseConnection(trimmedUrl, trimmedKey);
    setTesting(false);
    setTestResult(result);

    const isConn = result.success;
    const newConfig: SupabaseConfig = {
      url: trimmedUrl,
      anonKey: trimmedKey,
      isConnected: isConn,
      lastSynced: isConn ? new Date().toISOString() : undefined,
    };

    saveSupabaseConfig(newConfig);
    onConfigUpdated(newConfig);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseSqlScript());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSyncToSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setSyncMessage('Supabase não conectado. Conecte primeiro antes de sincronizar.');
      return;
    }

    setSyncing(true);
    setSyncMessage(null);

    try {
      let prodCount = 0;
      let salesCount = 0;
      let movCount = 0;

      if (products.length > 0) {
        const { error: pErr } = await client.from('produtos').upsert(products);
        if (pErr) throw pErr;
        prodCount = products.length;
      }

      if (sales.length > 0) {
        const { error: sErr } = await client.from('vendas').upsert(sales);
        if (sErr) throw sErr;
        salesCount = sales.length;
      }

      if (movements.length > 0) {
        const { error: mErr } = await client.from('movimentacoes_estoque').upsert(movements);
        if (mErr) throw mErr;
        movCount = movements.length;
      }

      setSyncMessage(
        `Sincronização concluída com sucesso! Enviados: ${prodCount} produtos, ${salesCount} vendas e ${movCount} movimentações.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na sincronização';
      setSyncMessage(`Erro ao sincronizar: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Conectar ao Supabase
              </h2>
              <p className="text-xs text-neutral-500">
                Armazenamento em nuvem PostgreSQL em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Instructions */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-800 text-xs uppercase tracking-wide">
                Passo a passo rápido
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Abrir Supabase <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <ol className="text-xs text-neutral-600 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Acesse seu projeto no Supabase e vá em <strong>Project Settings &gt; API</strong></li>
              <li>Copie a <strong>Project URL</strong> e a <strong>anon public key</strong> e cole nos campos abaixo</li>
              <li>No painel do Supabase, abra o <strong>SQL Editor</strong>, cole o script SQL fornecido abaixo e clique em <strong>Run</strong></li>
              <li>Clique em <strong>Testar Conexão</strong> e depois em <strong>Salvar Configuração</strong></li>
            </ol>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Project URL do Supabase
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo-seu-projeto.supabase.co"
                className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-neutral-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Anon Public Key (Chave Pública)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-neutral-800"
              />
            </div>
          </div>

          {/* Test Status Message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.success ? 'Sucesso' : 'Falha na Conexão'}</p>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Sync Message */}
          {syncMessage && (
            <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-800 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* SQL Script Section */}
          <div className="border border-neutral-200 rounded-lg p-3.5 bg-neutral-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">
                Script SQL para criar as tabelas no Supabase
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-md transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </>
                )}
              </button>
            </div>
            <div className="bg-neutral-900 text-neutral-200 p-3 rounded-md font-mono text-xs max-h-36 overflow-y-auto whitespace-pre">
              {getSupabaseSqlScript()}
            </div>
            <p className="text-[11px] text-neutral-500">
              Copie e cole este código no <strong>SQL Editor</strong> do seu Supabase para criar as tabelas `produtos`, `vendas` e `movimentacoes_estoque`.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50/70">
          <button
            type="button"
            onClick={handleSyncToSupabase}
            disabled={syncing || !url || !anonKey}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 disabled:opacity-50 transition-colors"
            title="Envia produtos e vendas cadastrados localmente para a base do Supabase"
          >
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            Enviar Dados Locais para Nuvem
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !url || !anonKey}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 disabled:opacity-50 transition-colors"
            >
              {testing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Testar Conexão
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={testing || !url}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
            >
              Salvar e Ativar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
