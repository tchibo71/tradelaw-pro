import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TradeSelector from '../components/setup/TradeSelector';
import JurisdictionSelector from '../components/setup/JurisdictionSelector';
import { BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

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

export default function Setup() {
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [jurisdiction, setJurisdiction] = useState('');
  const [localJurisdictions, setLocalJurisdictions] = useState([]);
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    if (currentUser.preferred_trades) {
      setSelectedTrades(currentUser.preferred_trades);
    }
    if (currentUser.preferred_jurisdiction) {
      setJurisdiction(currentUser.preferred_jurisdiction);
    }
    if (currentUser.preferred_local_jurisdictions) {
      setLocalJurisdictions(currentUser.preferred_local_jurisdictions);
    }
  };

  const toggleLocal = (local) => {
    setLocalJurisdictions(prev =>
      prev.includes(local) ? prev.filter(l => l !== local) : [...prev, local]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    await base44.auth.updateMe({
      preferred_trades: selectedTrades,
      preferred_jurisdiction: jurisdiction,
      preferred_local_jurisdictions: localJurisdictions,
    });
    setLoading(false);
    window.location.href = createPageUrl('Dashboard');
  };

  const canProceed = selectedTrades.length > 0 && jurisdiction;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-600 mb-4">
            <BookOpen className="h-8 w-8 text-gray-900" />
          </div>
          <h1 className="text-4xl font-bold text-navy-900 mb-2">TradeProLaw</h1>
          <p className="text-gray-600 text-lg">Master the laws of your trade</p>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="bg-gradient-to-r from-navy-100 to-indigo-100">
            <CardTitle className="text-2xl text-navy-900">Setup Your Profile</CardTitle>
            <CardDescription className="text-blue-900">
              Select your trades and jurisdiction to get started with personalized study material
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <JurisdictionSelector
              value={jurisdiction}
              onChange={(v) => { setJurisdiction(v); setLocalJurisdictions([]); }}
            />

            {/* Local jurisdictions */}
            {(LOCAL_JURISDICTIONS[jurisdiction] || []).length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Local Jurisdiction <span className="font-normal text-gray-500">(optional — activates local amendments)</span>
                </label>
                <Input
                  placeholder="Search cities / counties..."
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  className="mb-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {(LOCAL_JURISDICTIONS[jurisdiction] || [])
                    .filter(l => l.toLowerCase().includes(localSearch.toLowerCase()))
                    .map(local => (
                      <button
                        key={local}
                        type="button"
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

            <TradeSelector
              selectedTrades={selectedTrades}
              onSelectionChange={setSelectedTrades}
              jurisdiction={jurisdiction}
            />

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={!canProceed || loading}
                className="w-full h-14 text-lg bg-navy-600 hover:bg-navy-700 text-gray-900"
              >
                {loading ? 'Saving...' : 'Save & Continue'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {!canProceed && (
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Please select at least one trade and a jurisdiction to continue
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}