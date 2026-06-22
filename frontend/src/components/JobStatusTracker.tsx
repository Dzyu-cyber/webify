import type { IJobStatusResponse } from '../hooks/useJobPolling';

interface JobStatusTrackerProps {
  status: IJobStatusResponse;
}

export function JobStatusTracker({ status }: JobStatusTrackerProps) {
  const { state, progress } = status;

  let phaseText = 'Waiting in queue...';
  if (state === 'active') {
    if (progress < 45) {
      phaseText = 'Extracting computed DOM styles via Playwright...';
    } else if (progress >= 45 && progress < 75) {
      phaseText = 'Distilling design system tokens & clustering colors...';
    } else if (progress >= 75) {
      phaseText = 'Formatting design system output with Claude LLM...';
    }
  } else if (state === 'completed') {
    phaseText = 'Design system compiled successfully!';
  } else if (state === 'failed') {
    phaseText = 'Extraction failed.';
  }

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-slate-400">
          Status: <span className="capitalize text-indigo-400 font-semibold">{state}</span>
        </span>
        <span className="text-indigo-400">{progress}%</span>
      </div>

      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/50">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-400">
        {state !== 'completed' && state !== 'failed' && (
          <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        <span className="font-medium text-slate-300">{phaseText}</span>
      </div>
    </div>
  );
}
