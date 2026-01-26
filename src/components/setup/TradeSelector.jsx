import React, { useState } from 'react';
import { Check, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

const TRADES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Carpentry",
  "Masonry",
  "Roofing",
  "Welding",
  "Farrier",
  "Locksmith",
  "Glazier",
  "Painting & Decorating",
  "Drywall Installation",
  "Flooring Installation",
  "Tile Setting",
  "Insulation",
  "Elevator Installation & Repair",
  "Boilermaking",
  "Pipefitting",
  "Sheet Metal Work",
  "Ironworking",
  "Concrete Finishing",
  "Heavy Equipment Operation",
  "Crane Operation",
  "Landscaping",
  "Tree Service",
  "Pest Control",
  "Appliance Repair",
  "Auto Mechanics",
  "Diesel Mechanics",
  "HVAC-R (Refrigeration)",
  "Fire Sprinkler Installation",
  "Fire Alarm Installation",
  "Low Voltage Technician",
  "Telecommunications",
  "Solar Panel Installation"
];

export default function TradeSelector({ selectedTrades, onSelectionChange }) {
  const [open, setOpen] = useState(false);

  const toggleTrade = (trade) => {
    const updated = selectedTrades.includes(trade)
      ? selectedTrades.filter(t => t !== trade)
      : [...selectedTrades, trade];
    onSelectionChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">Select Your Trades</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[44px] text-left"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Briefcase className="h-4 w-4 shrink-0 opacity-50" />
              {selectedTrades.length === 0 ? (
                <span className="text-gray-500">Select trades...</span>
              ) : (
                <span className="text-gray-700">{selectedTrades.length} selected</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search trades..." />
            <CommandEmpty>No trade found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {TRADES.map((trade) => (
                <CommandItem
                  key={trade}
                  onSelect={() => toggleTrade(trade)}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedTrades.includes(trade) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {trade}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedTrades.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedTrades.map(trade => (
            <Badge
              key={trade}
              variant="secondary"
              className="bg-navy-100 text-navy-800 hover:bg-navy-200 cursor-pointer"
              onClick={() => toggleTrade(trade)}
            >
              {trade}
              <span className="ml-1 text-xs">×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}