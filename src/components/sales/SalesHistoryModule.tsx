import React, { useState, useMemo } from 'react';
import {
  Search,
  Receipt,
  Download,
  Eye,
  Printer,
  Calendar,
  DollarSign,
  Ban,
  TrendingUp,
} from 'lucide-react';
import { Sale } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
} from '../../utils/formatters';
import { SaleDetailModal } from './SaleDetailModal';

interface SalesHistoryModuleProps {
  sales: Sale[];
  onCancelSale: (saleId: string) => void;
  onPrintReceipt: (sale: Sale) => void;
  onNavigateToPOS: () => void;
}

type PeriodFilter = 'todas' | 'hoje' | '7dias' | 'mes';

export const SalesHistoryModule: React.FC<SalesHistoryModuleProps> = ({
  sales,
  onCancelSale,
  onPrintReceipt,
  onNavigateToPOS,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todas');
  const [methodFilter, setMethodFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((sale) => {
      // Period filter
      if (periodFilter === 'hoje') {
        if (!sale.date.startsWith(todayStr)) return false;
      } else if (periodFilter === '7dias') {
        const saleDate = new Date(sale.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (periodFilter === 'mes') {
        const saleDate = new Date(sale.date);
        if (
          saleDate.getMonth() !== now.getMonth() ||
          saleDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      }

      // Method filter
      if (methodFilter !== 'todas' && sale.payment_method !== methodFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'todas' && sale.status !== statusFilter) {
        return false;
      }

      // Search term (customer, sale #, items)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesNum = `#${sale.sale_number}`.includes(term) || `${sale.sale_number}`.includes(term);
        const matchesCustomer =
          sale.customer_name && sale.customer_name.toLowerCase().includes(term);
        const matchesDoc =
          sale.customer_doc && sale.customer_doc.toLowerCase().includes(term);
        const matchesItem = sale.items.some((i) =>
          i.product_name.toLowerCase().includes(term)
        );

        if (!matchesNum && !matchesCustomer && !matchesDoc && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [sales, periodFilter, methodFilter, statusFilter, searchTerm]);

  // Aggregate stats
  const historyStats = useMemo(() => {
    let completedTotal = 0;
    let completedProfit = 0;
    let completedCount = 0;
    let canceledCount = 0;

    filteredSales.forEach((s) => {
      if (s.status === 'concluida') {
        completedTotal += s.total;
        completedProfit += s.gross_profit;
        completedCount++;
      } else {
        canceledCount++;
      }
    });

    const averageTicket = completedCount > 0 ? completedTotal / completedCount : 0;

    return {
      completedTotal,
      completedProfit,
      completedCount,
      canceledCount,
      averageTicket,
    };
  }, [filteredSales]);

  const handleExportCsv = () => {
    if (sales.length === 0) return;

    const headers = [
      'Venda Nº',
      'Data/Hora',
      'Cliente',
      'CPF/Doc',
      'Forma Pagamento',
      'Subtotal',
      'Desconto',
      'Total',
      'Custo',
      'Lucro',
      'Status',
    ];

    const rows = filteredSales.map((s) => [
      s.sale_number,
      formatDate(s.date),
      `"${(s.customer_name || '').replace(/"/g, '""')}"`,
      `"${s.customer_doc || ''}"`,
      formatPaymentMethod(s.payment_method),
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      s.total_cost.toFixed(2),
      s.gross_profit.toFixed(2),
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `vendas_supermercado_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Histórico de Vendas
          </h1>
          <p className="text-xs text-neutral-500">
            Consulte todas as operações realizadas, reimprima cupons e gerencie cancelamentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sales.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Vendas</span>
            </button>
          )}

          <button
            onClick={onNavigateToPOS}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <Receipt className="w-4 h-4" />
            <span>Abrir Frente de Caixa</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Total Faturado no Filtro
          </span>
          <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
            {formatCurrency(historyStats.completedTotal)}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Lucro Bruto no Filtro
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {formatCurrency(historyStats.completedProfit)}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Vendas Concluídas
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {historyStats.completedCount}
            </span>
            {historyStats.canceledCount > 0 && (
              <span className="text-xs text-red-600 font-mono">
                ({historyStats.canceledCount} canceladas)
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Ticket Médio
          </span>
          <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
            {formatCurrency(historyStats.averageTicket)}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nº da venda, cliente ou produto..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Selects */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todas">Todo o Período</option>
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="mes">Este Mês</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todas">Todos os Pagamentos</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todas">Todos os Status</option>
            <option value="concluida">Apenas Concluídas</option>
            <option value="cancelada">Apenas Canceladas</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Receipt className="w-6 h-6" />
            </div>
            {sales.length === 0 ? (
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Nenhuma venda realizada ainda
                </h3>
                <p className="text-xs text-neutral-500">
                  As vendas finalizadas na Frente de Caixa aparecerão listadas aqui com detalhes de faturamento, lucro e itens.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onNavigateToPOS}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Realizar Primeira Venda</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Nenhuma venda encontrada com os filtros selecionados
                </h3>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPeriodFilter('todas');
                    setMethodFilter('todas');
                    setStatusFilter('todas');
                  }}
                  className="text-xs text-emerald-700 hover:underline font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Venda Nº</th>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-center">Itens</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Lucro Bruto</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      sale.status === 'cancelada' ? 'opacity-60 bg-neutral-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      #{sale.sale_number}
                    </td>

                    <td className="py-3 px-4 font-mono text-neutral-600 whitespace-nowrap">
                      {formatDate(sale.date)}
                    </td>

                    <td className="py-3 px-4 text-neutral-800">
                      {sale.customer_name || 'Consumidor'}
                    </td>

                    <td className="py-3 px-4 text-neutral-700 whitespace-nowrap">
                      {formatPaymentMethod(sale.payment_method)}
                    </td>

                    <td className="py-3 px-4 text-center font-mono tabular-nums">
                      {sale.items.reduce((acc, i) => acc + i.quantity, 0)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(sale.total)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums whitespace-nowrap font-medium">
                      {formatCurrency(sale.gross_profit)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {sale.status === 'concluida' ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Concluída
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                          Cancelada
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          title="Ver detalhes da venda"
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintReceipt(sale)}
                          title="Reimprimir Cupom"
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
        onPrintReceipt={onPrintReceipt}
        onCancelSale={onCancelSale}
      />
    </div>
  );
};
