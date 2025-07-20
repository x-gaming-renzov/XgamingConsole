import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ChevronDown, 
  Check, 
  CirclePlay,
  X 
} from "lucide-react";

interface Experience {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface ExperienceSelectorProps {
  value?: string;
  onValueChange: (experienceId: string, experience?: Experience) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function ExperienceSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Search and select an experience...",
  label = "Experience",
  required = false
}: ExperienceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Query for experiences
  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['/api/experiences', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '50');
      
      const response = await apiRequest('GET', `/api/experiences?${params.toString()}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
    enabled: isOpen || !!searchTerm,
  });

  // Get selected experience details when value changes
  useEffect(() => {
    if (value && !selectedExperience) {
      const experience = experiences.find((exp: Experience) => exp.id === value);
      if (experience) {
        setSelectedExperience(experience);
      }
    }
  }, [value, experiences, selectedExperience]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (experience: Experience) => {
    setSelectedExperience(experience);
    onValueChange(experience.id, experience);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    setSelectedExperience(null);
    onValueChange("", undefined);
    setSearchTerm("");
    setIsOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "draft":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "paused":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        {/* Selected Experience Display */}
        {selectedExperience && !isOpen ? (
          <div className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-muted/50 cursor-pointer transition-colors"
               onClick={() => !disabled && setIsOpen(true)}>
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <CirclePlay className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate">{selectedExperience.name}</span>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(selectedExperience.status)}`}>
                    {selectedExperience.status}
                  </Badge>
                </div>
                {selectedExperience.description && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {selectedExperience.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        ) : (
          /* Search Input */
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="pl-10 pr-10"
              disabled={disabled}
            />
            <ChevronDown 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 cursor-pointer"
              onClick={() => !disabled && setIsOpen(!isOpen)}
            />
          </div>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : experiences.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No experiences found' : 'No experiences available'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {experiences.map((experience: Experience) => (
                  <div
                    key={experience.id}
                    className="px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelect(experience)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <CirclePlay className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm truncate">{experience.name}</span>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(experience.status)}`}>
                              {experience.status}
                            </Badge>
                          </div>
                          {experience.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {experience.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedExperience?.id === experience.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 