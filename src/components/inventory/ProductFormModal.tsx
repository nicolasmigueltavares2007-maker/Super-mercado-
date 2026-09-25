import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { formatCurrency, generateEanBarcode, generateUUID } from '../../utils/formatters';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  initialProduct?: Product | null;
}

const CATEGORIES: ProductCategory[] = [
  'Mercearia',
  'Hortifruti',
  'Carnes e Aves',
  'Laticínios e Frios',
  'Bebidas',
  'Padaria e Confeitaria',
  'Higiene Pessoal',
  'Limpeza',
  'Congelados',
  'Doces e Snacks',
  'Pet Shop',
  'Bazar e Utilidades',
  'Outros',
];

const UNITS: { label: string; value: ProductUnit }[] = [
  { label: 'Unidade (un)', value: 'un' },
  { label: 'Quilograma (kg)', value: 'kg' },
  { label: 'Grama (g)', value: 'g' },
  { label: 'Litro (lt)', value: 'lt' },
  { label: 'Mililitro (ml)', value: 'ml' },
  { label: 'Pacote (pct)', value: 'pct' },
  { label: 'Caixa (cx)', value: 'cx' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProduct,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Mercearia');
  const [unit, setUnit] = useState<ProductUnit>('un');
  const [costPrice, setCostPrice] = useState<string>('0');
  const [salePrice, setSalePrice] = useState<string>('0');
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [minStock, setMinStock] = useState<string>('5');
  const [supplier, setSupplier] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setName(initialProduct.name);
        setCode(initialProduct.code);
        setCategory(initialProduct.category as ProductCategory);
        setUnit(initialProduct.unit as ProductUnit);
        setCostPrice(initialProduct.cost_price.toString());
        setSalePrice(initialProduct.sale_price.toString());
        setCurrentStock(initialProduct.current_stock.toString());
        setMinStock(initialProduct.min_stock.toString());
        setSupplier(initialProduct.supplier || '');
        setExpirationDate(initialProduct.expiration_date || '');
      } else {
        setName('');
        setCode(generateEanBarcode());
        setCategory('Mercearia');
        setUnit('un');
        setCostPrice('0.00');
        setSalePrice('0.00');
        setCurrentStock('0');
        setMinStock('5');
        setSupplier('');
        setExpirationDate('');
      }
      setError(null);
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const unitProfit = sale - cost;
  const marginPercent = sale > 0 ? ((unitProfit / sale) * 100) : 0;

  const handleGenerateBarcode = () => {
    setCode(generateEanBarcode());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do produto.');
      return;
    }
    if (!code.trim()) {
      setError('Por favor, informe o código de barras ou SKU.');
      return;
    }

    const parsedCost = parseFloat(costPrice) || 0;
    const parsedSale = parseFloat(salePrice) || 0;
    const parsedStock = parseFloat(currentStock) || 0;
    const parsedMin = parseFloat(minStock) || 0;

    if (parsedSale < 0 || parsedCost < 0 || parsedStock < 0) {
      setError('Valores de preço ou estoque não podem ser negativos.');
      return;
    }

    const now = new Date().toISOString();
    const product: Product = {
      id: initialProduct?.id || generateUUID(),
      name: name.trim(),
      code: code.trim(),
      category,
      unit,
      cost_price: parsedCost,
      sale_price: parsedSale,
      current_stock: parsedStock,
      min_stock: parsedMin,
      supplier: supplier.trim() || undefined,
      expiration_date: expirationDate || undefined,
      created_at: initialProduct?.created_at || now,
      updated_at: now,
    };

    onSave(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {initialProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <p className="text-xs text-neutral-500">
              Preencha os dados de estoque e precificação do produto
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nome do Produto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arroz Tipo 1 5kg, Leite Integral 1L, etc."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Código de Barras / SKU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700">
                Código de Barras (EAN / SKU) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <Sparkles className="w-3 h-3" /> Gerar Código EAN
              </button>
            </div>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="7890000000000"
              className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Categoria e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preços: Custo e Venda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Preço de Venda (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>
          </div>

          {/* Margem Preview */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-neutral-600 font-medium">Margem Projetada:</span>
            <div className="flex items-center gap-3">
              <span className="text-neutral-700 font-mono">
                Lucro: <strong>{formatCurrency(unitProfit)}</strong>
              </span>
              <span
                className={`font-semibold font-mono ${
                  marginPercent >= 30
                    ? 'text-emerald-700'
                    : marginPercent > 0
                    ? 'text-amber-700'
                    : 'text-neutral-500'
                }`}
              >
                {marginPercent.toFixed(1)}% de margem
              </span>
            </div>
          </div>

          {/* Estoque Atual e Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Quantidade Inicial em Estoque
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Estoque Mínimo de Alerta
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
              <span className="text-[11px] text-neutral-500">
                Avisa no dashboard quando atingir esta quantia
              </span>
            </div>
          </div>

          {/* Fornecedor e Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Fornecedor (Opcional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora Silva"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Data de Validade (Opcional)
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              {initialProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
