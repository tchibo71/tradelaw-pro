import React, { useEffect, useRef } from 'react';

// Level configs: { label, seconds, colorStages: [{atSeconds, color}], pulse, edgeFlash }
export const TIMED_LEVELS = [
  {
    id: 'novice', label: 'Novice', seconds: 60,
    description: '60 seconds — generous for vocabulary building. Clock is visible but not punishing.',
    colorStages: [{ atSeconds: 0, color: 'green' }],
    pulseAt: null, edgeFlash: false,
  },
  {
    id: 'beginner', label: 'Beginner', seconds: 45,
    description: '45 seconds — mild pressure. Yellow warning at 15s.',
    colorStages: [{ atSeconds: 45, color: 'green' }, { atSeconds: 15, color: 'yellow' }],
    pulseAt: null, edgeFlash: false,
  },
  {
    id: 'intermediate_low', label: 'Intermediate Low', seconds: 35,
    description: '35 seconds — read with intent. Yellow at 12s, orange at 6s.',
    colorStages: [{ atSeconds: 35, color: 'green' }, { atSeconds: 12, color: 'yellow' }, { atSeconds: 6, color: 'orange' }],
    pulseAt: null, edgeFlash: false,
  },
  {
    id: 'intermediate_advanced', label: 'Intermediate Advanced', seconds: 25,
    description: '25 seconds — tight. Yellow at 10s, orange at 5s, flash at 3s.',
    colorStages: [{ atSeconds: 25, color: 'green' }, { atSeconds: 10, color: 'yellow' }, { atSeconds: 5, color: 'orange' }],
    pulseAt: 3, edgeFlash: false,
  },
  {
    id: 'advanced', label: 'Advanced', seconds: 18,
    description: '18 seconds — genuinely stressful. Starts yellow, orange at 8s, red at 4s, pulses at 2s.',
    colorStages: [{ atSeconds: 18, color: 'yellow' }, { atSeconds: 8, color: 'orange' }, { atSeconds: 4, color: 'red' }],
    pulseAt: 2, edgeFlash: true,
  },
  {
    id: 'master', label: 'Master', seconds: 12,
    description: '12 seconds — one read-through max. Starts orange, red at 5s, pulses at 3s.',
    colorStages: [{ atSeconds: 12, color: 'orange' }, { atSeconds: 5, color: 'red' }],
    pulseAt: 3, edgeFlash: true,
  },
  {
    id: 'grand_master', label: 'Grand Master', seconds: 7,
    description: '7 seconds — reflex test. You must know it before you finish reading. Typed answers only.',
    colorStages: [{ atSeconds: 7, color: 'red' }],
    pulseAt: 4, edgeFlash: true,
  },
];

export const getLevelConfig = (levelId) => TIMED_LEVELS.find(l => l.id === levelId) || TIMED_LEVELS[0];

const COLOR_CLASSES = {
  green: { text: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500', ring: 'ring-green-400' },
  yellow: { text: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500', ring: 'ring-yellow-400' },
  orange: { text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500', ring: 'ring-orange-400' },
  red: { text: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500', ring: 'ring-red-500' },
};

function getCurrentColor(levelConfig, timeLeft) {
  let color = 'green';
  for (const stage of levelConfig.colorStages) {
    if (timeLeft <= stage.atSeconds) color = stage.color;
    else break;
  }
  // Re-scan correctly (stages sorted descending by atSeconds)
  const sorted = [...levelConfig.colorStages].sort((a, b) => b.atSeconds - a.atSeconds);
  color = sorted[sorted.length - 1]?.color || 'green';
  for (const stage of sorted) {
    if (timeLeft <= stage.atSeconds) { color = stage.color; break; }
  }
  return color;
}

export default function TimerDisplay({ levelConfig, timeLeft, isPaused }) {
  if (!levelConfig) return null;
  const color = getCurrentColor(levelConfig, timeLeft);
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.green;
  const shouldPulse = levelConfig.pulseAt && timeLeft <= levelConfig.pulseAt && timeLeft > 0;
  const pct = Math.max(0, timeLeft / levelConfig.seconds);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      {/* Edge flash overlay — rendered as fixed element in parent via CSS variable */}
      {levelConfig.edgeFlash && timeLeft <= 2 && timeLeft > 0 && !isPaused && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 ${shouldPulse || timeLeft <= 2 ? 'animate-pulse' : ''}`}
          style={{
            boxShadow: `inset 0 0 60px 20px ${color === 'red' ? 'rgba(239,68,68,0.35)' : color === 'orange' ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.3)'}`,
          }}
        />
      )}

      {/* Big timer number */}
      <div
        className={`text-6xl font-black tabular-nums leading-none transition-colors duration-300 ${classes.text} ${shouldPulse && !isPaused ? 'animate-pulse' : ''}`}
        style={{ minWidth: '3ch', textAlign: 'center' }}
      >
        {isPaused ? (
          <span className="text-gray-400 text-4xl">⏸</span>
        ) : timeLeft}
      </div>

      {/* Progress arc / bar */}
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${classes.bg}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {!isPaused && timeLeft <= 3 && timeLeft > 0 && (
        <span className={`text-xs font-bold uppercase tracking-widest ${classes.text}`}>
          {timeLeft === 1 ? 'LAST SECOND' : `${timeLeft}s`}
        </span>
      )}
    </div>
  );
}