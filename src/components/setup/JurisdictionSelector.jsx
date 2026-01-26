import React from 'react';
import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const JURISDICTIONS = [
  "Federal",
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function JurisdictionSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">Select Jurisdiction</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 opacity-50" />
            <SelectValue placeholder="Select jurisdiction..." />
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {JURISDICTIONS.map((jurisdiction) => (
            <SelectItem key={jurisdiction} value={jurisdiction}>
              {jurisdiction}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}