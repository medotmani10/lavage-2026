import { useState, useEffect } from 'react';

import { usePOSStore } from '../stores/usePOSStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Search, Clock, PlusCircle } from 'lucide-react';
import { Input } from '../components/Input';

interface Service {
  id: string;
  name: string;
  category: 'lavage' | 'vidange' | 'pneumatique';
  description?: string;
  price: number;
  duration_minutes: number;
  commission_rate: number;
  active?: boolean;
}

interface ServicesPanelProps {
  ticketCategory?: 'lavage' | 'vidange' | 'pneumatique';
}

export function ServicesPanel({ ticketCategory }: ServicesPanelProps) {

  const { addItem } = usePOSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'lavage' | 'vidange' | 'pneumatique'>('lavage');

  useEffect(() => {
    if (ticketCategory) {
      setTimeout(() => setActiveTab(ticketCategory), 0);
    }
  }, [ticketCategory]);

  const { data: allServices, isLoading } = useSupabaseData<Service>('services');
  const services = allServices.filter(s => s.active !== false).sort((a, b) => a.name.localeCompare(b.name));

  const filteredServices = (services || []).filter((service) => {
    const name = service.name;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = service.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  const handleAddService = (service: Service) => {
    addItem({
      id: service.id,
      type: 'service',
      name: service.name,
      price: service.price,
      quantity: 1,
      category: service.category,
    });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)]">
      <div className="p-4 border-b border-[var(--border)] shrink-0">
        <Input
          type="text"
          placeholder="Rechercher un service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5 text-gray-400" />}
          className="bg-[var(--bg-panel)] h-10 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-panel)] border-b border-[var(--border)] shrink-0 overflow-x-auto scrollbar-none">
        {(['lavage', 'vidange', 'pneumatique'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${activeTab === tab
              ? 'bg-primary-500 text-white border-primary-500 shadow-md'
              : 'text-[var(--text-secondary)] hover:text-white bg-[var(--bg-base)] border-[var(--border)]'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray bg-[var(--bg-base)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[var(--text-muted)]">
              <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Chargement...</p>
            </div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex items-center justify-center h-full opacity-50">
            <p className="text-base font-medium text-[var(--text-muted)]">Aucun service trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => handleAddService(service)}
                className="flex flex-col text-left p-3.5 rounded-xl transition-all duration-200 bg-[var(--bg-panel)] border border-[var(--border-lg)] hover:border-primary-500/50 hover:bg-primary-500/10 group shadow-sm active:scale-95"
              >
                <div className="flex justify-between items-start mb-2 w-full gap-2">
                  <h3 className="font-bold text-sm text-white group-hover:text-primary-400 leading-tight">
                    {service.name}
                  </h3>
                  <PlusCircle className="w-4 h-4 text-primary-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="mt-auto pt-2 flex items-center justify-between w-full border-t border-[var(--border)]">
                  <span className="text-sm font-black text-primary-500">
                    {service.price} DA
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded">
                    <Clock className="w-3 h-3" />
                    {service.duration_minutes}m
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
