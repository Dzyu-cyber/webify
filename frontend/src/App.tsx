import { useState } from 'react';
import { UrlInputForm } from './components/UrlInputForm';
import { JobStatusTracker } from './components/JobStatusTracker';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { useJobPolling } from './hooks/useJobPolling';
import { Sliders, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';

function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  const { status, error: pollError, startPolling, stopPolling } = useJobPolling(API_BASE_URL);

  const handleUrlSubmit = async (url: string) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setTargetUrl(url);

    try {
      const res = await fetch(`${API_BASE_URL}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit extraction request.');
      }

      const data = await res.json();
      startPolling(data.jobId);
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setTargetUrl(null);
    setIsSubmitting(false);
    setSubmitError(null);
  };

  const error = submitError || pollError;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Navbar Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/25">
              <Sliders className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Webify
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            v1.0.0
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-start space-y-8">
        {!targetUrl ? (
          // Landing/Welcome State
          <div className="w-full text-center space-y-8 py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                ✨ Design Tokenizer & Generator
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-indigo-300 to-purple-400">
                URL to Design Tokens
              </h1>
              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
                Transform any website URL into a precise, LLM-ready <code className="text-indigo-400 font-mono text-sm px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">design.md</code> file without raw source CSS noise.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl max-w-2xl mx-auto">
              <UrlInputForm onSubmit={handleUrlSubmit} isLoading={isSubmitting} />
            </div>
          </div>
        ) : (
          // Active Processing / Completed State
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-4 py-3 rounded-2xl">
              <div className="truncate pr-4">
                <span className="text-xs text-slate-500 block font-medium">Target URL</span>
                <span className="text-sm font-semibold text-slate-300 truncate block">{targetUrl}</span>
              </div>
              <button
                onClick={handleReset}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Error States */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">Failed to process style extraction</h4>
                  <p className="text-xs text-red-400/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Loading / Progress State */}
            {status && (status.state !== 'completed' && status.state !== 'failed') && (
              <JobStatusTracker status={status} />
            )}

            {/* Results Viewer */}
            {status?.state === 'completed' && status.result && (
              <MarkdownRenderer
                content={status.result}
                pageTitle={status.result.split('\n')[0].replace(/#/g, '').trim() || 'Website'}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/20 py-6 text-center text-xs text-slate-650 font-mono">
        Webify © 2026. Made with Google Antigravity.
      </footer>
    </div>
  );
}

export default App;
