import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency, formatDate, formatPaymentMethod } from '../utils/formatters';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              Comprovante de Venda #{sale.sale_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 overflow-y-auto bg-neutral-100 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white p-5 rounded-lg border border-neutral-300 shadow-xs font-mono text-xs text-neutral-800 space-y-3"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-neutral-300 pb-3 space-y-0.5">
              <h3 className="text-sm font-bold tracking-tight text-neutral-900">
                SUPERMERCADO GESTÃO
              </h3>
              <p className="text-[10px] text-neutral-500">
                CUPOM NÃO FISCAL
              </p>
              <p className="text-[10px] text-neutral-500">
                Data: {formatDate(sale.date)}
              </p>
              <p className="text-[10px] text-neutral-500">
                Venda Nº: #{sale.sale_number}
              </p>
              {sale.customer_name && (
                <p className="text-[10px] text-neutral-600 pt-1">
                  Cliente: {sale.customer_name} {sale.customer_doc ? `(${sale.customer_doc})` : ''}
                </p>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 border-b border-dashed border-neutral-300 pb-3">
              <div className="flex justify-between text-[11px] font-semibold text-neutral-700 pb-1">
                <span>ITEM / QTD x VL.UN</span>
                <span>TOTAL</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={item.id || idx} className="text-[11px]">
                  <div className="font-medium text-neutral-900 truncate">
                    {idx + 1}. {item.product_name}
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      {item.quantity} {item.unit} x {formatCurrency(item.unit_price)}
                    </span>
                    <span className="font-semibold text-neutral-900">
                      {formatCurrency(item.total_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-neutral-300 pb-3 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                <span>TOTAL A PAGAR:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-1 text-[11px] text-neutral-600 border-b border-dashed border-neutral-300 pb-3">
              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="font-semibold text-neutral-800">
                  {formatPaymentMethod(sale.payment_method)}
                </span>
              </div>
              {sale.payment_method === 'dinheiro' && (
                <>
                  <div className="flex justify-between">
                    <span>Valor Recebido:</span>
                    <span>{formatCurrency(sale.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span>Troco:</span>
                    <span>{formatCurrency(sale.change)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-neutral-500 pt-1">
              <p>Obrigado pela preferência!</p>
              <p className="font-mono text-[9px] text-neutral-400 mt-1">
                ID: {sale.id.slice(0, 16)}...
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-200 bg-neutral-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Cupom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
