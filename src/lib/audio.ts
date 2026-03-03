export const playNotificationChime = () => {
    try {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx!();

        // Low-pass to High-pass arpeggio (luxurious)
        const notes = [
            { f: 523.25, t: 0 },    // C5
            { f: 659.25, t: 0.12 }, // E5
            { f: 783.99, t: 0.24 }, // G5
            { f: 1046.50, t: 0.36 } // C6
        ];

        notes.forEach(({ f, t }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, ctx.currentTime + t);

            const startTime = ctx.currentTime + t;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });
    } catch (e) {
        console.warn('Audio context failed (interaction required?)', e);
    }
};
