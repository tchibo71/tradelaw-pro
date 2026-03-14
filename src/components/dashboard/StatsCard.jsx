import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

export default function StatsCard({ icon: Icon, label, value, color = 'blue', onReset }) {
  const [confirming, setConfirming] = useState(false);

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    gold: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const handleResetClick = () => {
    if (confirming) {
      onReset();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">{label}</p>
              <p className="text-3xl font-bold text-navy-900">{value}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              {onReset && (
                <button
                  onClick={handleResetClick}
                  className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                    confirming
                      ? 'bg-red-100 text-red-600 font-semibold'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                  {confirming ? 'Confirm?' : 'Reset'}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}