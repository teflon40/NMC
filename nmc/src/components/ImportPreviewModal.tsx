import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export interface ParsedRow {
    indexNo: string;
    lastname: string;
    othernames: string;
    programName: string;
    programId?: number; // Exists if valid
    isValid: boolean;
    errors: string[];
}

interface ImportPreviewModalProps {
    isOpen: boolean;
    rows: ParsedRow[];
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, rows, onConfirm, onCancel, isSubmitting }) => {
    if (!isOpen) return null;

    const validCount = rows.filter(r => r.isValid).length;
    const invalidCount = rows.length - validCount;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl flex flex-col max-h-[90vh] animate-[fadeIn_0.2s_ease-out]">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        Preview Candidate Import
                    </h3>
                    <button onClick={onCancel} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary bar */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Total Rows:</span>
                        <span className="font-bold text-gray-900">{rows.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">Valid:</span>
                        <span className="font-bold text-green-700">{validCount}</span>
                    </div>
                    {invalidCount > 0 && (
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">Errors:</span>
                            <span className="font-bold text-red-600">{invalidCount}</span>
                        </div>
                    )}
                </div>

                {/* Scrollable Table */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                    {invalidCount > 0 && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <div>
                                <p className="font-bold mb-1">Warning: {invalidCount} rows have errors.</p>
                                <p>Only the {validCount} valid rows will be imported if you proceed.</p>
                            </div>
                        </div>
                    )}

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Index No.</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Last Name</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Other Names</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Program</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Errors</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map((row, i) => (
                                    <tr key={i} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50 hover:bg-red-50'}>
                                        <td className="px-4 py-3">
                                            {row.isValid
                                                ? <CheckCircle className="w-5 h-5 text-green-500" />
                                                : <AlertTriangle className="w-5 h-5 text-red-500" />
                                            }
                                        </td>
                                        <td className="px-4 py-3 font-mono">{row.indexNo || '—'}</td>
                                        <td className="px-4 py-3">{row.lastname || '—'}</td>
                                        <td className="px-4 py-3">{row.othernames || '—'}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={row.programName}>
                                            {row.programName || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-red-600">
                                            {row.errors.join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting || validCount === 0}
                        className="px-6 py-2 font-bold text-white bg-blue-600 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Importing...
                            </>
                        ) : (
                            `Import ${validCount} Candidates`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;
