import React, { useState, useEffect, useRef } from 'react';
import { Timer, Calculator, Clock, Play, Pause, RotateCcw, Volume2, Shield } from 'lucide-react';
import { verifyCloakCode, evaluateDecoySignature, setArchiveUnlocked } from '../utils/cloakCodes';

interface CloakScreenProps {
  onUnlock: () => void;
}

export const CloakScreen: React.FC<CloakScreenProps> = ({ onUnlock }) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'stopwatch' | 'calculator'>('timer');

  // --- Disguise Timer State ---
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Disguise Stopwatch State ---
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchMs(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const formatStopwatch = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // --- Calculator & Unlock Engine ---
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcHistory, setCalcHistory] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCalcInput = (char: string) => {
    setStatusMessage(null);
    setCalcDisplay(prev => {
      if (prev === '0' || prev === 'Error' || prev.startsWith('0x')) {
        return char;
      }
      return prev + char;
    });
  };

  const handleClear = () => {
    setCalcDisplay('0');
    setCalcHistory('');
    setStatusMessage(null);
  };

  const handleCalculateOrVerify = () => {
    const input = calcDisplay.trim();

    // Check if authentic master unlock code: FREEDOM250
    if (verifyCloakCode(input)) {
      setArchiveUnlocked(true);
      onUnlock();
      return;
    }

    // Check decoy traps
    const decoyResult = evaluateDecoySignature(input);
    if (decoyResult.status === 'TRAP_TRIGGERED') {
      setStatusMessage('Error: 0x' + decoyResult.signature.toString(16).toUpperCase());
      setCalcDisplay('0.000');
      return;
    }

    // Standard Math Calculation fallback (acts as a 100% genuine calculator)
    try {
      // Sanitize standard arithmetic expression
      const cleanExpr = input.replace(/×/g, '*').replace(/÷/g, '/');
      if (/^[0-9+\-*/().%\s]+$/.test(cleanExpr)) {
        // Safe evaluation of simple math
        const result = Function(`'use strict'; return (${cleanExpr})`)();
        setCalcHistory(input + ' =');
        setCalcDisplay(String(Number(result.toFixed(6))));
      } else {
        setCalcDisplay('Error');
      }
    } catch {
      setCalcDisplay('Error');
    }
  };

  // Physical Keyboard Listener (allows fast typing of codes like FREEDOM250 on Chromebooks)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focused on a standard text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleCalculateOrVerify();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setCalcDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (/^[a-zA-Z0-9+\-*/.=]$/.test(e.key)) {
        if (e.key === '=') {
          handleCalculateOrVerify();
        } else {
          // If in timer mode, switch to calculator immediately when user begins typing
          if (activeTab !== 'calculator') {
            setActiveTab('calculator');
          }
          handleCalcInput(e.key.toUpperCase());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calcDisplay, activeTab]);

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0] flex flex-col font-sans select-none">
      {/* Top Disguise App Bar (Google Classroom / Material Utility style) */}
      <header className="h-14 border-b border-[#282828] px-6 flex items-center justify-between bg-[#181818]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[#90caf9]">
            <Clock className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm text-[#cccccc] tracking-wide">Standard Utility Clock</span>
        </div>

        {/* Tab Controls (Timer, Stopwatch, Calculator) */}
        <div className="flex bg-[#222222] p-1 rounded-lg border border-[#333333]">
          <button
            onClick={() => setActiveTab('timer')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'timer' ? 'bg-[#333333] text-white shadow-sm' : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            Timer
          </button>
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'stopwatch' ? 'bg-[#333333] text-white shadow-sm' : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Stopwatch
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'calculator' ? 'bg-[#1976d2] text-white shadow-sm' : 'text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Calculator
          </button>
        </div>
      </header>

      {/* Main Cloaked Body */}
      <main className="flex-1 flex items-center justify-center p-4">
        {/* VIEW 1: BASIC TIMER */}
        {activeTab === 'timer' && (
          <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-8 shadow-xl flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider text-[#777777] mb-2 font-mono">Count Down</span>
            <div className="text-6xl font-light font-mono tracking-tight text-white mb-8">
              {formatTimer(timerSeconds)}
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2 w-full mb-8">
              {[5, 15, 25, 45].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(m * 60);
                  }}
                  className="py-2 text-xs font-medium rounded-lg bg-[#242424] hover:bg-[#2d2d2d] text-[#b0b0b0] border border-[#333333] transition"
                >
                  +{m}m
                </button>
              ))}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition ${
                  isTimerRunning
                    ? 'bg-[#d32f2f] text-white hover:bg-[#c62828]'
                    : 'bg-[#1976d2] text-white hover:bg-[#1565c0]'
                }`}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isTimerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                className="px-4 py-3 rounded-xl bg-[#282828] hover:bg-[#333333] text-[#aaaaaa] border border-[#3a3a3a] transition"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Discreet switch to calculator */}
            <div className="mt-8 pt-4 border-t border-[#262626] w-full flex justify-between items-center text-xs text-[#666666]">
              <span>Study Session Timer v2.1</span>
              <button
                onClick={() => setActiveTab('calculator')}
                className="text-[#90caf9] hover:underline flex items-center gap-1"
              >
                <Calculator className="w-3.5 h-3.5" />
                Open Calculator
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: BASIC STOPWATCH */}
        {activeTab === 'stopwatch' && (
          <div className="w-full max-w-md bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-8 shadow-xl flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider text-[#777777] mb-2 font-mono">Elapsed Time</span>
            <div className="text-5xl font-light font-mono tracking-tight text-white mb-8">
              {formatStopwatch(stopwatchMs)}
            </div>

            <div className="flex gap-4 w-full mb-4">
              <button
                onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition ${
                  isStopwatchRunning
                    ? 'bg-[#d32f2f] text-white hover:bg-[#c62828]'
                    : 'bg-[#2e7d32] text-white hover:bg-[#1b5e20]'
                }`}
              >
                {isStopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isStopwatchRunning ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setIsStopwatchRunning(false);
                  setStopwatchMs(0);
                }}
                className="px-4 py-3 rounded-xl bg-[#282828] hover:bg-[#333333] text-[#aaaaaa] border border-[#3a3a3a] transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: SECRET UNLOCK CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#333333] rounded-2xl p-5 shadow-2xl flex flex-col">
            {/* Screen Display */}
            <div className="bg-[#121212] border border-[#282828] rounded-xl p-4 mb-4 text-right">
              <div className="text-xs font-mono text-[#777777] h-5 truncate">
                {calcHistory || (statusMessage ? statusMessage : 'MATH READY')}
              </div>
              <div className="text-3xl font-mono text-white font-medium tracking-wider overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                {calcDisplay}
              </div>
            </div>

            {/* Hidden Input field for direct typing/pasting */}
            <input
              ref={inputRef}
              type="text"
              value={calcDisplay}
              onChange={e => setCalcDisplay(e.target.value.toUpperCase())}
              className="sr-only"
              aria-label="Calculator input"
            />

            {/* Calculator Keypad */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleClear}
                className="h-12 rounded-xl bg-[#374151] hover:bg-[#4b5563] text-white font-medium text-sm transition"
              >
                C
              </button>
              <button
                onClick={() => handleCalcInput('(')}
                className="h-12 rounded-xl bg-[#282828] hover:bg-[#333333] text-[#b0b0b0] font-medium text-sm transition"
              >
                (
              </button>
              <button
                onClick={() => handleCalcInput(')')}
                className="h-12 rounded-xl bg-[#282828] hover:bg-[#333333] text-[#b0b0b0] font-medium text-sm transition"
              >
                )
              </button>
              <button
                onClick={() => handleCalcInput('/')}
                className="h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-sm transition"
              >
                ÷
              </button>

              <button
                onClick={() => handleCalcInput('7')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                7
              </button>
              <button
                onClick={() => handleCalcInput('8')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                8
              </button>
              <button
                onClick={() => handleCalcInput('9')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                9
              </button>
              <button
                onClick={() => handleCalcInput('*')}
                className="h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-sm transition"
              >
                ×
              </button>

              <button
                onClick={() => handleCalcInput('4')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                4
              </button>
              <button
                onClick={() => handleCalcInput('5')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                5
              </button>
              <button
                onClick={() => handleCalcInput('6')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                6
              </button>
              <button
                onClick={() => handleCalcInput('-')}
                className="h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-sm transition"
              >
                -
              </button>

              <button
                onClick={() => handleCalcInput('1')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                1
              </button>
              <button
                onClick={() => handleCalcInput('2')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                2
              </button>
              <button
                onClick={() => handleCalcInput('3')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                3
              </button>
              <button
                onClick={() => handleCalcInput('+')}
                className="h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium text-sm transition"
              >
                +
              </button>

              <button
                onClick={() => handleCalcInput('0')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                0
              </button>
              <button
                onClick={() => handleCalcInput('.')}
                className="h-12 rounded-xl bg-[#262626] hover:bg-[#303030] text-white font-medium text-base transition"
              >
                .
              </button>
              <button
                onClick={() => setCalcDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'))}
                className="h-12 rounded-xl bg-[#282828] hover:bg-[#333333] text-[#b0b0b0] font-medium text-sm transition"
                title="Backspace"
              >
                ⌫
              </button>
              <button
                onClick={handleCalculateOrVerify}
                className="h-12 rounded-xl bg-[#1976d2] hover:bg-[#1565c0] text-white font-bold text-lg shadow-lg transition"
              >
                =
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2a2a2a] flex justify-between items-center text-[11px] text-[#555555]">
              <span>Calculator Ready</span>
              <span>Hardware Keyboard Enabled</span>
            </div>
          </div>
        )}
      </main>

      {/* Disguise Footer */}
      <footer className="h-9 border-t border-[#222222] px-6 flex items-center justify-between text-[11px] text-[#666666] bg-[#141414]">
        <span>Chrome OS System Tools • v118.0</span>
        <div className="flex items-center gap-4">
          <span>Battery: 98%</span>
          <span>Synced</span>
        </div>
      </footer>
    </div>
  );
};
