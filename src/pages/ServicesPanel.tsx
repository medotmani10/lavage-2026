import { useState, useEffect } from 'react';

import { usePOSStore } from '../stores/usePOSStore';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Clock, PlusCircle } from 'lucide-react';
import { Input } from '../components/Input';


interface ServicesPanelProps {
  ticketCategory?: 'lavage' | 'vidange' | 'pneumatique';
}

export function ServicesPanel({ ticketCategory }: ServicesPanelProps) {

  const { addItem } = usePOSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'lavage' | 'vidange' | 'pneumatique'>('lavage');

  useEffect(() => {
    if (ticketCategory) {
      setActiveTab(ticketCategory);
    }
  }, [ticketCategory]);

  const services = useLiveQuery(async () => {
    const all = await db.services.toArray();
    return all.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name));
  });

  const isLoading = services === undefined;

  const filteredServices = (services || []).filter((service: any) => {
    const name = service.name;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = service.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  const handleAddService = (service: any) => {
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
          className="bg-[var(--bg-panel)]"
        />
      </div>

      <div className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] border-b border-[var(--border)] shrink-0 overflow-x-auto scrollbar-none">
        {(['lavage', 'vidange', 'pneumatique'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-all duration-300 ${activeTab === tab
              ? 'bg-primary-500/10 text-primary-400 border border-primary-500/50'
              : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-transparent'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[var(--text-muted)]">
              <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p>Chargement...</p>
            </div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-muted)] font-medium">Aucun service trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => handleAddService(service)}
                className="flex flex-col text-left p-4 rounded-xl transition-all duration-200 bg-[var(--bg-panel)] border border-[var(--border-lg)] hover:border-primary-500/50 hover:bg-primary-500/10 group"
              >
                <div className="flex justify-between items-start mb-2 w-full">
                  <h3 className="font-bold text-[13px] text-white group-hover:text-primary-400 leading-tight">
                    {service.name}
                  </h3>
                  <PlusCircle className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </div>

                <div className="mt-auto pt-2 flex items-center justify-between w-full border-t border-[var(--border)]">
                  <span className="text-sm font-extrabold text-primary-500">
                    {service.price} DZD
                  </span>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--bg-base)] px-1.5 py-0.5 rounded">
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
