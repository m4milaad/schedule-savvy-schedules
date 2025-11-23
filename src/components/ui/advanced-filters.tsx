import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

export interface FilterConfig {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ActiveFilter {
  id: string;
  value: string;
  label: string;
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onFilterChange: (filters: ActiveFilter[]) => void;
  onClear: () => void;
}

export function AdvancedFilters({
  filters,
  activeFilters,
  onFilterChange,
  onClear,
}: AdvancedFiltersProps) {
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({});

  const handleApply = () => {
    const newFilters: ActiveFilter[] = Object.entries(tempFilters)
      .filter(([_, value]) => value)
      .map(([id, value]) => {
        const config = filters.find((f) => f.id === id);
        return {
          id,
          value,
          label: config?.label || id,
        };
      });
    onFilterChange(newFilters);
  };

  const handleRemoveFilter = (id: string) => {
    const newFilters = activeFilters.filter((f) => f.id !== id);
    onFilterChange(newFilters);
    setTempFilters((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const renderFilterInput = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={tempFilters[filter.id] || ''}
            onValueChange={(value) =>
              setTempFilters((prev) => ({ ...prev, [filter.id]: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={tempFilters[filter.id] || ''}
            onChange={(e) =>
              setTempFilters((prev) => ({ ...prev, [filter.id]: e.target.value }))
            }
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder}
            value={tempFilters[filter.id] || ''}
            onChange={(e) =>
              setTempFilters((prev) => ({ ...prev, [filter.id]: e.target.value }))
            }
          />
        );

      default:
        return (
          <Input
            type="text"
            placeholder={filter.placeholder}
            value={tempFilters[filter.id] || ''}
            onChange={(e) =>
              setTempFilters((prev) => ({ ...prev, [filter.id]: e.target.value }))
            }
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="font-semibold">Filter Options</div>
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2">
                  <Label htmlFor={filter.id}>{filter.label}</Label>
                  {renderFilterInput(filter)}
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={handleApply} size="sm" className="flex-1">
                  Apply
                </Button>
                <Button
                  onClick={() => {
                    setTempFilters({});
                    onClear();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilters.map((filter) => (
          <Badge key={filter.id} variant="secondary" className="gap-1">
            {filter.label}: {filter.value}
            <button
              onClick={() => handleRemoveFilter(filter.id)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
