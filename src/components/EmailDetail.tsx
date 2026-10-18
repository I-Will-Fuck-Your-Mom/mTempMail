import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Trash2,
  Clock,
  User,
  ShieldCheck,
  ExternalLink,
  Code,
  FileText,
  Eye,
  Mail,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmailMessage } from '../types/mail';
import { extractOtpCodes } from '../services/mtempmail';

interface EmailDetailProps {
  message: EmailMessage | null;
  onBack: () => void;
  onDeleteMessage: (id: string | number) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  message,
  onBack,
  onDeleteMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'raw'>('html');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedBody, setCopiedBody] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const otps = message ? extractOtpCodes(message) : [];
  const primaryOtp = otps[0];

  // Update iframe content when activeTab is html or message changes
  useEffect(() => {
    if (activeTab === 'html' && iframeRef.current && message) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        // Inject safe base styling suited for dark mode readability while preserving email HTML
        const safeContent = message.body_html || `<p>${message.body_text || 'No message content'}</p>`;
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                body {
                  margin: 16px;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #e2e8f0;
                  background-color: transparent;
                  line-height: 1.6;
                  word-break: break-word;
                }
                a { color: #38bdf8; text-decoration: underline; }
                p { margin-bottom: 1em; }
                table { max-width: 100% !important; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              ${safeContent}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [message, activeTab]);

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8 text-center text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4 text-slate-500">
          <Mail className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">Select an email to read</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Pick any message from the left inbox to view its full contents, verification codes, and attachments.
        </p>
      </div>
    );
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.4 },
      colors: ['#f59e0b', '#10b981', '#38bdf8'],
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyBody = () => {
    const text = message.body_text || message.body_html || '';
    navigator.clipboard.writeText(text);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleDownloadEml = () => {
    const emlContent = `From: ${message.from} <${message.from_email || ''}>\nSubject: ${message.subject}\nDate: ${message.date || new Date().toISOString()}\nContent-Type: text/html; charset=utf-8\n\n${message.body_html || message.body_text || ''}`;
    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(message.subject || 'message').replace(/[^a-zA-Z0-9-_]/g, '_')}.eml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl">
      {/* Top Header & Actions */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer lg:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to list</span>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleCopyBody}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
              title="Copy email text"
            >
              {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedBody ? 'Copied' : 'Copy Body'}</span>
            </button>

            <button
              onClick={handleDownloadEml}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
              title="Download as .eml file"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => onDeleteMessage(message.id)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Delete this message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subject Title */}
        <h1 className="text-base sm:text-lg font-bold text-slate-100 mb-2 leading-snug">
          {message.subject || '(No Subject)'}
        </h1>

        {/* Sender details */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">
              {message.from.charAt(0) || <User className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="font-semibold text-slate-200">{message.from}</span>
              {message.from_email && (
                <span className="text-slate-400 text-[11px] ml-1.5 font-mono">
                  &lt;{message.from_email}&gt;
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{new Date(message.date || Date.now()).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Prominent Verification / OTP Banner if detected */}
      {primaryOtp && (
        <div className="mx-4 my-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Verification Code Detected
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
                    {primaryOtp.code}
                  </span>
                  {primaryOtp.type === 'link' && (
                    <a
                      href={primaryOtp.code}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      Open Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCopyCode(primaryOtp.code)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer active:scale-95 shrink-0"
            >
              {copiedCode === primaryOtp.code ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('html')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'html'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>HTML View</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'text'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Plain Text</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'raw'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            <span>Raw Data</span>
          </button>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <span className="text-[11px] text-slate-400 font-mono">
            {message.attachments.length} attachment(s)
          </span>
        )}
      </div>

      {/* Main Email Body Viewport */}
      <div className="flex-1 overflow-y-auto bg-slate-950/30 p-4 min-h-[300px]">
        {activeTab === 'html' && (
          <div className="w-full h-full min-h-[350px] bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden">
            <iframe
              ref={iframeRef}
              title="Email Content"
              sandbox="allow-same-origin"
              className="w-full h-full min-h-[400px] border-0"
            />
          </div>
        )}

        {activeTab === 'text' && (
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
            {message.body_text || message.content || '(No plain text representation available)'}
          </div>
        )}

        {activeTab === 'raw' && (
          <pre className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/80 font-mono text-[11px] text-emerald-400/90 overflow-x-auto select-all leading-normal">
            {JSON.stringify(message, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
