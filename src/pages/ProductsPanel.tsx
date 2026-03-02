import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePOSStore } from '../stores/usePOSStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Search, Package, AlertTriangle, PlusCircle } from 'lucide-react';
import { Input } from '../components/Input';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  unit_price: number;
  brand: string | null;
}

interface ProductsPanelProps {
  ticketCategory?: 'lavage' | 'vidange' | 'pneumatique';
}

export function ProductsPanel({ ticketCategory }: ProductsPanelProps) {
  const { t } = useTranslation();
  const { addItem } = usePOSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (ticketCategory === 'vidange') setSelectedCategory('oil');
    else if (ticketCategory === 'pneumatique') setSelectedCategory('tire');
    else if (ticketCategory === 'lavage') setSelectedCategory('all');
  }, [ticketCategory]);

  const categories = ['all', 'tire', 'oil', 'accessory', 'other'];

  const { data: allProducts, isLoading } = useSupabaseData<Product>('products');
  const products = allProducts.filter(p => (p as any).active && p.stock_quantity > 0).sort((a, b) => a.name.localeCompare(b.name));

  const filteredProducts = (products || []).filter((product: any) => {
    const name = product.name;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = (product: Product) => {
    addItem({
      id: product.id,
      type: 'product',
      name: product.name,
      price: product.unit_price,
      quantity: 1,
    });
  };

  const isLowStock = (product: Product) => product.stock_quantity <= product.min_stock;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)]">
      {/* Search & Filter */}
      <div className="p-4 border-b border-[var(--border)] shrink-0 space-y-3">
        <Input
          type="text"
          placeholder="Rechercher par nom ou code SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5 text-gray-400" />}
          className="bg-[var(--bg-panel)] h-10 text-sm"
        />

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors uppercase tracking-wide border ${selectedCategory === cat
                ? 'bg-primary-500 border-primary-500 text-white shadow-lg'
                : 'bg-[var(--bg-panel)] border-[var(--border-lg)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'
                }`}
            >
              {t(`inventory.categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[var(--text-muted)]">
              <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p>Chargement...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Package className="w-12 h-12 text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-muted)] font-medium">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className={`flex flex-col text-left p-3 rounded-xl transition-all duration-200 border group ${isLowStock(product)
                  ? 'bg-danger-500/10 border-danger-500/30 hover:border-danger-500'
                  : 'bg-[var(--bg-panel)] border-[var(--border-lg)] hover:border-primary-500/50 hover:bg-primary-500/10'
                  }`}
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="p-1.5 rounded-md bg-[var(--bg-base)] border border-[var(--border)] shrink-0">
                    <Package className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                  {isLowStock(product) ? (
                    <AlertTriangle className="w-4 h-4 text-danger-400 shrink-0" />
                  ) : (
                    <PlusCircle className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>

                <h3 className="font-bold text-[12px] text-white leading-tight mb-1 truncate w-full" title={product.name}>
                  {product.name}
                </h3>
                {product.brand && <p className="text-[10px] text-[var(--text-muted)] truncate w-full">{product.brand}</p>}

                <div className="mt-auto pt-2 w-full border-t border-[var(--border)] flex justify-between items-end">
                  <div>
                    <p className="text-[9px] text-[var(--text-muted)] font-mono mb-0.5">SKU:{product.sku}</p>
                    <span className="text-sm font-extrabold text-primary-500">{product.unit_price} DZD</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isLowStock(product) ? 'bg-danger-500/20 text-danger-400' : 'bg-success-500/20 text-success-400'}`}>
                    QTE: {product.stock_quantity}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
