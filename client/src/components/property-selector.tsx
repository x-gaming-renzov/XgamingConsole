import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Database, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertySelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const propertyCategories = {
  event: {
    label: "Event Properties",
    icon: Database,
    properties: [
      "amount",
      "revenue", 
      "price",
      "quantity",
      "duration",
      "score",
      "level",
      "session_id",
      "device_type",
      "platform",
      "version",
      "source",
      "medium",
      "campaign"
    ]
  },
  user: {
    label: "User Properties", 
    icon: User,
    properties: [
      "user_id",
      "age",
      "gender",
      "country",
      "city",
      "plan_type",
      "signup_date",
      "last_seen",
      "total_purchases",
      "lifetime_value"
    ]
  },
  segment: {
    label: "Segments",
    icon: Users,
    properties: [
      "premium_users",
      "active_users",
      "new_users",
      "returning_users",
      "high_value_users",
      "mobile_users",
      "web_users"
    ]
  }
};

export default function PropertySelector({ 
  label, 
  value, 
  onChange, 
  placeholder = "Search or enter property name...",
  className 
}: PropertySelectorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all properties with their categories
  const allProperties = Object.entries(propertyCategories).flatMap(([categoryKey, category]) =>
    category.properties.map(property => ({
      name: property,
      category: categoryKey,
      categoryLabel: category.label,
      icon: category.icon
    }))
  );

  const filteredProperties = allProperties.filter(property =>
    property.name.toLowerCase().includes(value.toLowerCase()) && property.name !== value
  );

  const handleSelect = (propertyName: string) => {
    onChange(propertyName);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setFocused(true);
    if (value.length > 0 && filteredProperties.length > 0) {
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
    
    if (newValue.length > 0 && filteredProperties.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Group filtered properties by category
  const groupedProperties = filteredProperties.reduce((acc, property) => {
    if (!acc[property.category]) {
      acc[property.category] = [];
    }
    acc[property.category].push(property);
    return acc;
  }, {} as Record<string, typeof filteredProperties>);

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
        
        {showSuggestions && filteredProperties.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
            {Object.entries(groupedProperties).map(([categoryKey, properties]) => {
              const category = propertyCategories[categoryKey as keyof typeof propertyCategories];
              const Icon = category.icon;
              
              return (
                <div key={categoryKey}>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center space-x-2">
                    <Icon className="w-3 h-3" />
                    <span>{category.label}</span>
                  </div>
                  <div className="p-1">
                    {properties.slice(0, 5).map((property) => (
                      <button
                        key={property.name}
                        type="button"
                        onClick={() => handleSelect(property.name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="font-medium">{property.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 