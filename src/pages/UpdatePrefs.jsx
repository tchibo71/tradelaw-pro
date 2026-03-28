import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const NEW_TRADES = [
  "Septic System Installer", "Septic Tank Installer", "Septic System Designer",
  "Septic System Inspector", "Septic System Pumper", "Well Driller", "Well Pump Installer",
  "Grading Contractor", "Landscape Architect", "Mason", "Concrete Contractor",
  "Concrete Finisher", "Site Work Contractor", "Remodeling Contractor", "Plumber",
  "Roofer", "Roofing Contractor", "Gutter Installer", "Block Mason",
  "Drainage Contractor", "Underground Drainage Contractor", "Surface Drainage Contractor",
  "Stormwater Drainage Contractor", "French Drain Installer", "Catch Basin Installer",
  "Culvert Installer", "Erosion Control Contractor", "Sediment Control Contractor",
  "Stormwater BMP Installer", "Sump Pump Installer", "Drainage System Designer",
  "Retaining Wall Contractor", "Segmental Retaining Wall Installer",
  "Concrete Retaining Wall Contractor", "Timber Retaining Wall Installer",
  "Gabion Wall Installer", "Geo-Grid & MSE Wall Contractor",
  "Hardscaping Contractor", "Paver Installer", "Interlocking Concrete Paver Installer",
  "Natural Stone Paver Installer", "Permeable Paver Installer",
  "Patio & Walkway Contractor", "Driveway Contractor",
  "Excavation Contractor", "Landscape Contractor", "Trenching Contractor", "Earthmoving Contractor"
];

export default function UpdatePrefs() {
  const [status, setStatus] = useState('Updating...');

  useEffect(() => {
    base44.auth.updateMe({ preferred_trades: NEW_TRADES })
      .then(() => setStatus('✅ Done! Preferences updated. You can close this page.'))
      .catch(e => setStatus('❌ Error: ' + e.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
        <p className="text-lg font-semibold text-gray-800">{status}</p>
        {status.startsWith('✅') && (
          <a href="/" className="mt-4 inline-block text-indigo-600 underline text-sm">Go to Dashboard</a>
        )}
      </div>
    </div>
  );
}