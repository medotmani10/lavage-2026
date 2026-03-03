import { useTranslation } from 'react-i18next';
import { usePOSStore } from '../stores/usePOSStore';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { Input } from '../components/Input';

export function CartPanel() {
  const { t } = useTranslation();
  const { items, subtotal, discount, total, removeItem, updateQuantity, setDiscount } = usePOSStore();

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setDiscount(value);
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-[var(--text-muted)] opacity-70">
        <ShoppingBag className="w-12 h-12 mb-4" />
        <p className="text-lg font-bold">Panier Vide</p>
        <p className="text-sm mt-1">Ajoutez des services ou produits pour commencer.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0 flex justify-between items-center bg-[var(--bg-panel)]">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary-500" />
          {t('pos.cart')}
        </h2>
        <span className="bg-primary-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg">
          {items.length} {t('pos.items')}
        </span>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray bg-[var(--bg-base)]">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-lg)] group transition-all hover:border-primary-500/50 shadow-sm">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-bold text-sm text-white truncate w-full" title={item.name}>{item.name}</p>
              <p className="text-xs font-medium text-[var(--text-muted)] mt-1">
                {item.price.toLocaleString()} DA
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-[var(--bg-base)] p-1 rounded-lg border border-[var(--border)] shrink-0">
              <button
                onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)}
                className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white rounded transition-colors"
                type="button"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-white shrink-0">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white rounded transition-colors"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right min-w-[75px] shrink-0 border-l border-[var(--border)] pl-3 ml-1 flex flex-col justify-between h-full py-0.5">
              <p className="font-black text-sm text-white">{(item.subtotal).toLocaleString()} DA</p>
              <button
                onClick={() => removeItem(item.id, item.type)}
                className="text-[10px] font-bold text-danger-500 hover:text-danger-400 transition-colors uppercase mt-1.5 text-right w-full"
                type="button"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals Summary */}
      <div className="border-t border-[var(--border)] p-4 space-y-3 bg-[var(--bg-panel)] shrink-0 mt-auto shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-xs">Sous-total</span>
          <span className="font-bold text-white text-sm">{subtotal.toLocaleString()} DA</span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--border-lg)]">
          <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-xs whitespace-nowrap">
            Remise
          </span>
          <Input
            type="number"
            value={discount || ''}
            onChange={handleDiscountChange}
            className="w-28 text-right bg-[var(--bg-base)] h-8 text-sm px-3 font-bold"
            placeholder="0 DA"
            min="0"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-primary-500/20">
          <span className="text-white font-black uppercase text-sm tracking-widest">A PAYER</span>
          <span className="text-2xl font-black text-gradient">{total.toLocaleString()} DA</span>
        </div>
      </div>
    </div>
  );
}
