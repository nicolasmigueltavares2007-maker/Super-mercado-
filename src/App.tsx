import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Sale, StockMovement, SupabaseConfig } from './types';
import {
  fetchAllProducts,
  fetchAllSales,
  fetchAllMovements,
  saveProductToStore,
  deleteProductFromStore,
  saveSaleToStore,
  cancelSaleInStore,
  saveMovementToStore,
  setLocalProducts,
} from './services/storage';
import {
  getStoredSupabaseConfig,
  testSupabaseConnection,
} from './services/supabase';
import { Navbar, ActiveModule } from './components/Navbar';
import { SupabaseModal } from './components/SupabaseModal';
import { ReceiptModal } from './components/ReceiptModal';
import { InventoryModule } from './components/inventory/InventoryModule';
import { POSModule } from './components/sales/POSModule';
import { SalesHistoryModule } from './components/sales/SalesHistoryModule';
import { DashboardModule } from './components/dashboard/DashboardModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(
    getStoredSupabaseConfig()
  );
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all initial data on mount
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [loadedProds, loadedSales, loadedMovements] = await Promise.all([
          fetchAllProducts(),
          fetchAllSales(),
          fetchAllMovements(),
        ]);
        setProducts(loadedProds);
        setSales(loadedSales);
        setMovements(loadedMovements);

        // Check Supabase connectivity if credentials exist
        const conf = getStoredSupabaseConfig();
        if (conf.url && conf.anonKey) {
          const test = await testSupabaseConnection(conf.url, conf.anonKey);
          setSupabaseConfig({
            ...conf,
            isConnected: test.success,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // Low stock counter for header badge
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.current_stock <= p.min_stock).length;
  }, [products]);

  // Handle saving product (create or update)
  const handleSaveProduct = useCallback(async (product: Product) => {
    await saveProductToStore(product);
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = product;
        return copy;
      }
      return [...prev, product];
    });
  }, []);

  // Handle deleting product
  const handleDeleteProduct = useCallback(async (productId: string) => {
    await deleteProductFromStore(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  // Handle quick stock adjustment
  const handleStockAdjustment = useCallback(
    async (movement: StockMovement, updatedProduct: Product) => {
      await saveMovementToStore(movement);
      await saveProductToStore(updatedProduct);

      setMovements((prev) => [movement, ...prev]);
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    },
    []
  );

  // Handle completing sale from POS
  const handleCompleteSale = useCallback(
    async (newSale: Sale) => {
      // 1. Deduct stock from products
      const updatedProducts = products.map((prod) => {
        const soldItem = newSale.items.find((item) => item.product_id === prod.id);
        if (soldItem) {
          const newStock = Math.max(0, prod.current_stock - soldItem.quantity);
          return {
            ...prod,
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          };
        }
        return prod;
      });

      // 2. Generate stock movement entries for each item sold
      const newMovements: StockMovement[] = newSale.items.map((item) => {
        const origProd = products.find((p) => p.id === item.product_id);
        const prevStock = origProd ? origProd.current_stock : item.quantity;
        return {
          id: crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}_${Math.random()}`,
          product_id: item.product_id,
          product_name: item.product_name,
          type: 'venda',
          quantity: item.quantity,
          previous_stock: prevStock,
          new_stock: Math.max(0, prevStock - item.quantity),
          reason: `Venda #${newSale.sale_number}`,
          date: newSale.date,
          reference_id: newSale.id,
        };
      });

      // Save to storage & Supabase
      await saveSaleToStore(newSale);
      for (const prod of updatedProducts) {
        await saveProductToStore(prod);
      }
      for (const mov of newMovements) {
        await saveMovementToStore(mov);
      }

      // Update state
      setSales((prev) => [newSale, ...prev]);
      setProducts(updatedProducts);
      setMovements((prev) => [...newMovements, ...prev]);

      // Automatically show printable receipt for customer
      setActiveReceiptSale(newSale);
    },
    [products]
  );

  // Handle canceling a sale
  const handleCancelSale = useCallback(async (saleId: string) => {
    const canceled = await cancelSaleInStore(saleId);
    if (canceled) {
      // Refresh local products and sales
      const prods = await fetchAllProducts();
      const sls = await fetchAllSales();
      const movs = await fetchAllMovements();
      setProducts(prods);
      setSales(sls);
      setMovements(movs);
    }
  }, []);

  const handlePrintReceipt = useCallback((sale: Sale) => {
    setActiveReceiptSale(sale);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      {/* Navigation Header */}
      <Navbar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        supabaseConfig={supabaseConfig}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        lowStockCount={lowStockCount}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-neutral-500 text-xs font-medium">
            Carregando dados do supermercado...
          </div>
        ) : (
          <>
            {activeModule === 'dashboard' && (
              <DashboardModule
                products={products}
                sales={sales}
                onNavigateToStock={() => setActiveModule('estoque')}
                onNavigateToPOS={() => setActiveModule('vendas')}
              />
            )}

            {activeModule === 'estoque' && (
              <InventoryModule
                products={products}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onStockAdjustment={handleStockAdjustment}
              />
            )}

            {activeModule === 'vendas' && (
              <POSModule
                products={products}
                salesCount={sales.length}
                onCompleteSale={handleCompleteSale}
                onNavigateToStock={() => setActiveModule('estoque')}
              />
            )}

            {activeModule === 'historico' && (
              <SalesHistoryModule
                sales={sales}
                onCancelSale={handleCancelSale}
                onPrintReceipt={handlePrintReceipt}
                onNavigateToPOS={() => setActiveModule('vendas')}
              />
            )}
          </>
        )}
      </main>

      {/* Supabase Configuration & Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        products={products}
        sales={sales}
        movements={movements}
        onConfigUpdated={(cfg) => setSupabaseConfig(cfg)}
      />

      {/* Thermal Receipt Preview Modal */}
      <ReceiptModal
        sale={activeReceiptSale}
        onClose={() => setActiveReceiptSale(null)}
      />
    </div>
  );
}
