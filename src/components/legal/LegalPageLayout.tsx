import { useNavigation } from '@/hooks/useNavigation';

interface LegalPageLayoutProps {
    title: string;
    children: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, children }) => {
    const { back } = useNavigation();

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 border-b border-slate-200 flex items-center sticky top-0 bg-white z-50 shadow-sm">
                <button
                    onClick={back}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label="Go back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="text-base font-semibold text-slate-900 ml-2">{title}</div>
            </header>

            {/* Content - Legal Document Styling */}
            <main className="flex-grow px-6 py-8 max-w-4xl mx-auto w-full">
                <style>{`
                    .legal-document {
                        font-family: 'Georgia', 'Times New Roman', serif;
                        line-height: 1.8;
                        color: #1e293b;
                    }
                    .legal-document h2 {
                        font-size: 1.5rem;
                        font-weight: 700;
                        margin-top: 2rem;
                        margin-bottom: 1rem;
                        color: #0f172a;
                        font-family: 'Georgia', 'Times New Roman', serif;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 0.5rem;
                    }
                    .legal-document h3 {
                        font-size: 1.125rem;
                        font-weight: 600;
                        margin-top: 1.5rem;
                        margin-bottom: 0.75rem;
                        color: #334155;
                        font-family: 'Georgia', 'Times New Roman', serif;
                    }
                    .legal-document h4 {
                        font-size: 1rem;
                        font-weight: 600;
                        margin-top: 1rem;
                        margin-bottom: 0.5rem;
                        color: #475569;
                        font-family: 'Georgia', 'Times New Roman', serif;
                    }
                    .legal-document p {
                        margin-bottom: 1rem;
                        text-align: justify;
                        font-size: 0.9375rem;
                    }
                    .legal-document ul, .legal-document ol {
                        margin-left: 2rem;
                        margin-bottom: 1rem;
                    }
                    .legal-document li {
                        margin-bottom: 0.5rem;
                        text-align: justify;
                    }
                    .legal-document strong, .legal-document b {
                        font-weight: 700;
                        color: #0f172a;
                    }
                    .legal-document em, .legal-document i {
                        font-style: italic;
                        color: #334155;
                    }
                    .legal-document .highlight {
                        background-color: #fef3c7;
                        padding: 0.125rem 0.25rem;
                        border-radius: 0.125rem;
                        font-weight: 600;
                    }
                    .legal-document .important {
                        background-color: #fee2e2;
                        border-left: 4px solid #dc2626;
                        padding: 1rem;
                        margin: 1.5rem 0;
                        border-radius: 0.25rem;
                    }
                    .legal-document .notice {
                        background-color: #dbeafe;
                        border-left: 4px solid #2563eb;
                        padding: 1rem;
                        margin: 1.5rem 0;
                        border-radius: 0.25rem;
                    }
                    .legal-document a {
                        color: #2563eb;
                        text-decoration: underline;
                    }
                    .legal-document a:hover {
                        color: #1d4ed8;
                    }
                    .legal-document .effective-date {
                        font-style: italic;
                        color: #64748b;
                        margin-bottom: 2rem;
                        font-size: 0.875rem;
                    }
                    .legal-document .section-number {
                        font-weight: 700;
                        color: #475569;
                        margin-right: 0.5rem;
                    }
                `}</style>

                <div className="legal-document">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="px-6 py-6 border-t border-slate-200 bg-slate-50 mt-auto">
                <p className="text-xs text-center text-slate-500 font-serif">
                    &copy; {new Date().getFullYear()} Roovo Hospitality Private Limited. All rights reserved.
                </p>
                <p className="text-xs text-center text-slate-400 mt-1 font-serif">
                    This document constitutes a legally binding agreement.
                </p>
            </footer>
        </div>
    );
};

export default LegalPageLayout;
