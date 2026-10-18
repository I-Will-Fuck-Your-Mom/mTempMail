import React from 'react';
import { Mail, Shield, Volume2, VolumeX, QrCode, Clock } from 'lucide-react';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenQr: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  isPolling: boolean;
  secondsUntilNextPoll: number;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  onOpenQr,
  onOpenHistory,
  historyCount,
  isPolling,
  secondsUntilNextPoll,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                mTempMail
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3 h-3" /> Live API
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-400">
              Disposable Temporary Email &bull; Dark Mode
            </p>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Polling Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>Poll: {secondsUntilNextPoll}s</span>
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            title="View email history"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                {historyCount}
              </span>
            )}
          </button>

          {/* QR Code Quick View */}
          <button
            onClick={onOpenQr}
            className="p-2 rounded-lg text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            title="Scan Email QR Code"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800'
                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400 hover:bg-slate-800'
            }`}
            title={soundEnabled ? 'New mail chime enabled' : 'New mail chime muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
