import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  pageTitle: string;
}

export function MarkdownRenderer({ content, pageTitle }: MarkdownRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2050);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const filename = `${pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_design.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl">
        <span className="text-sm font-semibold text-slate-300">Generated design.md</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Download design.md"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="prose prose-invert max-w-none w-full bg-slate-950 border border-slate-900 rounded-2xl p-6 sm:p-8 overflow-y-auto text-left text-slate-300 font-sans leading-relaxed shadow-inner">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => <h1 className="text-3xl font-extrabold text-slate-100 mt-6 mb-4 border-b border-slate-800 pb-2" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-slate-100 mt-6 mb-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-slate-200 mt-4 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="mb-4 text-slate-300" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-slate-300" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-slate-300" {...props} />,
            li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
            code: ({ node, ...props }) => <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 font-mono text-sm border border-slate-800" {...props} />,
            pre: ({ node, ...props }) => <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto my-4 text-slate-200" {...props} />,
            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-slate-400" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
