import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  CreditCard,
  DollarSign,
  QrCode,
  AlertCircle,
  User,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { Product, Sale, SaleItem, PaymentMethod } from '../../types';
import { formatCurrency, formatNumber, generateUUID } from '../../utils/formatters';

interface POSModuleProps {
  products: Product[];
  salesCount: number;
  onCompleteSale: (sale: Sale) => void;
  onNavigateToStock: () => void;
}

export const POSModule: React.FC<POSModuleProps> = ({
  products,
  salesCount,
  onCompleteSale,
  onNavigateToStock,
}) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerDoc, setCustomerDoc] = useState('');
  const [notes, setNotes] = useState('');
  const [posError, setPosError] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount and after cart changes
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Filter products for quick search/click
  const filteredProducts = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return products.filter((p) => {
      const matchesText =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term);

      if (!matchesText) return false;
      if (selectedCategory !== 'todas' && p.category !== selectedCategory) return false;
      return true;
    });
  }, [products, searchInput, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Add product to cart
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setPosError(null);

    // Check stock availability
    const existingInCart = cart.find((item) => item.product_id === product.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;
    const requestedTotalQty = currentCartQty + quantity;

    if (requestedTotalQty > product.current_stock) {
      setPosError(
        `Atenção: Estoque insuficiente de "${product.name}". Disponível em estoque: ${product.current_stock} ${product.unit}.`
      );
      if (product.current_stock <= 0) return;
    }

    setCart((prevCart) => {
      const idx = prevCart.findIndex((item) => item.product_id === product.id);
      if (idx >= 0) {
        const updated = [...prevCart];
        const newQty = updated[idx].quantity + quantity;
        const newTotalPrice = newQty * updated[idx].unit_price;
        const newTotalCost = newQty * updated[idx].unit_cost;
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          total_price: newTotalPrice,
          total_cost: newTotalCost,
          profit: newTotalPrice - newTotalCost,
        };
        return updated;
      } else {
        const itemTotalPrice = quantity * product.sale_price;
        const itemTotalCost = quantity * product.cost_price;
        const newItem: SaleItem = {
          id: generateUUID(),
          sale_id: '',
          product_id: product.id,
          product_name: product.name,
          product_code: product.code,
          unit: product.unit,
          quantity,
          unit_cost: product.cost_price,
          unit_price: product.sale_price,
          total_price: itemTotalPrice,
          total_cost: itemTotalCost,
          profit: itemTotalPrice - itemTotalCost,
        };
        return [...prevCart, newItem];
      }
    });

    setSearchInput('');
    barcodeInputRef.current?.focus();
  };

  // Barcode / Search Enter key submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const term = searchInput.trim().toLowerCase();
    // Try exact barcode match first
    const exactMatch = products.find(
      (p) => p.code.toLowerCase() === term || p.name.toLowerCase() === term
    );

    if (exactMatch) {
      handleAddToCart(exactMatch, 1);
    } else {
      // Find first partial match
      const firstPartial = filteredProducts[0];
      if (firstPartial) {
        handleAddToCart(firstPartial, 1);
      } else {
        setPosError(`Nenhum produto cadastrado com o código ou nome "${searchInput}".`);
      }
    }
  };

  // Modify quantity in cart
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    setPosError(null);
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQty > product.current_stock) {
      setPosError(
        `Aviso: Quantidade (${newQty}) excede o estoque atual de "${product.name}" (${product.current_stock} ${product.unit}).`
      );
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const totPrice = newQty * item.unit_price;
          const totCost = newQty * item.unit_cost;
          return {
            ...item,
            quantity: newQty,
            total_price: totPrice,
            total_cost: totCost,
            profit: totPrice - totCost,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountValue('0');
    setAmountPaid('');
    setPosError(null);
    barcodeInputRef.current?.focus();
  };

  // Totals calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percent') {
      return (subtotal * val) / 100;
    }
    return Math.min(val, subtotal);
  }, [subtotal, discountValue, discountType]);

  const total = Math.max(0, subtotal - discountAmount);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_cost, 0);
  }, [cart]);

  const grossProfit = total - totalCost;

  // Change / Troco
  const numericAmountPaid = parseFloat(amountPaid) || 0;
  const changeAmount =
    paymentMethod === 'dinheiro' && numericAmountPaid > total
      ? numericAmountPaid - total
      : 0;

  // Complete Sale
  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      setPosError('Adicione pelo menos um item ao carrinho para finalizar a venda.');
      return;
    }

    if (paymentMethod === 'dinheiro' && numericAmountPaid > 0 && numericAmountPaid < total) {
      setPosError(`Valor pago em dinheiro (${formatCurrency(numericAmountPaid)}) é menor que o total (${formatCurrency(total)}).`);
      return;
    }

    const saleId = generateUUID();
    const saleItems = cart.map((item) => ({
      ...item,
      sale_id: saleId,
    }));

    const newSale: Sale = {
      id: saleId,
      sale_number: salesCount + 1,
      date: new Date().toISOString(),
      customer_name: customerName.trim() || undefined,
      customer_doc: customerDoc.trim() || undefined,
      payment_method: paymentMethod,
      subtotal,
      discount: discountAmount,
      total,
      amount_paid: paymentMethod === 'dinheiro' ? (numericAmountPaid || total) : total,
      change: changeAmount,
      total_cost: totalCost,
      gross_profit: grossProfit,
      status: 'concluida',
      items: saleItems,
      notes: notes.trim() || undefined,
    };

    onCompleteSale(newSale);

    // Reset checkout state
    setCart([]);
    setDiscountValue('0');
    setAmountPaid('');
    setCustomerName('');
    setCustomerDoc('');
    setNotes('');
    setPosError(null);
  };

  // If no products registered at all
  if (products.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
          <Boxes className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-neutral-900">
            Nenhum produto disponível para venda
          </h2>
          <p className="text-xs text-neutral-500">
            Para iniciar as vendas no PDV, primeiro cadastre os produtos no módulo de estoque com nome, código de barras e preços.
          </p>
        </div>
        <button
          onClick={onNavigateToStock}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
        >
          <span>Ir para o Estoque e Cadastrar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT SECTION: Search + Cart (Cols 7 on lg) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Barcode Search Header */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Bipe o código de barras ou digite o nome do produto..."
                className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shrink-0"
            >
              Inserir
            </button>
          </form>

          {/* Categories Quick Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('todas')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'todas'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Quick Click Search Results dropdown/grid */}
          {searchInput && filteredProducts.length > 0 && (
            <div className="border border-neutral-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-neutral-100 bg-neutral-50/50">
              {filteredProducts.slice(0, 6).map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleAddToCart(prod, 1)}
                  className="w-full text-left p-2.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-neutral-900">{prod.name}</span>
                    <span className="block text-[11px] text-neutral-500 font-mono">
                      Código: {prod.code} · Estoque: {prod.current_stock} {prod.unit}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-emerald-700">
                    {formatCurrency(prod.sale_price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {posError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{posError}</span>
            </div>
            <button
              onClick={() => setPosError(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Cart Table Container */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50/60">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-neutral-700" />
              <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">
                Itens da Cesta ({cart.length})
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
              >
                Limpar Cesta
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShoppingCart className="w-8 h-8 mx-auto text-neutral-300" />
              <p className="text-xs text-neutral-500">
                A cesta está vazia. Bipe um produto ou use o campo de busca acima para adicionar itens.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-right">Preço</th>
                    <th className="py-2.5 px-3 text-center">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {cart.map((item, idx) => (
                    <tr key={item.product_id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900">
                          {idx + 1}. {item.product_name}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-500">
                          {item.product_code}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-neutral-700 tabular-nums">
                        {formatCurrency(item.unit_price)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 border border-neutral-300 rounded-lg p-0.5 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.product_id, item.quantity - 1)
                            }
                            className="p-1 text-neutral-600 hover:bg-neutral-100 rounded-md"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                item.product_id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center text-xs font-mono font-semibold focus:outline-hidden tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(item.product_id, item.quantity + 1)
                            }
                            className="p-1 text-neutral-600 hover:bg-neutral-100 rounded-md"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(item.total_price)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Checkout & Payment (Cols 5 on lg) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs space-y-5">
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="text-base font-bold text-neutral-900">
              Fechamento da Venda
            </h2>
            <p className="text-xs text-neutral-500">
              Venda Nº #{salesCount + 1}
            </p>
          </div>

          {/* Subtotal & Discount Row */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-mono text-neutral-900 font-semibold tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Discount Control */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-neutral-600">Desconto:</span>
              <div className="flex items-center gap-1.5">
                <div className="flex border border-neutral-300 rounded-md overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-1.5 py-0.5 ${
                      discountType === 'fixed'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-1.5 py-0.5 ${
                      discountType === 'percent'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 px-2 py-1 text-right text-xs font-mono border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Big Total Box */}
            <div className="p-3 bg-neutral-900 text-white rounded-xl flex items-center justify-between mt-3">
              <div>
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
                  Total a Pagar
                </span>
                <span className="text-2xl font-bold font-mono tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="text-right text-[11px] text-neutral-400 font-mono">
                {cart.length} produto(s)
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  paymentMethod === 'dinheiro'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  paymentMethod === 'pix'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao_credito')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  paymentMethod === 'cartao_credito'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Cartão Crédito</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao_debito')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  paymentMethod === 'cartao_debito'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Cartão Débito</span>
              </button>
            </div>
          </div>

          {/* Cash Change Calculator (If Dinheiro) */}
          {paymentMethod === 'dinheiro' && (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Valor Recebido em Dinheiro (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full px-3 py-1.5 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              {/* Quick Bill Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountPaid(val.toString())}
                    className="px-2 py-1 text-[11px] font-mono font-medium bg-white border border-neutral-300 rounded hover:bg-neutral-100 text-neutral-800"
                  >
                    R$ {val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountPaid(total.toFixed(2))}
                  className="px-2 py-1 text-[11px] font-medium bg-white border border-neutral-300 rounded hover:bg-neutral-100 text-emerald-800"
                >
                  Exato
                </button>
              </div>

              {/* Troco Result */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 text-xs">
                <span className="font-semibold text-neutral-700">Troco a Devolver:</span>
                <span className="text-base font-bold font-mono text-emerald-800 tabular-nums">
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Optional Customer Identification */}
          <div className="space-y-2 pt-2 border-t border-neutral-200 text-xs">
            <span className="font-semibold text-neutral-700 block">
              Identificação do Cliente (Opcional)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do Cliente"
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={customerDoc}
                onChange={(e) => setCustomerDoc(e.target.value)}
                placeholder="CPF ou Telefone"
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Complete Button */}
          <button
            type="button"
            onClick={handleFinalizeSale}
            disabled={cart.length === 0}
            className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Finalizar Venda ({formatCurrency(total)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
