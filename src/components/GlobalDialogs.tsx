import { useDialogStore } from '../stores/useDialogStore';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Button } from './Button';
import { useEffect, useCallback, useState } from 'react';

export function GlobalDialogs() {
    const { isOpen, title, message, type, isConfirm, isPrompt, promptPlaceholder, confirmText, cancelText, closeDialog } = useDialogStore();
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            closeDialog(isPrompt ? null : false);
        }
    }, [isOpen, closeDialog, isPrompt]);

    useEffect(() => {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [handleEscape]);

    if (!isOpen) return null;

    const Icon = {
        info: Info,
        success: CheckCircle,
        warning: AlertTriangle,
        error: XCircle,
    }[type];

    const colors = {
        info: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
        success: 'text-green-400 bg-green-500/10 border-green-500/20',
        warning: 'text-warning-400 bg-warning-500/10 border-warning-500/20',
        error: 'text-danger-400 bg-danger-500/10 border-danger-500/20',
    }[type];

    const isDangerAction = type === 'error' || type === 'warning';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
            onClick={() => closeDialog(isPrompt ? null : false)}
        >
            <div
                className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 ${colors}`}>
                    <Icon className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className={`text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap ${isPrompt ? 'mb-4' : 'mb-8'}`}>
                    {message}
                </p>

                {isPrompt && (
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={promptPlaceholder}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 mb-6 font-mono text-center tracking-widest uppercase"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                closeDialog(inputValue);
                            }
                        }}
                    />
                )}

                <div className="flex w-full gap-3">
                    {isConfirm && (
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => closeDialog(isPrompt ? null : false)}
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        className={`flex-1 ${isConfirm && isDangerAction ? '!bg-danger-500 hover:!bg-danger-600 shadow-[var(--shadow-glow-danger)] text-white border-transparent' : ''}`}
                        onClick={() => closeDialog(isPrompt ? inputValue : true)}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
