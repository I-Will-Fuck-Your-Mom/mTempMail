import React from 'react';
import { X, Clock, Copy, Check, Trash2, ArrowRight } from 'lucide-react';
import { TempEmail } from '../types/mail';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TempEmail[];
  currentEmailId: string | number | undefined;
  onSelectEmail: (email: TempEmail) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  currentEmailId,
  onSelectEmail,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (e: React.MouseEvent, email: TempEmail) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email.email);
    setCopiedId(email.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Mailbox History</h3>
              <p className="text-xs text-slate-400">Previously generated temporary inboxes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {history.length > 0 ? (
            history.map((item) => {
              const isCurrent = currentEmailId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectEmail(item);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer relative ${
                    isCurrent
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate pr-2">
                      {item.email}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      Created: {new Date(item.createdAtTimestamp || Date.now()).toLocaleTimeString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleCopy(e, item)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Copy email"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="text-slate-400 flex items-center gap-0.5">
                        Switch <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No previous mailbox history in this session yet.
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">{history.length} saved</span>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 text-red-400 text-xs font-medium transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
