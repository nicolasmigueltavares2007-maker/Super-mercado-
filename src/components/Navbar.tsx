import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Receipt,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SupabaseConfig } from '../types';

export type ActiveModule = 'dashboard' | 'estoque' | 'vendas' | 'historico';

interface NavbarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseModal: () => void;
  lowStockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  onSelectModule,
  supabaseConfig,
  onOpenSupabaseModal,
  lowStockCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Brand wordmark (single text element) */}
          <div className="flex items-center gap-3">
            <span
              onClick={() => onSelectModule('dashboard')}
              className="text-lg font-bold tracking-tight text-neutral-900 cursor-pointer select-none hover:text-emerald-700 transition-colors"
            >
              Supermercado Gestão
            </span>
          </div>

          {/* Zone 2: Navigation Links (single line, clean tabs) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectModule('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeModule === 'dashboard'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectModule('estoque')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap relative ${
                activeModule === 'estoque'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Boxes className="w-4 h-4 shrink-0" />
              <span>Estoque</span>
              {lowStockCount > 0 && (
                <span
                  title={`${lowStockCount} produto(s) com estoque baixo ou zerado`}
                  className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full ml-0.5"
                >
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectModule('vendas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeModule === 'vendas'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Frente de Caixa</span>
            </button>

            <button
              onClick={() => onSelectModule('historico')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeModule === 'historico'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Histórico</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action (Supabase Integration Status & Config) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSupabaseModal}
              title={
                supabaseConfig.isConnected
                  ? 'Supabase Conectado - Clique para gerenciar'
                  : 'Modo Local Ativo - Clique para conectar ao Supabase'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                supabaseConfig.isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {supabaseConfig.isConnected ? 'Supabase Conectado' : 'Conectar Supabase'}
              </span>
              <span className="sm:hidden">
                {supabaseConfig.isConnected ? 'Supabase' : 'Conectar'}
              </span>
              {supabaseConfig.isConnected ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
