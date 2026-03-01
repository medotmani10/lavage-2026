import { create } from 'zustand';

export interface CartItem {
  id: string;
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  category?: string; // e.g. 'lavage', 'vidange', 'pneumatique'
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  vehicleId: string | null;
  employeeId: string | null;
  notes: string;
  taxRate: number;
  discount: number;

  // Calculated values
  subtotal: number;
  taxAmount: number;
  total: number;

  // Actions
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  removeItem: (itemId: string, type: 'service' | 'product') => void;
  updateQuantity: (itemId: string, type: 'service' | 'product', quantity: number) => void;
  clearCart: () => void;
  setCustomer: (customerId: string | null) => void;
  setVehicle: (vehicleId: string | null) => void;
  setEmployee: (employeeId: string | null) => void;
  setNotes: (notes: string) => void;
  setDiscount: (discount: number) => void;
  calculateTotals: () => void;
}

export const usePOSStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  vehicleId: null,
  employeeId: null,
  notes: '',
  taxRate: 0,
  discount: 0,
  subtotal: 0,
  taxAmount: 0,
  total: 0,

  addItem: (item) => {
    const currentItems = get().items;
    const existingIndex = currentItems.findIndex(
      (i) => i.id === item.id && i.type === item.type
    );

    if (existingIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...currentItems];
      updatedItems[existingIndex].quantity += item.quantity;
      updatedItems[existingIndex].subtotal =
        updatedItems[existingIndex].price * updatedItems[existingIndex].quantity;
      set({ items: updatedItems });
    } else {
      // Add new item
      set({
        items: [
          ...currentItems,
          {
            ...item,
            subtotal: item.price * item.quantity,
          },
        ],
      });
    }

    get().calculateTotals();
  },

  removeItem: (itemId, type) => {
    set({
      items: get().items.filter(
        (i) => !(i.id === itemId && i.type === type)
      ),
    });
    get().calculateTotals();
  },

  updateQuantity: (itemId, type, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId, type);
      return;
    }

    set({
      items: get().items.map((i) =>
        i.id === itemId && i.type === type
          ? { ...i, quantity, subtotal: i.price * quantity }
          : i
      ),
    });
    get().calculateTotals();
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      vehicleId: null,
      employeeId: null,
      notes: '',
      discount: 0,
    });
    get().calculateTotals();
  },

  setCustomer: (customerId) => set({ customerId }),
  setVehicle: (vehicleId) => set({ vehicleId }),
  setEmployee: (employeeId) => set({ employeeId }),
  setNotes: (notes) => set({ notes }),
  setDiscount: (discount) => {
    set({ discount });
    get().calculateTotals();
  },

  calculateTotals: () => {
    const { items, taxRate, discount } = get();

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;

    set({ subtotal, taxAmount, total });
  },
}));
