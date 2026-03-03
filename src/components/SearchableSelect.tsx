import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder: string;
    icon?: React.ReactNode;
    className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder, icon, className = "" }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => {
                    if (!isOpen && buttonRef.current) {
                        const rect = buttonRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        // If there is less than 250px below and more space above, open upwards
                        if (spaceBelow < 250 && spaceAbove > spaceBelow) {
                            setDropdownPosition('top');
                        } else {
                            setDropdownPosition('bottom');
                        }
                    }
                    setIsOpen(!isOpen);
                }}
                className="w-full h-10 px-3 flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl text-sm transition-all hover:border-[var(--border-heavy)] text-left"
            >
                {icon && <div className="shrink-0">{icon}</div>}
                <span className={`flex-1 truncate ${!selectedOption ? 'text-[var(--text-muted)]' : 'text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                {value ? (
                    <X
                        className="w-4 h-4 text-[var(--text-muted)] hover:text-white shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                    />
                ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                )}
            </button>

            {isOpen && (
                <div
                    className={`absolute left-0 right-0 bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-xl shadow-2xl z-[99999] overflow-hidden animate-in fade-in duration-200 ${dropdownPosition === 'top' ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'
                        }`}
                    style={{ transform: 'translateZ(1000px)' }}
                >
                    <div className="p-2 border-b border-[var(--border)]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Rechercher..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray p-1 bg-[var(--bg-surface)] relative z-[99999]">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                                Aucun résultat trouvé
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${value === opt.value
                                        ? 'bg-primary-500 text-white'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
