import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TradeSelector from '../components/setup/TradeSelector';
import JurisdictionSelector from '../components/setup/JurisdictionSelector';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Setup() {
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [jurisdiction, setJurisdiction] = useState('');
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
  };

  const handleSave = async () => {
    setLoading(true);
    await base44.auth.updateMe({
      preferred_trades: selectedTrades,
      preferred_jurisdiction: jurisdiction
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
              onChange={setJurisdiction}
            />

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