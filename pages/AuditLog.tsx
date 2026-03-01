import React, { useState, useEffect, useCallback } from 'react';
import api from '../src/lib/api';
import {
    Shield, User, Users, BookOpen, Search,
    RefreshCw, Clock, Trash2, PenLine, Plus, Filter
} from 'lucide-react';

const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

function buildReadableDetail(action: string, entity: string, details: any): string {
    if (!details) return `${action} on ${entity}`;
    const body = details.body || details;

    if (action === 'LOGIN') return `User logged in (${body.username || ''}, ${body.role || ''}).`;
    if (action === 'LOGOUT') return `User logged out.`;
    if (action === 'FACTORY_RESET') return `Factory reset executed — all data wiped.`;
    if (action === 'BULK_DELETE') return `Bulk deletion performed on ${entity.toLowerCase()} records.`;
    if (action === 'BULK_IMPORT') return `Bulk import of ${entity.toLowerCase()} records.`;
    if (action === 'FINALIZE') return `Reconciliation finalized for exam result.`;
    if (action === 'CREATE_DUAL') return `Dual-examiner assessment submitted.`;
    if (action === 'UPDATE_PROFILE') return `Profile was updated.`;
    if (action === 'CHANGE_PASSWORD') return `Password was changed.`;

    if (action === 'DELETE') return `Permanently deleted this ${entity.toLowerCase()} record.`;

    if (action === 'CREATE') {
        const name = body.name || body.lastname || body.username || body.title || '';
        return `Created new ${entity.toLowerCase()}${name ? `: ${name}` : ''}.`;
    }

    if (action === 'UPDATE') {
        const changes: string[] = [];
        if (body.name) changes.push(`name set to "${body.name}"`);
        if (body.lastname) changes.push(`last name set to "${body.lastname}"`);
        if (body.othernames) changes.push(`other names set to "${body.othernames}"`);
        if (body.email) changes.push(`email updated to "${body.email}"`);
        if (body.username) changes.push(`username set to "${body.username}"`);
        if (body.password) changes.push('password was changed');
        if (body.status) changes.push(`status changed to "${body.status}"`);
        if (body.maxTasks !== undefined) changes.push(`max tasks set to ${body.maxTasks}`);
        if (changes.length) return `Updated: ${changes.join('; ')}.`;
        return `${entity} record updated.`;
    }

    return `${action} on ${entity}`;
}

/* ─── badge ───────────────────────────────────────── */
const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
    const cfg: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        CREATE: { bg: 'bg-green-100', text: 'text-green-700', icon: <Plus className="w-3 h-3" /> },
        CREATE_DUAL: { bg: 'bg-green-100', text: 'text-green-700', icon: <Plus className="w-3 h-3" /> },
        UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <PenLine className="w-3 h-3" /> },
        UPDATE_PROFILE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <PenLine className="w-3 h-3" /> },
        CHANGE_PASSWORD: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <PenLine className="w-3 h-3" /> },
        DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: <Trash2 className="w-3 h-3" /> },
        BULK_DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: <Trash2 className="w-3 h-3" /> },
        FACTORY_RESET: { bg: 'bg-red-100', text: 'text-red-700', icon: <Trash2 className="w-3 h-3" /> },
        FINALIZE: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Shield className="w-3 h-3" /> },
        LOGIN: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <User className="w-3 h-3" /> },
        LOGOUT: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <User className="w-3 h-3" /> },
    };
    const c = cfg[action] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: null };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text}`}>
            {c.icon}
            {action.replace(/_/g, ' ')}
        </span>
    );
};

/* ─── entity icon ─────────────────────────────────── */
const EntityIcon: React.FC<{ entity: string }> = ({ entity }) => {
    if (entity === 'Student') return <Users className="w-4 h-4 text-indigo-400" />;
    if (entity === 'User') return <User className="w-4 h-4 text-purple-400" />;
    if (entity === 'Program') return <BookOpen className="w-4 h-4 text-teal-400" />;
    if (entity === 'ExamResult') return <Shield className="w-4 h-4 text-orange-400" />;
    if (entity === 'Task') return <BookOpen className="w-4 h-4 text-blue-400" />;
    if (entity === 'System' || entity === 'SystemSetting') return <Shield className="w-4 h-4 text-red-400" />;
    if (entity === 'AssessmentType') return <BookOpen className="w-4 h-4 text-pink-400" />;
    return <Shield className="w-4 h-4 text-gray-400" />;
};

/* ─── main ────────────────────────────────────────── */
const ENTITY_TABS = ['All', 'User', 'Student', 'ExamResult', 'Task', 'Program'] as const;
type EntityTab = typeof ENTITY_TABS[number];

const AuditLog: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Entity tab
    const [activeTab, setActiveTab] = useState<EntityTab>('All');

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchName, setSearchName] = useState('');

    // Entity search dropdown
    const [entityList, setEntityList] = useState<{ id: number; label: string }[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
    const [entitySearch, setEntitySearch] = useState('');
    const [showEntityDropdown, setShowEntityDropdown] = useState(false);

    /* fetch entity list when tab changes */
    useEffect(() => {
        setSelectedEntityId(null);
        setEntitySearch('');
        setEntityList([]);
        if (activeTab === 'All') return;

        // Map tab to API endpoint
        const endpointMap: Record<string, string> = {
            Student: '/students',
            User: '/users',
            Program: '/programs',
            ExamResult: '/results',
            Task: '/tasks',
        };
        const endpoint = endpointMap[activeTab];
        if (!endpoint) return;

        api.get(endpoint, { params: { limit: 200, includeAll: true } })
            .then(r => {
                const data: any[] = r.data.students || r.data.users || r.data.programs
                    || r.data.results || r.data.tasks || r.data.data || r.data || [];
                const items = Array.isArray(data) ? data : [];
                setEntityList(items.map((e: any) => ({
                    id: e.id,
                    label: e.lastname
                        ? `${e.lastname} ${e.othernames} (${e.indexNo})`
                        : e.title || e.name || e.username || `#${e.id}`
                })));
            })
            .catch(() => setEntityList([]));
    }, [activeTab]);

    /* fetch logs */
    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeTab !== 'All') params.append('entity', activeTab);
            if (selectedEntityId) params.append('entityId', String(selectedEntityId));
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const r = await api.get(`/audit/logs?${params}`);
            setLogs(r.data.logs);
            setTotal(r.data.total);
        } catch {
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, selectedEntityId, startDate, endDate]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    /* filtered entity list for dropdown */
    const filteredEntities = entityList.filter(e =>
        e.label.toLowerCase().includes(entitySearch.toLowerCase())
    );

    const selectedLabel = entityList.find(e => e.id === selectedEntityId)?.label || '';

    /* filter logs client-side by name search */
    const displayedLogs = searchName
        ? logs.filter(l => l.user?.name?.toLowerCase().includes(searchName.toLowerCase()))
        : logs;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-600" /> Audit Log
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {total} record{total !== 1 ? 's' : ''} found
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Entity tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {ENTITY_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSelectedEntityId(null); }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        {tab === 'All' ? 'All Activity' : tab === 'ExamResult' ? 'Exam Results' : `${tab}s`}
                    </button>
                ))}
            </div>

            {/* Filters row */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    {/* Entity selector (only when a specific tab is active) */}
                    {activeTab !== 'All' && (
                        <div className="relative">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                Target {activeTab}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={`Search ${activeTab}...`}
                                    value={selectedEntityId ? selectedLabel : entitySearch}
                                    onChange={e => { setEntitySearch(e.target.value); setSelectedEntityId(null); setShowEntityDropdown(true); }}
                                    onFocus={() => setShowEntityDropdown(true)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                                />
                                <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                            {showEntityDropdown && filteredEntities.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                    <div
                                        className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => { setSelectedEntityId(null); setEntitySearch(''); setShowEntityDropdown(false); }}
                                    >
                                        — Show all {activeTab}s —
                                    </div>
                                    {filteredEntities.map(e => (
                                        <div
                                            key={e.id}
                                            className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                                            onClick={() => { setSelectedEntityId(e.id); setEntitySearch(''); setShowEntityDropdown(false); }}
                                        >
                                            {e.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Performed-by name search */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Performed By</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Admin name..."
                                value={searchName}
                                onChange={e => setSearchName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                            />
                            <Filter className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Log cards */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading audit trail...
                    </div>
                ) : displayedLogs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                        <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No audit records found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or date range.</p>
                    </div>
                ) : (
                    displayedLogs.map(log => (
                        <div
                            key={log.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-4 hover:border-blue-100 transition-colors"
                        >
                            {/* Entity icon */}
                            <div className="mt-0.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <EntityIcon entity={log.entity} />
                            </div>

                            {/* Main content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <ActionBadge action={log.action} />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {log.entity} {log.entityId ? `#${log.entityId}` : ''}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-800 mt-1.5 font-medium">
                                    {buildReadableDetail(log.action, log.entity, log.details)}
                                </p>

                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        <span className="font-medium text-gray-600">{log.user?.name || 'Unknown'}</span>
                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${log.user?.role === 'ADMINISTRATOR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {log.user?.role}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(log.createdAt)}
                                    </span>
                                    {log.ipAddress && (
                                        <span className="font-mono text-gray-300">IP: {log.ipAddress}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AuditLog;
