import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/db';
import { queueOperation } from '../lib/sync';
import { showAlert, showConfirm } from '../stores/useDialogStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Search, Package, Edit2, Trash2, AlertTriangle, TrendingUp, X, FileText } from 'lucide-react';
import { PurchaseInvoiceModal } from './PurchaseInvoiceModal';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  unit_price: number;
  cost_price: number;
  brand?: string;
  supplier_id?: string;
  tire_width?: number;
  tire_height?: number;
  tire_diameter?: number;
  oil_viscosity?: string;
  oil_volume?: number;
}

interface Supplier {
  id: string;
  company_name: string;
}

export function Inventory() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const productsData = useLiveQuery(async () => {
    const all = await db.products.toArray();
    return all.filter(p => (p as any).active !== false).sort((a, b) => a.name.localeCompare(b.name));
  });

  const suppliersData = useLiveQuery(async () => {
    const all = await db.suppliers.toArray();
    return all.filter(s => s.active !== false).sort((a, b) => a.company_name.localeCompare(b.company_name));
  });

  const isLoading = productsData === undefined || suppliersData === undefined;
  const products = productsData as Product[] || [];
  const suppliers = suppliersData as Supplier[] || [];

  const filteredProducts = products.filter((product) => {
    const name = product.name;
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = product.stock_quantity <= product.min_stock && product.stock_quantity > 0;
    } else if (stockFilter === 'out') {
      matchesStock = product.stock_quantity === 0;
    } else if (stockFilter === 'inStock') {
      matchesStock = product.stock_quantity > product.min_stock;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleDelete = async (product: Product) => {
    if (!(await showConfirm(t('messages.deleteConfirm')))) return;

    await queueOperation('products', 'UPDATE', { ...product, active: false });
  };

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.inventory')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
            {filteredProducts.length} {t('inventory.total')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setShowInvoiceModal(true)}>
            <FileText className="w-5 h-5 mr-2" />
            Nouvel Achat
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center shadow-[var(--shadow-glow-orange)]">
              <Package className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t('inventory.totalProducts')}</p>
              <p className="text-3xl font-black text-white">{products.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-500/10 border border-warning-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t('inventory.lowStock')}</p>
              <p className="text-3xl font-black text-warning-400">{lowStockCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-500/10 border border-danger-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-danger-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t('inventory.outOfStock')}</p>
              <p className="text-3xl font-black text-danger-400">{outOfStockCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-[var(--bg-panel)] border-[var(--border-lg)] flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Input
            type="text"
            placeholder={t('inventory.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-5 h-5 text-gray-500" />}
            className="bg-[var(--bg-base)] border-none"
          />
        </div>

        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={[
            { value: 'all', label: t('inventory.categories.all') },
            { value: 'tire', label: t('inventory.categories.tire') },
            { value: 'oil', label: t('inventory.categories.oil') },
            { value: 'accessory', label: t('inventory.categories.accessory') },
            { value: 'other', label: t('inventory.categories.other') },
          ]}
          className="min-w-[180px] bg-[var(--bg-base)] border-none"
        />

        <Select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          options={[
            { value: 'all', label: t('inventory.stockFilters.all') },
            { value: 'low', label: t('inventory.stockFilters.low') },
            { value: 'out', label: t('inventory.stockFilters.out') },
            { value: 'inStock', label: t('inventory.stockFilters.inStock') },
          ]}
          className="min-w-[180px] bg-[var(--bg-base)] border-none"
        />
      </Card>

      {/* Products Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[var(--text-muted)]">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="font-medium animate-pulse">{t('common.loading')}</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-[var(--border-lg)] bg-[var(--bg-panel)]/50">
          <Package className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
          <p className="text-[var(--text-secondary)] font-medium text-lg">{t('common.noData')}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border-[var(--border)]">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border-lg)] scrollbar-track-[var(--bg-surface)]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[var(--bg-panel)] border-b border-[var(--border)] uppercase text-[10px] tracking-wider text-[var(--text-secondary)] font-bold">
                  <th className="px-6 py-4">{t('inventory.productName')}</th>
                  <th className="px-6 py-4">{t('inventory.sku')}</th>
                  <th className="px-6 py-4">{t('inventory.category')}</th>
                  <th className="px-6 py-4">{t('inventory.stock')}</th>
                  <th className="px-6 py-4">{t('inventory.unitPrice')}</th>
                  <th className="px-6 py-4">{t('inventory.supplier')}</th>
                  <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-white text-sm">
                          {product.name}
                        </p>
                        {product.brand && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{product.brand}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] font-mono">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-info-500/10 text-info-400 border border-info-500/20">
                        {t(`inventory.categories.${product.category}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${product.stock_quantity === 0 ? 'text-danger-400' :
                          product.stock_quantity <= product.min_stock ? 'text-warning-400' :
                            'text-success-400'
                          }`}>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= product.min_stock && product.stock_quantity > 0 && (
                          <AlertTriangle className="w-4 h-4 text-warning-400" />
                        )}
                        {product.stock_quantity === 0 && (
                          <span className="text-[10px] uppercase font-bold bg-danger-500/10 text-danger-400 px-1.5 py-0.5 rounded border border-danger-500/20">
                            {t('inventory.outOfStock')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-400">
                      {product.unit_price} DA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {suppliers.find(s => s.id === product.supplier_id)?.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowProductModal(true);
                          }}
                          className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors border border-transparent hover:border-primary-500/30"
                        >
                          <Edit2 className="w-4 h-4 text-primary-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors border border-transparent hover:border-danger-500/30"
                        >
                          <Trash2 className="w-4 h-4 text-danger-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          suppliers={suppliers}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showInvoiceModal && (
        <PurchaseInvoiceModal
          onClose={() => setShowInvoiceModal(false)}
          onAddNewProduct={() => {
            setEditingProduct(null);
            setShowProductModal(true);
          }}
        />
      )}
    </div>
  );
}

interface ProductModalProps {
  product: Product | null;
  suppliers: Supplier[];
  onClose: () => void;
}

function ProductModal({ product, suppliers, onClose }: ProductModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'other',
    sku: product?.sku || '',
    barcode: '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    min_stock: product?.min_stock?.toString() || '5',
    unit_price: product?.unit_price?.toString() || '0',
    cost_price: product?.cost_price?.toString() || '0',
    supplier_id: product?.supplier_id || '',
    brand: product?.brand || '',
    tire_width: product?.tire_width?.toString() || '',
    tire_height: product?.tire_height?.toString() || '',
    tire_diameter: product?.tire_diameter?.toString() || '',
    oil_viscosity: product?.oil_viscosity || '',
    oil_volume: product?.oil_volume?.toString() || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data: any = {
      name: formData.name,
      category: formData.category,
      sku: formData.sku,
      stock_quantity: 0,
      min_stock: 5,
      unit_price: 0,
      cost_price: 0,
      supplier_id: formData.supplier_id || null,
      brand: formData.brand || null,
    };

    if (formData.category === 'tire') {
      data.tire_width = parseInt(formData.tire_width) || null;
      data.tire_height = parseInt(formData.tire_height) || null;
      data.tire_diameter = parseInt(formData.tire_diameter) || null;
    }

    if (formData.category === 'oil') {
      data.oil_viscosity = formData.oil_viscosity || null;
      data.oil_volume = parseFloat(formData.oil_volume) || null;
    }

    try {
      if (product) {
        await queueOperation('products', 'UPDATE', { ...product, ...data, updated_at: new Date().toISOString() });
      } else {
        await queueOperation('products', 'INSERT', {
          id: crypto.randomUUID(),
          ...data,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      showAlert(t('messages.saveError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = [
    { value: 'tire', label: t('inventory.categories.tire') },
    { value: 'oil', label: t('inventory.categories.oil') },
    { value: 'accessory', label: t('inventory.categories.accessory') },
    { value: 'other', label: t('inventory.categories.other') },
  ];



  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-500" />
            {product ? t('inventory.editProduct') : t('inventory.addProduct')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-panel)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
          <div className="grid grid-cols-1 gap-4">
            <Input
              label={t('inventory.productName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('inventory.category')}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={categoryOptions}
              required
            />
            <Input
              label={formData.category === 'other' || formData.category === 'accessory' ? "Véhicule(s) compatible(s) / Réf." : t('inventory.sku')}
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
              placeholder={formData.category === 'other' || formData.category === 'accessory' ? "Ex: Renault, Peugeot..." : ""}
            />
          </div>

          <div>
            <Input
              label={t('inventory.brand')}
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Ex: Total, Michelin, Bosch..."
            />
          </div>

          {formData.category === 'tire' && (
            <div className="p-4 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('inventory.tireSpecs')}</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label={t('inventory.tireWidth')}
                  type="number"
                  value={formData.tire_width}
                  onChange={(e) => setFormData({ ...formData, tire_width: e.target.value })}
                  placeholder="205"
                />
                <Input
                  label={t('inventory.tireHeight')}
                  type="number"
                  value={formData.tire_height}
                  onChange={(e) => setFormData({ ...formData, tire_height: e.target.value })}
                  placeholder="55"
                />
                <Input
                  label={t('inventory.tireDiameter')}
                  type="number"
                  value={formData.tire_diameter}
                  onChange={(e) => setFormData({ ...formData, tire_diameter: e.target.value })}
                  placeholder="16"
                />
              </div>
            </div>
          )}

          {formData.category === 'oil' && (
            <div className="p-4 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('inventory.oilSpecs')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('inventory.oilViscosity')}
                  value={formData.oil_viscosity}
                  onChange={(e) => setFormData({ ...formData, oil_viscosity: e.target.value })}
                  placeholder="5W-30"
                />
                <Input
                  label={t('inventory.oilVolume')}
                  type="number"
                  value={formData.oil_volume}
                  onChange={(e) => setFormData({ ...formData, oil_volume: e.target.value })}
                  placeholder="5"
                  step="0.5"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)] mt-6">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isLoading}
            >
              {product ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
