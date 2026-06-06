import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WhatsAppShareProps {
  lessonTitle: string;
  lessonId: string;
  teacherName?: string;
  dayOfWeek?: number;
  startTime?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const WhatsAppShare = ({ 
  lessonTitle, 
  lessonId, 
  teacherName, 
  dayOfWeek, 
  startTime,
  variant = "outline",
  size = "sm",
  className = ""
}: WhatsAppShareProps) => {
  const { t } = useLanguage();

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const shareViaWhatsApp = () => {
    const inviteUrl = `${window.location.origin}/auth?lesson=${lessonId}`;
    
    let message = `📚 *${lessonTitle}*\n\n`;
    if (teacherName) {
      message += `👨‍🏫 Teacher: ${teacherName}\n`;
    }
    if (dayOfWeek !== undefined && startTime) {
      message += `📅 ${dayNames[dayOfWeek]} at ${formatTime(startTime)}\n`;
    }
    message += `\n🔗 Join the lesson:\n${inviteUrl}\n`;
    message += `\n_Sent from TandemLearn_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (size === "icon") {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={shareViaWhatsApp}
        title={t('teacher.shareWhatsApp')}
        className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${className}`}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={shareViaWhatsApp}
      className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${className}`}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      {t('teacher.shareWhatsApp')}
    </Button>
  );
};
