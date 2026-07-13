// src/components/live/TypingIndicator.tsx
interface TypingIndicatorProps {
  user: string;
  avatar: string;
}

// Google Docs-style "someone is typing" chip: avatar, name, and three
// staggered bouncing dots. Built from Tailwind's built-in animate-bounce
// with per-dot inline animationDelay - no animation plugin is installed
// in this project.
export default function TypingIndicator({ user, avatar }: TypingIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-xs font-medium border border-amber-100 transition-all">
      <span>{avatar}</span>
      <span>{user} מקליד/ה</span>
      <span className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}
