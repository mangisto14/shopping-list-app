// src/import/ui/ImportLoadingState.tsx
// Extracted from ImportSheet's inline "analyzing" step so it's a
// standalone, reusable loading screen - same content/behavior as
// before, just given its own component so a real AI provider call in
// Phase 2B can drive its message/progress without touching ImportSheet
// itself. UI only: no provider wiring lives here.
interface ImportLoadingStateProps {
  message: string;
  subMessage?: string;
}

export default function ImportLoadingState({ message, subMessage }: ImportLoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div
        className="w-10 h-10 rounded-full border-[3px] border-purple-100 border-t-purple-600 animate-spin"
        role="status"
        aria-label={message}
      />
      <p className="text-sm font-semibold text-gray-700">{message}</p>
      {subMessage && <p className="text-xs text-gray-400">{subMessage}</p>}
    </div>
  );
}
