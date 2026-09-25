import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  Boxes,
  Sliders,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, StockMovement, ProductCategory } from '../../types';
import { formatCurrency, formatNumber, formatDateOnly } from '../../utils/formatters';
import { ProductFormModal } from './ProductFormModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';

interface InventoryModuleProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onStockAdjustment: (movement: StockMovement, updatedProduct: Product) => void;
}

type StockFilter = 'todos' | 'baixo' | 'esgotado' | 'em_dia';

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
  onStockAdjustment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockFilter>('todos');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Categories list extracted from existing products or predefined
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search by name or code
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        prod.name.toLowerCase().includes(term) ||
        prod.code.toLowerCase().includes(term) ||
        (prod.supplier && prod.supplier.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // Category filter
      if (categoryFilter !== 'todas' && prod.category !== categoryFilter) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter === 'esgotado') {
        return prod.current_stock <= 0;
      }
      if (stockStatusFilter === 'baixo') {
        return prod.current_stock > 0 && prod.current_stock <= prod.min_stock;
      }
      if (stockStatusFilter === 'em_dia') {
        return prod.current_stock > prod.min_stock;
      }

      return true;
    });
  }, [products, searchTerm, categoryFilter, stockStatusFilter]);

  // Inventory KPI calculations
  const stats = useMemo(() => {
    let totalItemsCount = 0;
    let totalCostValue = 0;
    let totalSaleValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalItemsCount += p.current_stock;
      totalCostValue += p.current_stock * p.cost_price;
      totalSaleValue += p.current_stock * p.sale_price;

      if (p.current_stock <= 0) {
        outOfStockCount++;
      } else if (p.current_stock <= p.min_stock) {
        lowStockCount++;
      }
    });

    return {
      uniqueProducts: products.length,
      totalItemsCount,
      totalCostValue,
      totalSaleValue,
      lowStockCount,
      outOfStockCount,
      potentialProfit: totalSaleValue - totalCostValue,
    };
  }, [products]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsFormOpen(true);
  };

  const handleExportCsv = () => {
    if (products.length === 0) return;

    const headers = [
      'Código',
      'Nome',
      'Categoria',
      'Unidade',
      'Preço Custo',
      'Preço Venda',
      'Estoque Atual',
      'Estoque Mínimo',
      'Fornecedor',
      'Validade',
    ];

    const rows = products.map((p) => [
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.cost_price.toFixed(2),
      p.sale_price.toFixed(2),
      p.current_stock,
      p.min_stock,
      `"${p.supplier || ''}"`,
      `"${p.expiration_date || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `estoque_supermercado_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Controle de Estoque
          </h1>
          <p className="text-xs text-neutral-500">
            Cadastre produtos, acompanhe níveis de estoque e gerencie custos e margens
          </p>
        </div>

        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Produtos Cadastrados
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {stats.uniqueProducts}
            </span>
            <span className="text-xs text-neutral-500">
              ({formatNumber(stats.totalItemsCount, 0)} itens)
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Valor do Estoque (Custo)
          </span>
          <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
            {formatCurrency(stats.totalCostValue)}
          </span>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Valor do Estoque (Venda)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {formatCurrency(stats.totalSaleValue)}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <span className="block text-xs font-medium text-neutral-500 mb-1">
            Alertas de Estoque
          </span>
          <div className="flex items-center gap-2">
            {stats.lowStockCount > 0 || stats.outOfStockCount > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-amber-700 font-mono">
                  {stats.lowStockCount} baixo(s)
                </span>
                <span className="text-xs font-semibold text-red-700 font-mono">
                  {stats.outOfStockCount} zerado(s)
                </span>
              </div>
            ) : (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tudo em dia
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-3 bg-white border border-neutral-200 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, código de barras ou SKU..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2 text-xs text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todas">Todas as Categorias</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Segmented status filter */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 rounded-lg">
            <button
              onClick={() => setStockStatusFilter('todos')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                stockStatusFilter === 'todos'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('baixo')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                stockStatusFilter === 'baixo'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Estoque Baixo
            </button>
            <button
              onClick={() => setStockStatusFilter('esgotado')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                stockStatusFilter === 'esgotado'
                  ? 'bg-white text-red-800 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Zerados
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Boxes className="w-6 h-6" />
            </div>
            {products.length === 0 ? (
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Nenhum produto cadastrado no estoque
                </h3>
                <p className="text-xs text-neutral-500">
                  Cadastre o primeiro produto para iniciar o controle do seu supermercado. Todas as informações que você cadastrar serão salvas e exibidas nos relatórios.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Primeiro Produto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Nenhum produto encontrado
                </h3>
                <p className="text-xs text-neutral-500">
                  Tente alterar os termos de busca ou limpar os filtros aplicados.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('todas');
                    setStockStatusFilter('todos');
                  }}
                  className="mt-2 text-xs text-emerald-700 hover:underline font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Código / EAN</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Custo Unit.</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-4 text-right">Margem</th>
                  <th className="py-3 px-4 text-right">Estoque</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredProducts.map((prod) => {
                  const profit = prod.sale_price - prod.cost_price;
                  const marginPct =
                    prod.sale_price > 0 ? (profit / prod.sale_price) * 100 : 0;
                  const isOutOfStock = prod.current_stock <= 0;
                  const isLowStock =
                    prod.current_stock > 0 && prod.current_stock <= prod.min_stock;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-neutral-50/80 transition-colors"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono text-neutral-600 whitespace-nowrap">
                        {prod.code}
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">
                          {prod.name}
                        </div>
                        {prod.supplier && (
                          <div className="text-[11px] text-neutral-500">
                            Forn: {prod.supplier}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                        {prod.category}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right font-mono text-neutral-600 tabular-nums whitespace-nowrap">
                        {formatCurrency(prod.cost_price)}
                      </td>

                      {/* Sale Price */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(prod.sale_price)}
                      </td>

                      {/* Margin */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={
                            marginPct >= 30
                              ? 'text-emerald-700 font-medium'
                              : marginPct > 0
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            isOutOfStock
                              ? 'text-red-700 font-bold'
                              : isLowStock
                              ? 'text-amber-700 font-bold'
                              : 'text-neutral-900'
                          }
                        >
                          {prod.current_stock} {prod.unit}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="text-xs font-semibold text-red-700">
                            Esgotado
                          </span>
                        ) : isLowStock ? (
                          <span className="text-xs font-semibold text-amber-700">
                            Estoque Baixo ({'≤'} {prod.min_stock})
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-medium">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setAdjustingProduct(prod)}
                            title="Movimentar Estoque (Entrada/Saída/Ajuste)"
                            className="p-1.5 text-neutral-600 hover:text-emerald-700 hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(prod)}
                            title="Editar Dados do Produto"
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingProductId(prod.id)}
                            title="Excluir Produto"
                            className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 space-y-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-neutral-500">
                  Deseja realmente remover este produto do estoque?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setDeletingProductId(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteProduct(deletingProductId);
                  setDeletingProductId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={onSaveProduct}
        initialProduct={editingProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
        onConfirmAdjustment={onStockAdjustment}
      />
    </div>
  );
};
