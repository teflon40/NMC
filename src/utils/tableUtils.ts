export const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 50) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-red-50 text-red-700 border-red-200';
};

export const groupResultsByYear = <T extends { academicYear?: string }>(results: T[]) => {
    if (!results) return [];
    const grouped: Record<string, T[]> = {};
    results.forEach(r => {
        const year = r.academicYear || 'Unknown Year';
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(r);
    });
    return Object.keys(grouped).sort().reverse().map(year => ({
        year,
        items: grouped[year]
    }));
};
