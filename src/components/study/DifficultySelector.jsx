import React from 'react';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export default function DifficultySelector({ selected, onToggle, dark = false }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-medium ${dark ? 'text-violet-300' : 'text-gray-500'}`}>Difficulty:</span>
      {DIFFICULTIES.map(diff => {
        const isSelected = selected.includes(diff);
        return (
          <button
            key={diff}
            onClick={() => onToggle(diff)}
            className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-all capitalize ${
              isSelected
                ? dark
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-indigo-600 border-indigo-600 text-white'
                : dark
                  ? 'bg-transparent border-gray-600 text-gray-300 hover:border-violet-400'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}
          >
            {diff}
          </button>
        );
      })}
    </div>
  );
}