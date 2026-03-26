import React, { useState } from 'react';
import { Check, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { TRADES } from '@/lib/trades';

export default function TradeSelector({ selectedTrades, onSelectionChange }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleTrade = (trade) => {
    const updated = selectedTrades.includes(trade)
      ? selectedTrades.filter(t => t !== trade)
      : [...selectedTrades, trade];
    onSelectionChange(updated);
  };

  const filtered = TRADES.filter(trade =>
    trade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">Select Your Trades / Professions</label>

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
                <span className="text-gray-500">Search and select professions...</span>
              ) : (
                <span className="text-gray-700">{selectedTrades.length} selected</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-4 max-h-96 overflow-y-auto" align="start">
          <input
            type="text"
            placeholder="Search professions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <div className="space-y-1">
            {filtered.map((trade) => (
              <div
                key={trade}
                onClick={() => toggleTrade(trade)}
                className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100"
              >
                <Check
                  className={`h-4 w-4 shrink-0 ${selectedTrades.includes(trade) ? "opacity-100" : "opacity-0"}`}
                />
                <span className="text-sm">{trade}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No profession found.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedTrades.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedTrades.map(trade => (
            <Badge
              key={trade}
              variant="secondary"
              className="cursor-pointer bg-navy-100 text-navy-800 hover:bg-navy-200"
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