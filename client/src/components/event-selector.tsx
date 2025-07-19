import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const commonEvents = [
  "user_login",
  "user_signup", 
  "user_logout",
  "session_start",
  "session_end",
  "level_complete",
  "level_start",
  "purchase",
  "tutorial_complete",
  "tutorial_start",
  "game_start",
  "game_end",
  "achievement_unlocked",
  "in_app_purchase",
  "ad_watched"
];

export default function EventSelector({ 
  label, 
  value, 
  onChange, 
  placeholder = "Search or enter event name...",
  className 
}: EventSelectorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredEvents = commonEvents.filter(event =>
    event.toLowerCase().includes(value.toLowerCase()) && event !== value
  );

  const handleSelect = (eventName: string) => {
    onChange(eventName);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setFocused(true);
    if (value.length > 0 && filteredEvents.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length > 0 && filteredEvents.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        
        {showSuggestions && filteredEvents.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            <div className="p-2">
              {filteredEvents.slice(0, 8).map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => handleSelect(event)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  <div className="font-medium">{event}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 