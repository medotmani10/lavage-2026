import { create } from 'zustand';

export type DialogType = 'info' | 'error' | 'success' | 'warning';

interface DialogOptions {
    title?: string;
    message: string;
    type?: DialogType;
    confirmText?: string;
    cancelText?: string;
    isPrompt?: boolean;
    promptPlaceholder?: string;
}

interface DialogState {
    isOpen: boolean;
    message: string;
    title: string;
    type: DialogType;
    isConfirm: boolean;
    isPrompt: boolean;
    promptPlaceholder?: string;
    confirmText: string;
    cancelText: string;
    resolvePromise: ((value: any) => void) | null;

    openDialog: (options: DialogOptions, isConfirm: boolean) => Promise<any>;
    closeDialog: (result: any) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
    isOpen: false,
    message: '',
    title: '',
    type: 'info',
    isConfirm: false,
    isPrompt: false,
    promptPlaceholder: '',
    confirmText: 'OK',
    cancelText: 'Annuler',
    resolvePromise: null,

    openDialog: (options, isConfirm) => {
        // If a dialog is already open, resolve it first
        if (get().isOpen && get().resolvePromise) {
            get().resolvePromise!(false);
        }

        return new Promise((resolve) => {
            set({
                isOpen: true,
                message: options.message,
                title: options.title || (options.type === 'error' ? 'Erreur' : options.type === 'warning' ? 'Attention' : 'Information'),
                type: options.type || 'info',
                isConfirm,
                isPrompt: options.isPrompt || false,
                promptPlaceholder: options.promptPlaceholder || '',
                confirmText: options.confirmText || (isConfirm ? 'Confirmer' : 'OK'),
                cancelText: options.cancelText || 'Annuler',
                resolvePromise: resolve,
            });
        });
    },

    closeDialog: (result) => {
        const resolve = get().resolvePromise;
        if (resolve) resolve(result);
        set({ isOpen: false, resolvePromise: null });
    }
}));

export const showAlert = (message: string, type: DialogType = 'info', title?: string) => {
    return useDialogStore.getState().openDialog({ message, type, title }, false);
};

export const showConfirm = (message: string, title?: string, confirmText?: string) => {
    return useDialogStore.getState().openDialog({ message, title, type: 'warning', confirmText }, true);
};

export const showPrompt = (message: string, title?: string, promptPlaceholder?: string, confirmText?: string) => {
    return useDialogStore.getState().openDialog({ message, title, type: 'warning', confirmText, isPrompt: true, promptPlaceholder }, true);
};
