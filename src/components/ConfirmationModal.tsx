import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'text-red-600',
            bg: 'bg-red-50',
            button: 'bg-red-600 hover:bg-red-700',
            border: 'border-red-200'
        },
        warning: {
            icon: 'text-yellow-600',
            bg: 'bg-yellow-50',
            button: 'bg-yellow-600 hover:bg-yellow-700',
            border: 'border-yellow-200'
        },
        info: {
            icon: 'text-blue-600',
            bg: 'bg-blue-50',
            button: 'bg-blue-600 hover:bg-blue-700',
            border: 'border-blue-200'
        }
    };

    const style = colors[type];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                <div className="flex justify-between items-start p-6 border-b border-gray-100">
                    <div className="flex gap-4">
                        <div className={`p-3 rounded-full ${style.bg} ${style.icon}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                            <p className="mt-2 text-sm text-gray-500">{message}</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${style.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
