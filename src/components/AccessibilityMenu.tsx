import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Type, Check } from 'lucide-react';

const fontSizeOptions = [
  { value: 'normal' as const, label: 'Normal', description: 'Default text size' },
  { value: 'large' as const, label: 'Large', description: 'Easier to read' },
  { value: 'extra-large' as const, label: 'Extra Large', description: 'Maximum visibility' },
];

export const AccessibilityMenu = () => {
  const { fontSize, setFontSize } = useAccessibility();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Text Size">
          <Type className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
        <DropdownMenuLabel>Text Size</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {fontSizeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setFontSize(option.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            {fontSize === option.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
