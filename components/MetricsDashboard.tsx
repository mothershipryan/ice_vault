import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabaseClient.ts';

interface MetricsData {
    totalRecords: number;
    totalStorageBytes: number;
    stateDistribution: { state: string; count: number }[];
    recentLogs: any[];
}

const MetricsDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t, i18n } = useTranslation();
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);

                // 1. Total Records and Storage from 'videos' table
                const { data: videos, error: vErr } = await supabase
                    .from('videos')
                    .select('file_size, state_code, blind_index_state');

                if (vErr) throw vErr;

                const totalRecords = videos?.length || 0;
                const totalStorageBytes = videos?.reduce((sum, v) => sum + (v.file_size || 0), 0) || 0;

                // 2. State Distribution
                const stateMap: Record<string, number> = {};
                videos?.forEach(v => {
                    const stateLabel = v.state_code || `Encrypted (${v.blind_index_state.slice(0, 6)})`;
                    stateMap[stateLabel] = (stateMap[stateLabel] || 0) + 1;
                });
                const stateDistribution = Object.entries(stateMap)
                    .map(([state, count]) => ({ state, count }))
                    .sort((a, b) => b.count - a.count);

                // 3. Recent activity logs
                const { data: logs, error: lErr } = await supabase
                    .from('activity_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (lErr) throw lErr;

                setMetrics({
                    totalRecords,
                    totalStorageBytes,
                    stateDistribution,
                    recentLogs: logs || [],
                });
            } catch (err: any) {
                console.error('Metrics Fetch Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) return (
        <div className="flex justify-center items-center p-12 transition-colors">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 transition-colors">
            {t('app.metrics_error')}: {error}
        </div>
    );

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase truncate border-b-2 border-blue-500 pb-1 transition-colors">
                    {t('app.metrics_title')}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 dark:bg-zinc-800/20 border border-zinc-500/20 p-6 rounded-xl backdrop-blur-sm transition-colors duration-300">
                    <p className="text-zinc-500 text-xs uppercase font-mono mb-2">{t('app.total_records')}</p>
                    <p className="text-3xl font-bold text-zinc-100">{metrics?.totalRecords.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 dark:bg-zinc-800/20 border border-zinc-500/20 p-6 rounded-xl backdrop-blur-sm transition-colors duration-300">
                    <p className="text-zinc-500 text-xs uppercase font-mono mb-2">{t('app.encrypted_storage')}</p>
                    <p className="text-3xl font-bold text-zinc-100">{formatSize(metrics?.totalStorageBytes || 0)}</p>
                </div>
            </div>

            <section>
                <h3 className="text-lg font-bold text-zinc-300 mb-4 flex items-center gap-2 transition-colors">
                    {t('app.distribution_by_state')}
                </h3>
                <div className="bg-zinc-900/50 dark:bg-zinc-800/20 border border-zinc-500/20 rounded-xl overflow-hidden backdrop-blur-sm transition-colors duration-300">
                    <div className="overflow-x-auto">
                        {metrics?.stateDistribution.length === 0 ? (
                            <p className="p-8 text-center text-zinc-600 italic transition-colors">
                                {t('app.no_records_data')}
                            </p>
                        ) : (
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-zinc-800/50 dark:bg-zinc-900/50 text-zinc-500 font-mono text-xs uppercase transition-colors">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">{t('app.state')}</th>
                                        <th className="px-6 py-3 font-medium">{t('app.record_count')}</th>
                                        <th className="px-6 py-3 font-medium">{t('app.share')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-500/10">
                                    {metrics?.stateDistribution.map((item) => (
                                        <tr key={item.state} className="hover:bg-red-500/5 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-zinc-300 group-hover:text-red-400">
                                                {item.state}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400 font-mono">
                                                {item.count}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden transition-colors">
                                                        <div
                                                            className="h-full bg-red-600 rounded-full transition-colors"
                                                            style={{ width: `${(item.count / (metrics?.totalRecords || 1)) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-zinc-600 text-[10px] font-mono transition-colors">
                                                        {Math.round((item.count / (metrics?.totalRecords || 1)) * 100)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-bold text-zinc-300 mb-4 flex items-center gap-2 transition-colors">
                    {t('app.recent_activity')}
                </h3>
                <div className="bg-zinc-900/50 dark:bg-zinc-800/20 border border-zinc-500/20 rounded-xl overflow-hidden backdrop-blur-sm transition-colors duration-300">
                    <div className="overflow-x-auto">
                        {metrics?.recentLogs.length === 0 ? (
                            <p className="p-8 text-center text-zinc-600 italic transition-colors">
                                {t('app.no_recent_logs')}
                            </p>
                        ) : (
                            <table className="w-full text-left text-sm min-w-[500px]">
                                <thead className="bg-zinc-800/50 dark:bg-zinc-900/50 text-zinc-500 font-mono text-xs uppercase transition-colors">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">{t('app.action')}</th>
                                        <th className="px-6 py-3 font-medium">{t('app.description')}</th>
                                        <th className="px-6 py-3 font-medium">{t('app.timestamp')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-500/10">
                                    {metrics?.recentLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-red-500/5 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-zinc-400 group-hover:text-red-400 transition-colors">{log.action_type}</td>
                                            <td className="px-6 py-4 text-zinc-300 transition-colors">{log.description}</td>
                                            <td className="px-6 py-4 text-zinc-500 font-mono text-xs transition-colors">
                                                {new Date(log.created_at).toLocaleString(i18n.language)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MetricsDashboard;
