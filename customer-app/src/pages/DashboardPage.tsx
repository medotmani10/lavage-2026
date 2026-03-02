import { useAuthStore } from '../stores/useAuthStore';
import { QrCode, Award, Sparkles } from 'lucide-react';

export default function DashboardPage() {
    const { customer } = useAuthStore();
    const points = customer?.loyalty_points || 0;

    // Logic: 10 points = 1 free wash. 1 point per wash.
    const pointsToNextReward = 10 - (points % 10);
    const progressPercent = ((points % 10) / 10) * 100;
    const rewardsAvailable = Math.floor(points / 10);

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Loyalty Card */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-900 border border-primary-500/30 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10">
                    <Award className="w-48 h-48 -mt-10 -mr-10" />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="mb-6">
                        <h2 className="text-white/80 font-medium uppercase tracking-wider text-sm mb-1">Programme Fidélité</h2>
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black text-white leading-none">{points}</span>
                            <span className="text-white/70 font-semibold mb-1">pts</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center text-sm text-balance text-white/90 font-medium mb-3">
                            <span>{pointsToNextReward} lavages avant un lavage <span className="text-yellow-300 font-bold">gratuit</span> !</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-yellow-300 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {rewardsAvailable > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 flex items-center gap-4 animate-bounce-slow">
                    <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-yellow-500">Récompense(s) disponible(s) !</h3>
                        <p className="text-sm text-yellow-500/80">Vous avez {rewardsAvailable} lavage(s) gratuit(s) en attente.</p>
                    </div>
                </div>
            )}

            {/* Digital Member Card (QR) */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-medium)] rounded-[32px] p-6 text-center mt-8">
                <h3 className="text-lg font-bold text-white mb-2">Carte Membre</h3>
                <p className="text-sm text-[var(--text-muted)] mb-6 text-balance">
                    Présentez ce QR Code à la caisse pour cumuler automatiquement vos points.
                </p>

                <div className="bg-white p-4 rounded-3xl inline-block mx-auto mb-4">
                    <div className="w-48 h-48 flex items-center justify-center">
                        {/* Realistically, implement `react-qr-code` or similar here. For now, visual dummy */}
                        <QrCode className="w-full h-full text-black opacity-80" />
                        <div className="absolute font-black tracking-[0.2em] text-black">
                            {customer?.phone}
                        </div>
                    </div>
                </div>

                <p className="text-lg font-mono font-bold text-primary-400 tracking-wider">
                    {customer?.phone?.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
                </p>
            </div>

        </div>
    );
}
