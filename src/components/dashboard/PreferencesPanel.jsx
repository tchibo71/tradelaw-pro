import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import TradeSelector from '../setup/TradeSelector';
import { CheckCircle2, Edit2, MapPin, Lock } from 'lucide-react';

const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
];

// Local jurisdictions per state (expandable)
const LOCAL_JURISDICTIONS = {
  Tennessee: [
    "Knoxville / Knox County",
    "Nashville / Davidson County",
    "Memphis / Shelby County",
    "Chattanooga / Hamilton County",
    "Johnson City / Washington County",
    "Kingsport / Sullivan County",
    "Clarksville / Montgomery County",
    "Murfreesboro / Rutherford County",
  ],
};

export default function PreferencesPanel({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState(user.preferred_trades || []);
  const [state, setState] = useState(user.preferred_jurisdiction || 'Tennessee');
  const [localJurisdictions, setLocalJurisdictions] = useState(user.preferred_local_jurisdictions || []);
  const [localSearch, setLocalSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const availableLocals = (LOCAL_JURISDICTIONS[state] || []).filter(l =>
    l.toLowerCase().includes(localSearch.toLowerCase())
  );

  const toggleLocal = (local) => {
    setLocalJurisdictions(prev =>
      prev.includes(local) ? prev.filter(l => l !== local) : [...prev, local]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      preferred_trades: selectedTrades,
      preferred_jurisdiction: state,
      preferred_local_jurisdictions: localJurisdictions,
    });
    setSaving(false);
    setEditing(false);
    onSaved({ preferred_trades: selectedTrades, preferred_jurisdiction: state, preferred_local_jurisdictions: localJurisdictions });
  };

  if (!editing) {
    return (
      <Card className="shadow-lg border-2 mb-8">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              {/* Federal — always on */}
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">Federal (always active)</span>
              </div>
              {/* State */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">State: <span className="font-bold text-indigo-900">{state}</span></span>
              </div>
              {/* Local jurisdictions */}
              {localJurisdictions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {localJurisdictions.map(l => (
                    <Badge key={l} className="bg-amber-100 text-amber-900 border border-amber-300 text-xs">{l}</Badge>
                  ))}
                </div>
              )}
              {/* Trades */}
              <div className="flex flex-wrap gap-1 mt-1">
                {(user.preferred_trades || []).map(t => (
                  <Badge key={t} className="bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs">{t}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-2 mb-8">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 pb-3">
        <CardTitle className="text-lg text-indigo-900">Edit Study Preferences</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Layer 1 — Federal always on */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Lock className="h-4 w-4 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Federal Law — Always Active</p>
            <p className="text-xs text-blue-700">OSHA 29 CFR 1926/1910, EPA, and all applicable federal statutes are always the baseline floor.</p>
          </div>
        </div>

        {/* Layer 2 — State */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">State</label>
          <Select value={state} onValueChange={(v) => { setState(v); setLocalJurisdictions([]); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Layer 3 — Local jurisdictions */}
        {availableLocals.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Local Jurisdictions <span className="font-normal text-gray-500">(optional — activates local amendments)</span>
            </label>
            <Input
              placeholder="Search cities / counties..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="mb-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {availableLocals.map(local => (
                <button
                  key={local}
                  onClick={() => toggleLocal(local)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-colors font-medium ${
                    localJurisdictions.includes(local)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                  }`}
                >
                  {localJurisdictions.includes(local) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                  {local}
                </button>
              ))}
            </div>
            {localJurisdictions.length > 0 && (
              <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                When local standards are more stringent than state, both will be shown side-by-side in answers.
              </p>
            )}
          </div>
        )}

        {/* Trades */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Trades</label>
          <TradeSelector selectedTrades={selectedTrades} onSelectionChange={setSelectedTrades} jurisdiction={state} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || selectedTrades.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}