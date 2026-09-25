import React from 'react';
import { X, Printer, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import { Sale } from '../../types';
import { formatCurrency, formatDate, formatPaymentMethod } from '../../utils/formatters';

interface SaleDetailModalProps {
  sale: Sale | null;
  onClose: () => void;
  onPrintReceipt: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale,
  onClose,
  onPrintReceipt,
  onCancelSale,
}) => {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">
                Detalhes da Venda #{sale.sale_number}
              </h2>
              {sale.status === 'cancelada' ? (
                <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                  Cancelada
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Concluída
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 font-mono">
              Realizada em: {formatDate(sale.date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Customer / Payment info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <span className="text-neutral-500 block">Forma de Pagamento:</span>
              <span className="font-semibold text-neutral-900">
                {formatPaymentMethod(sale.payment_method)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Cliente:</span>
              <span className="font-semibold text-neutral-900">
                {sale.customer_name || 'Consumidor Não Identificado'}
                {sale.customer_doc ? ` (${sale.customer_doc})` : ''}
              </span>
            </div>
          </div>

          {/* Items list */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3 text-right">Qtd</th>
                  <th className="py-2.5 px-3 text-right">Vl. Unit</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sale.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-neutral-900">
                        {item.product_name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400">
                        {item.product_code}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-700">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums text-neutral-900">
                      {formatCurrency(item.total_price)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {formatCurrency(item.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="space-y-1.5 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto Aplicado:</span>
                <span className="font-mono tabular-nums">- {formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Custo dos Produtos Vendidos (CPV):</span>
              <span className="font-mono tabular-nums">{formatCurrency(sale.total_cost)}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-semibold pt-1 border-t border-neutral-200">
              <span>Lucro Bruto da Venda:</span>
              <span className="font-mono tabular-nums">{formatCurrency(sale.gross_profit)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-300">
              <span>Total Final da Venda:</span>
              <span className="font-mono tabular-nums">{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50/70">
          <div>
            {sale.status !== 'cancelada' && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Tem certeza que deseja cancelar a venda #${sale.sale_number}? Os produtos serão devolvidos ao estoque automaticamente.`
                    )
                  ) {
                    onCancelSale(sale.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar / Estornar Venda</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => onPrintReceipt(sale)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Ver / Imprimir Cupom</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
