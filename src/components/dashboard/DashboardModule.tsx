import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Calendar,
  CreditCard,
  QrCode,
  Banknote,
  ArrowUpRight,
  Download,
  Printer,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Product, Sale } from '../../types';
import { formatCurrency, formatNumber, formatDateOnly } from '../../utils/formatters';

interface DashboardModuleProps {
  products: Product[];
  sales: Sale[];
  onNavigateToStock: () => void;
  onNavigateToPOS: () => void;
}

type DashboardPeriod = 'hoje' | '7dias' | '30dias' | 'tudo';

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  products,
  sales,
  onNavigateToStock,
  onNavigateToPOS,
}) => {
  const [period, setPeriod] = useState<DashboardPeriod>('tudo');

  // Filter sales based on selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((sale) => {
      if (sale.status !== 'concluida') return false;

      if (period === 'hoje') {
        return sale.date.startsWith(todayStr);
      }
      if (period === '7dias') {
        const saleDate = new Date(sale.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (period === '30dias') {
        const saleDate = new Date(sale.date);
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }, [sales, period]);

  // Financial KPIs
  const financialStats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalItemsSold = 0;

    filteredSales.forEach((s) => {
      totalRevenue += s.total;
      totalCost += s.total_cost;
      totalDiscount += s.discount;
      s.items.forEach((item) => {
        totalItemsSold += item.quantity;
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const averageTicket =
      filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      totalDiscount,
      totalSalesCount: filteredSales.length,
      totalItemsSold,
      averageTicket,
    };
  }, [filteredSales]);

  // Inventory KPIs
  const inventoryStats = useMemo(() => {
    let totalStockItems = 0;
    let costValuation = 0;
    let saleValuation = 0;
    const lowStockList: Product[] = [];
    const outOfStockList: Product[] = [];

    products.forEach((p) => {
      totalStockItems += p.current_stock;
      costValuation += p.current_stock * p.cost_price;
      saleValuation += p.current_stock * p.sale_price;

      if (p.current_stock <= 0) {
        outOfStockList.push(p);
      } else if (p.current_stock <= p.min_stock) {
        lowStockList.push(p);
      }
    });

    return {
      uniqueProducts: products.length,
      totalStockItems,
      costValuation,
      saleValuation,
      projectedProfit: saleValuation - costValuation,
      lowStockList,
      outOfStockList,
    };
  }, [products]);

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {
      dinheiro: { count: 0, total: 0 },
      pix: { count: 0, total: 0 },
      cartao_credito: { count: 0, total: 0 },
      cartao_debito: { count: 0, total: 0 },
      outros: { count: 0, total: 0 },
    };

    filteredSales.forEach((s) => {
      const method = s.payment_method || 'outros';
      if (!map[method]) map[method] = { count: 0, total: 0 };
      map[method].count += 1;
      map[method].total += s.total;
    });

    const totalRev = financialStats.totalRevenue || 1;

    return Object.entries(map).map(([key, data]) => ({
      key,
      name:
        key === 'dinheiro'
          ? 'Dinheiro'
          : key === 'pix'
          ? 'PIX'
          : key === 'cartao_credito'
          ? 'Cartão de Crédito'
          : key === 'cartao_debito'
          ? 'Cartão de Débito'
          : 'Outros',
      count: data.count,
      total: data.total,
      percentage: (data.total / totalRev) * 100,
    }));
  }, [filteredSales, financialStats.totalRevenue]);

  // Top Products Ranking
  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        unit: string;
        qtySold: number;
        revenue: number;
        profit: number;
      }
    >();

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const existing = map.get(item.product_id);
        if (existing) {
          existing.qtySold += item.quantity;
          existing.revenue += item.total_price;
          existing.profit += item.profit;
        } else {
          map.set(item.product_id, {
            id: item.product_id,
            name: item.product_name,
            code: item.product_code,
            unit: item.unit,
            qtySold: item.quantity,
            revenue: item.total_price,
            profit: item.profit,
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { revenue: number; itemsSold: number }>();

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        // find category in products
        const prod = products.find((p) => p.id === item.product_id);
        const cat = prod?.category || 'Outros';
        const curr = map.get(cat) || { revenue: 0, itemsSold: 0 };
        curr.revenue += item.total_price;
        curr.itemsSold += item.quantity;
        map.set(cat, curr);
      });
    });

    const totalRev = financialStats.totalRevenue || 1;

    return Array.from(map.entries())
      .map(([category, val]) => ({
        category,
        revenue: val.revenue,
        itemsSold: val.itemsSold,
        percentage: (val.revenue / totalRev) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products, financialStats.totalRevenue]);

  // Sales by Day (recent 7 days)
  const salesByDay = useMemo(() => {
    const daysMap: Record<string, { date: string; label: string; total: number; count: number }> = {};
    const now = new Date();

    // Populate last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daysMap[key] = {
        date: key,
        label: `${dayName} (${dayNum})`,
        total: 0,
        count: 0,
      };
    }

    filteredSales.forEach((s) => {
      const key = s.date.split('T')[0];
      if (daysMap[key]) {
        daysMap[key].total += s.total;
        daysMap[key].count += 1;
      }
    });

    return Object.values(daysMap);
  }, [filteredSales]);

  const maxDayTotal = useMemo(() => {
    const max = Math.max(...salesByDay.map((d) => d.total));
    return max > 0 ? max : 100;
  }, [salesByDay]);

  const handleExportSummaryCsv = () => {
    const rows = [
      ['RELATÓRIO GERENCIAL - SUPERMERCADO GESTÃO'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Período', period.toUpperCase()],
      [''],
      ['INDICADOR', 'VALOR'],
      ['Faturamento Bruto', financialStats.totalRevenue.toFixed(2)],
      ['Custo dos Produtos Vendidos', financialStats.totalCost.toFixed(2)],
      ['Lucro Bruto', financialStats.grossProfit.toFixed(2)],
      ['Margem de Lucro %', `${financialStats.profitMargin.toFixed(1)}%`],
      ['Total de Vendas Realizadas', financialStats.totalSalesCount],
      ['Ticket Médio', financialStats.averageTicket.toFixed(2)],
      ['Valor do Estoque a Custo', inventoryStats.costValuation.toFixed(2)],
      ['Valor do Estoque a Venda', inventoryStats.saleValuation.toFixed(2)],
      ['Itens com Estoque Baixo', inventoryStats.lowStockList.length],
      ['Itens Esgotados', inventoryStats.outOfStockList.length],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((e) => e.join(';')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `relatorio_dashboard_${period}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Dashboard & Relatórios Gerenciais
          </h1>
          <p className="text-xs text-neutral-500">
            Relatórios e métricas calculados a partir dos produtos e vendas cadastrados no sistema
          </p>
        </div>

        {/* Period Selector Tabs and Print/Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-0.5 bg-white border border-neutral-300 rounded-lg shadow-2xs">
            <button
              onClick={() => setPeriod('hoje')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === 'hoje'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7dias')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === '7dias'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('30dias')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === '30dias'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriod('tudo')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === 'tudo'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={handleExportSummaryCsv}
            title="Exportar dados resumidos em CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Faturamento ({period.toUpperCase()})</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {formatCurrency(financialStats.totalRevenue)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1">
            <span>Vendas:</span>
            <strong className="text-neutral-800 font-mono">
              {financialStats.totalSalesCount} transações
            </strong>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Lucro Bruto Real</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {formatCurrency(financialStats.grossProfit)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
            <span>Margem real:</span>
            <strong className="text-emerald-700">
              {financialStats.profitMargin.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Ticket Médio por Venda</span>
            <ShoppingCart className="w-4 h-4 text-neutral-700" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {formatCurrency(financialStats.averageTicket)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
            <span>Itens vendidos:</span>
            <strong className="text-neutral-800">
              {formatNumber(financialStats.totalItemsSold, 0)} un/kg
            </strong>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Valor do Estoque (Custo)</span>
            <Boxes className="w-4 h-4 text-neutral-700" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {formatCurrency(inventoryStats.costValuation)}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
            <span>Valor a venda:</span>
            <strong className="text-neutral-800">
              {formatCurrency(inventoryStats.saleValuation)}
            </strong>
          </div>
        </div>
      </div>

      {/* Zero Registered Data State (Prompt says: não crie informações modelo) */}
      {products.length === 0 && sales.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-neutral-900">
              Sistema limpo pronto para os seus cadastros
            </h3>
            <p className="text-xs text-neutral-500">
              Conforme solicitado, não há dados de modelo pré-carregados. Todos os gráficos, indicadores e relatórios serão preenchidos conforme você cadastrar seus produtos e registrar vendas.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToStock}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Section: Daily Sales Histogram Chart + Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Sales Chart (Cols 7 on lg) */}
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Faturamento Diário dos Últimos 7 Dias
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Evolução das vendas registradas no período recente
                  </p>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="pt-2">
                <div className="h-44 flex items-end gap-2 sm:gap-4 justify-between border-b border-neutral-200 pb-2">
                  {salesByDay.map((day) => {
                    const heightPercent =
                      maxDayTotal > 0 ? (day.total / maxDayTotal) * 100 : 0;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-semibold text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded whitespace-nowrap mb-1">
                          {formatCurrency(day.total)}
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[42px] bg-neutral-100 rounded-t-md relative flex items-end overflow-hidden h-32">
                          <div
                            style={{ height: `${Math.max(heightPercent, 2)}%` }}
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              day.total > 0
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-neutral-200'
                            }`}
                          />
                        </div>

                        {/* Day label */}
                        <span className="text-[10px] text-neutral-500 font-mono text-center truncate w-full">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payment Method Breakdown (Cols 5 on lg) */}
            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Vendas por Forma de Pagamento
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Distribuição da receita arrecadada
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {paymentBreakdown.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-neutral-800 flex items-center gap-1.5">
                        {item.name}
                        <span className="text-neutral-400 font-mono text-[11px]">
                          ({item.count}x)
                        </span>
                      </span>
                      <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                        {formatCurrency(item.total)} ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Top Selling Products + Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Products (Cols 7 on lg) */}
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Produtos Mais Vendidos (Top Produtos)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Ranking por receita e quantidade comercializada
                  </p>
                </div>
              </div>

              {topProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Nenhuma venda realizada no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3 text-right">Qtd Vendida</th>
                        <th className="py-2.5 px-3 text-right">Receita Total</th>
                        <th className="py-2.5 px-3 text-right">Lucro Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {topProducts.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-neutral-50/70">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-neutral-900">
                              {idx + 1}. {p.name}
                            </span>
                            <span className="block text-[10px] font-mono text-neutral-400">
                              {p.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700">
                            {p.qtySold} {p.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-neutral-900">
                            {formatCurrency(p.revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums text-emerald-700">
                            {formatCurrency(p.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Category Distribution (Cols 5 on lg) */}
            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Faturamento por Categoria
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Participação por seção do supermercado
                  </p>
                </div>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Nenhuma venda realizada por categoria ainda.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {categoryBreakdown.slice(0, 6).map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-neutral-800">
                          {cat.category}
                        </span>
                        <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                          {formatCurrency(cat.revenue)} ({cat.percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          className="bg-neutral-800 h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Stock Replenishment Alerts (Estoque Baixo e Zerado) */}
          {(inventoryStats.lowStockList.length > 0 ||
            inventoryStats.outOfStockList.length > 0) && (
            <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    Alerta de Reposição de Estoque ({inventoryStats.lowStockList.length + inventoryStats.outOfStockList.length} itens)
                  </h3>
                </div>
                <button
                  onClick={onNavigateToStock}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <span>Gerenciar no Estoque</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50/50 border-b border-amber-200 text-amber-900 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Estoque Atual</th>
                      <th className="py-2.5 px-3 text-right">Estoque Mínimo</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {[
                      ...inventoryStats.outOfStockList,
                      ...inventoryStats.lowStockList,
                    ].map((prod) => (
                      <tr key={prod.id} className="hover:bg-amber-50/30">
                        <td className="py-2 px-3 font-mono text-neutral-600">
                          {prod.code}
                        </td>
                        <td className="py-2 px-3 font-semibold text-neutral-900">
                          {prod.name}
                        </td>
                        <td className="py-2 px-3 text-neutral-600">
                          {prod.category}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-red-700">
                          {prod.current_stock} {prod.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-600">
                          {prod.min_stock} {prod.unit}
                        </td>
                        <td className="py-2 px-3">
                          {prod.current_stock <= 0 ? (
                            <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                              Zerado / Esgotado
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              Abaixo do Mínimo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
