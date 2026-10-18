import React, { useState } from 'react';
import { Mail, Search, Copy, Check, Radio, Send, Clock, User, ShieldCheck } from 'lucide-react';
import { EmailMessage } from '../types/mail';
import { extractOtpCodes } from '../services/mtempmail';

interface EmailListProps {
  messages: EmailMessage[];
  selectedMessageId: string | number | null;
  onSelectMessage: (msg: EmailMessage) => void;
  onSimulateEmail: (presetType: 'github' | 'discord' | 'login') => void;
  isRefreshing: boolean;
}

export const EmailList: React.FC<EmailListProps> = ({
  messages,
  selectedMessageId,
  onSelectMessage,
  onSimulateEmail,
  isRefreshing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  const filteredMessages = messages.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      (m.from_email && m.from_email.toLowerCase().includes(q))
    );
  });

  const handleCopyOtpQuick = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedOtp(code);
    setTimeout(() => setCopiedOtp(null), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/90 overflow-hidden shadow-xl">
      {/* Search Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Inbox</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-slate-800 text-slate-300 font-mono">
                {messages.length}
              </span>
            </h2>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative flex-1 max-w-[200px] sm:max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => {
            const isSelected = selectedMessageId === msg.id;
            const otps = extractOtpCodes(msg);
            const primaryOtp = otps.find((o) => o.type === 'numeric' || o.type === 'alphanumeric');

            return (
              <div
                key={msg.id}
                onClick={() => onSelectMessage(msg)}
                className={`p-3.5 transition cursor-pointer relative group ${
                  isSelected
                    ? 'bg-slate-800/80 border-l-4 border-l-emerald-500'
                    : 'hover:bg-slate-800/40 bg-slate-900/30'
                }`}
              >
                {/* Simulated badge */}
                {msg.isSimulated && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Test Simulated
                  </span>
                )}

                {/* Sender & Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 font-semibold uppercase shrink-0">
                      {msg.from.charAt(0) || <User className="w-3 h-3" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {msg.from}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(msg.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Subject */}
                <h3 className="text-xs font-medium text-slate-300 group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                  {msg.subject || '(No Subject)'}
                </h3>

                {/* Body Snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 font-normal">
                  {msg.body_text || msg.content || 'Click to view email content...'}
                </p>

                {/* Quick OTP pill if detected */}
                {primaryOtp && (
                  <div className="mt-1 pt-1.5 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{primaryOtp.code}</span>
                    </div>

                    <button
                      onClick={(e) => handleCopyOtpQuick(e, primaryOtp.code)}
                      className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded transition cursor-pointer"
                      title="Copy code directly"
                    >
                      {copiedOtp === primaryOtp.code ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-full min-h-[380px]">
            {/* Animated Radar Pulse */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Radio className={`w-8 h-8 text-emerald-400 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`} />
              </div>
              <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping opacity-30" />
            </div>

            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Waiting for incoming emails...
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Send an email to your disposable address or try our instant simulator below to test verification codes right now.
            </p>

            {/* Test Simulation Buttons */}
            <div className="w-full max-w-xs p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                <Send className="w-3 h-3 text-cyan-400" />
                <span>Simulate incoming test mail:</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => onSimulateEmail('github')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-xs text-slate-300 hover:text-emerald-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>GitHub 2FA Verification Code</span>
                  <span className="text-[10px] font-mono text-emerald-400">#492018</span>
                </button>
                <button
                  onClick={() => onSimulateEmail('discord')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-xs text-slate-300 hover:text-indigo-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>Discord Login Confirmation</span>
                  <span className="text-[10px] font-mono text-indigo-400">Action Link</span>
                </button>
                <button
                  onClick={() => onSimulateEmail('login')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-xs text-slate-300 hover:text-cyan-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>Service One-Time Passcode</span>
                  <span className="text-[10px] font-mono text-cyan-400">#783921</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
