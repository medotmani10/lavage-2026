import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { LayoutDashboard, CarFront, History, LogOut } from 'lucide-react';

export default function CustomerLayout() {
    const { customer, signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Mon Garage', path: '/garage', icon: CarFront },
        { name: 'Historique', path: '/history', icon: History },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col pt-4 sm:pt-6">

            {/* Top Bar */}
            <header className="px-6 mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-white">Espace Client</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        Content de vous revoir, <span className="text-primary-400 font-medium">{customer?.full_name?.split(' ')[0]}</span>
                    </p>
                </div>

                <button
                    onClick={handleSignOut}
                    className="p-2.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-medium)] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 pb-28">
                <Outlet />
            </main>

            {/* Bottom Navigation (Mobile Native Feel) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] border-t border-[var(--border-medium)] pb-safe-area shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-50">
                <div className="flex justify-around items-center h-20 px-2 max-w-md mx-auto relative">

                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all
                ${isActive ? 'text-primary-400 scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] scale-100'}
              `}
                        >
                            <item.icon className={`w-6 h-6 transition-all duration-300`} />
                            <span className="text-[10px] font-bold tracking-wider uppercase">{item.name}</span>
                        </NavLink>
                    ))}

                </div>
            </nav>

        </div>
    );
}
