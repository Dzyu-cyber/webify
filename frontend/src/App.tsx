import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
            <span>✨ Introducing Webify</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Webify
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto">
            Transform any website URL into a precise, LLM-ready <code className="text-indigo-400 font-mono">design.md</code> token file.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
            <input
              type="url"
              placeholder="Enter website URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1 px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 transition-all"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25"
            >
              Analyze URL
            </button>
          </form>
        </div>

        <div className="text-xs text-slate-600">
          Ready to build the extraction engine, tokenizer, and API queue.
        </div>
      </div>
    </div>
  )
}

export default App
