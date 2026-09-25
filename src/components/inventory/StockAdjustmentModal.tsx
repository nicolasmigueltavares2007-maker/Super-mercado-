import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Sliders, AlertCircle } from 'lucide-react';
import { Product, StockMovement, MovementType } from '../../types';
import { generateUUID } from '../../utils/formatters';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirmAdjustment: (movement: StockMovement, updatedProduct: Product) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirmAdjustment,
}) => {
  const [type, setType] = useState<MovementType>('entrada');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const current = product.current_stock;
  const qty = parseFloat(quantity) || 0;

  let newStock = current;
  if (type === 'entrada') {
    newStock = current + qty;
  } else if (type === 'saida') {
    newStock = Math.max(0, current - qty);
  } else if (type === 'ajuste') {
    newStock = qty;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0 && type !== 'ajuste') {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (type === 'ajuste' && qty < 0) {
      setError('O estoque ajustado não pode ser negativo.');
      return;
    }
    if (type === 'saida' && qty > current) {
      setError(`Quantidade a retirar (${qty}) é maior que o estoque atual (${current}).`);
      return;
    }

    const defaultReason =
      type === 'entrada'
        ? 'Entrada de mercadoria / compra'
        : type === 'saida'
        ? 'Saída / quebra / descarte'
        : 'Ajuste manual de inventário';

    const now = new Date().toISOString();
    const movement: StockMovement = {
      id: generateUUID(),
      product_id: product.id,
      product_name: product.name,
      type,
      quantity: type === 'ajuste' ? Math.abs(newStock - current) : qty,
      previous_stock: current,
      new_stock: newStock,
      reason: reason.trim() || defaultReason,
      date: now,
    };

    const updatedProduct: Product = {
      ...product,
      current_stock: newStock,
      updated_at: now,
    };

    onConfirmAdjustment(movement, updatedProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Movimentar Estoque
            </h2>
            <p className="text-xs text-neutral-500 truncate max-w-xs">
              {product.name} ({product.code})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (Interactive Segmented Control) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setType('entrada');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  type === 'entrada'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Entrada</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('saida');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  type === 'saida'
                    ? 'bg-white text-red-800 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                <span>Saída</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('ajuste');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  type === 'ajuste'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Balanço</span>
              </button>
            </div>
          </div>

          {/* Current vs New Stock Comparison */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <span className="block text-[11px] text-neutral-500 font-medium">
                Estoque Atual
              </span>
              <span className="text-base font-bold font-mono text-neutral-800 tabular-nums">
                {current} {product.unit}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-neutral-500 font-medium">
                Estoque Previsto
              </span>
              <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                {newStock} {product.unit}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              {type === 'ajuste' ? 'Nova Quantidade Real Contada' : 'Quantidade da Movimentação'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                autoFocus
              />
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-mono">
                {product.unit}
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Motivo / Observação
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === 'entrada'
                  ? 'Ex: Nota Fiscal 1234, Reposição semanal'
                  : type === 'saida'
                  ? 'Ex: Vencido, Danificado, Consumo interno'
                  : 'Ex: Contagem física de estoque'
              }
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
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
              Confirmar Movimentação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
