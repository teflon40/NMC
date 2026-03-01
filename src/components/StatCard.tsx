import React from 'react';

interface StatCardProps {
    title: string;
    count: number;
    colorClass: string;
    icon: React.ComponentType<{ className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, colorClass, icon: Icon }) => (
    <div className={`${colorClass} rounded-lg p-6 text-white shadow-sm flex items-center justify-between relative overflow-hidden`}>
        <div className="relative z-10">
            <h3 className="text-[13px] font-medium opacity-90 mb-1">{title}</h3>
            <p className="text-3xl font-bold">{count}</p>
        </div>
        <div className="relative z-10 p-3 bg-white/20 rounded-full border border-white/30">
            <Icon className="w-5 h-5 text-white" />
        </div>
    </div>
);

export default StatCard;
