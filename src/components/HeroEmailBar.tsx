import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Sparkles, Globe, Trash2, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DomainOption, TempEmail } from '../types/mail';

interface HeroEmailBarProps {
  currentEmail: TempEmail | null;
  domains: DomainOption[];
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  onGenerateNew: (customDomain?: string) => void;
  onRefreshMessages: () => void;
  onDeleteCurrent: () => void;
  onOpenQr: () => void;
  isGenerating: boolean;
  isRefreshing: boolean;
  secondsUntilNextPoll: number;
  pollInterval: number;
}

export const HeroEmailBar: React.FC<HeroEmailBarProps> = ({
  currentEmail,
  domains,
  selectedDomain,
  onSelectDomain,
  onGenerateNew,
  onRefreshMessages,
  onDeleteCurrent,
  onOpenQr,
  isGenerating,
  isRefreshing,
  secondsUntilNextPoll,
  pollInterval,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!currentEmail?.email) return;

    try {
      await navigator.clipboard.writeText(currentEmail.email);
      setCopied(true);

      confetti({
        particleCount: 28,
        spread: 45,
        origin: { y: 0.3 },
        colors: ['#10b981', '#06b6d4', '#6366f1'],
        disableForReducedMotion: true,
      });

      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const progressPercent = Math.max(0, Math.min(100, (1 - secondsUntilNextPoll / pollInterval) * 100));

  const currentDomainDisplay = currentEmail?.domain || selectedDomain;

  return (
    <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl p-4 sm:p-6 lg:p-7 backdrop-blur-xl">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: Status, Domain Selector, and Helper note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Active Mailbox
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            @{currentDomainDisplay}
          </span>
        </div>

        {/* Domain selection picker */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 hidden xs:inline">Domain:</span>
            <select
              value={currentDomainDisplay}
              onChange={(e) => {
                const dom = e.target.value;
                onSelectDomain(dom);
              }}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              {domains.map((d) => (
                <option key={d.domain} value={d.domain} className="bg-slate-900 text-slate-200">
                  @{d.domain} ({d.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Centerpiece: Email Address Display Box */}
      <div className="relative group">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/90 rounded-xl p-2.5 sm:p-3 sm:pl-5 shadow-inner focus-within:border-emerald-500/50 transition-all">
          {/* Email Text */}
          <div className="flex-1 min-w-0 pr-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              Your Disposable Email Address
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-xl lg:text-2xl font-bold text-slate-100 tracking-tight truncate select-all">
                {currentEmail?.email || 'Generating temporary mailbox...'}
              </span>
            </div>
          </div>

          {/* Action buttons on the right of the input */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!currentEmail?.email}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 scale-[1.02]'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/15 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* QR Code button */}
            <button
              onClick={onOpenQr}
              disabled={!currentEmail?.email}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer"
              title="Show QR Code"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
            </button>

            {/* New random address */}
            <button
              onClick={() => onGenerateNew(selectedDomain)}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-medium transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Generate a fresh random address on current domain"
            >
              <Sparkles className={`w-4 h-4 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Random</span>
            </button>

            {/* Delete button */}
            <button
              onClick={onDeleteCurrent}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Delete this inbox and get a fresh one"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auto-refresh countdown progress line */}
        <div className="w-full bg-slate-900 h-1 mt-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom Bar: Quick manual refresh + Tips */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3.5 pt-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshMessages}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Check Inbox'}</span>
          </button>
          <span className="text-[11px] text-slate-500">
            Auto-checking every {pollInterval}s
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Messages are saved securely in your session</span>
        </div>
      </div>
    </div>
  );
};
