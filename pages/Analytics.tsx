import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, MousePointerClick, Eye, Navigation } from 'lucide-react';
import api from '../src/lib/api';
import StatCard from '../src/components/StatCard';

const fetchSummary = async (days: number) => (await api.get(`/analytics/summary?days=${days}`)).data;
const fetchPageViews = async (days: number) => (await api.get(`/analytics/page-views?days=${days}&limit=5`)).data;
const fetchActiveUsers = async (days: number) => (await api.get(`/analytics/active-users?days=${days}`)).data;
const fetchRecentActivity = async (limit: number) => (await api.get(`/analytics/recent?limit=${limit}`)).data;

const Analytics: React.FC = () => {
    const { data: summary = {} } = useQuery({ queryKey: ['analytics-summary'], queryFn: () => fetchSummary(30) });
    const { data: pageViews = [] } = useQuery({ queryKey: ['analytics-pageviews'], queryFn: () => fetchPageViews(30) });
    const { data: activeUsers } = useQuery({ queryKey: ['analytics-activeusers'], queryFn: () => fetchActiveUsers(7) });
    const { data: recentActivity = [] } = useQuery({ queryKey: ['analytics-recent'], queryFn: () => fetchRecentActivity(10) });

    // Calculate totals from summary
    let totalEvents = 0;
    let totalPageViews = 0;
    Object.entries(summary).forEach(([type, dates]) => {
        const typeCount = Object.values(dates as Record<string, number>).reduce((a, b) => a + b, 0);
        totalEvents += typeCount;
        if (type === 'page_view') totalPageViews += typeCount;
    });

    return (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <h1 className="text-2xl font-bold text-gray-800">Analytics Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total Events (30d)"
                    count={totalEvents}
                    colorClass="bg-[#1BB3FA] bg-gradient-to-r from-[#1BB3FA] to-[#34BEFE]"
                    icon={Activity}
                />
                <StatCard
                    title="Active Users (7d)"
                    count={activeUsers?.count || 0}
                    colorClass="bg-[#41B855] bg-gradient-to-r from-[#41B855] to-[#51C765]"
                    icon={Users}
                />
                <StatCard
                    title="Page Views (30d)"
                    count={totalPageViews}
                    colorClass="bg-[#F85A7E] bg-gradient-to-r from-[#F85A7E] to-[#F1638D]"
                    icon={Eye}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-blue-500" /> Top Pages (30d)
                    </h3>
                    {pageViews.length === 0 ? (
                        <p className="text-gray-400 text-sm italic py-4 text-center">No page view data available</p>
                    ) : (
                        <div className="space-y-4">
                            {pageViews.map((pv: any, index: number) => {
                                const max = pageViews[0].views;
                                const width = `${Math.max((pv.views / max) * 100, 2)}%`;
                                return (
                                    <div key={pv.url} className="relative">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-mono text-gray-600 truncate mr-4">{pv.url}</span>
                                            <span className="font-bold text-gray-800">{pv.views}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-green-500" /> Recent Activity
                    </h3>
                    {recentActivity.length === 0 ? (
                        <p className="text-gray-400 text-sm italic py-4 text-center">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((act: any) => (
                                <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <div className="mt-0.5 p-1.5 bg-blue-50 text-blue-600 rounded">
                                        {act.eventType === 'page_view' ? <Eye className="w-3 h-3" /> : <MousePointerClick className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {act.eventType} <span className="font-normal text-gray-500">at</span> {act.pageUrl}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            By {act.user?.name || act.userId || 'Anonymous'} • {new Date(act.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
