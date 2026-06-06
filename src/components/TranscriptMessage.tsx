import { User, GraduationCap, Clock } from "lucide-react";

interface TranscriptMessageProps {
  message: string;
}

export const TranscriptMessage = ({ message }: TranscriptMessageProps) => {
  // Parse speaker, content, and timestamp from message line
  // Format: [Speaker]: content | timestamp
  const speakerMatch = message.match(/^\[(.*?)\]:\s*(.*)/);
  
  if (!speakerMatch) {
    // Plain text without speaker label
    return (
      <div className="py-2 px-4 text-muted-foreground italic">
        {message}
      </div>
    );
  }

  const speaker = speakerMatch[1];
  const fullContent = speakerMatch[2];
  
  // Check if there's a timestamp (separated by |)
  const timestampMatch = fullContent.match(/^(.*?)\s*\|\s*(.+)$/);
  const content = timestampMatch ? timestampMatch[1] : fullContent;
  const timestamp = timestampMatch ? timestampMatch[2] : null;
  
  const isTeacher = speaker === "Teacher";

  return (
    <div
      className={`py-3 px-4 mb-2 rounded-lg border-l-4 ${
        isTeacher
          ? "bg-primary/5 border-l-primary"
          : "bg-accent/10 border-l-accent"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Speaker Icon */}
        <div
          className={`mt-0.5 p-1.5 rounded-full ${
            isTeacher
              ? "bg-primary/10 text-primary"
              : "bg-accent/20 text-accent"
          }`}
        >
          {isTeacher ? (
            <GraduationCap className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div
              className={`text-sm font-semibold ${
                isTeacher ? "text-primary" : "text-accent"
              }`}
            >
              {speaker}
            </div>
            {timestamp && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timestamp}</span>
              </div>
            )}
          </div>
          <div className="text-base leading-relaxed break-words">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};
