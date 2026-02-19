import React from 'react';
import { useTranslation } from 'react-i18next';

const Censorship: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();

    const articles = t('censorship.articles', { returnObjects: true }) as Array<{
        id: string;
        title: string;
        content: string;
        link: string;
    }>;

    // Static images mapping for translated articles
    const images = [
        "https://www.eff.org/files/banner_library/protest-2024-2.jpg",
        "https://static01.nyt.com/images/2026/02/12/multimedia/00biz-ice-social-media-01-bwvf/00biz-ice-social-media-01-bwvf-facebookJumbo.jpg",
        "https://www.eff.org/files/banner_library/effector_banner_5.jpeg",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000"
    ];

    // Static URLs mapping
    const urls = [
        "https://www.eff.org/deeplinks/2026/02/open-letter-tech-companies-protect-your-users-lawless-dhs-subpoenas?utm_source=effector",
        "https://www.nytimes.com/2026/02/13/technology/dhs-anti-ice-social-media.html?unlocked_article_code=1.MFA.X7aE.0itmiKfDD2d6&smid=nytcore-ios-share",
        "https://www.eff.org/deeplinks/2026/02/homeland-security-wants-names-effector-383",
        "https://www.military.com/daily-news/2026/02/17/dhs-collecting-big-tech-users-personal-data-issuing-subpoenas-ice-related-criticism.html"
    ];

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
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase truncate border-b-2 border-red-500 pb-1 transition-colors">
                    {t('censorship.title')}
                </h2>
            </div>

            <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed font-light transition-colors">
                {Array.isArray(articles) && articles.map((article, index) => (
                    <section key={article.id} className="space-y-4 group">
                        <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 shadow-2xl transition-colors">
                            <img
                                src={images[index]}
                                alt={article.title}
                                className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-slate-950 via-transparent to-transparent opacity-60" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-blue-600 dark:text-blue-400 font-bold tracking-widest uppercase text-sm transition-colors">
                                {article.id}. {article.title}
                            </h3>
                            <p>{article.content}</p>
                            <a
                                href={urls[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                {article.link}
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    </section>
                ))}

                <div className="p-4 bg-red-600/10 dark:bg-red-500/10 border border-red-600/20 dark:border-red-500/20 rounded-xl mt-8 transition-colors">
                    <h4 className="text-red-700 dark:text-red-400 font-bold uppercase text-xs tracking-widest mb-2 transition-colors">
                        {t('censorship.notice_title')}
                    </h4>
                    <p className="text-xs text-red-900/60 dark:text-red-200/60 leading-relaxed transition-colors">
                        {t('censorship.notice_text')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Censorship;
