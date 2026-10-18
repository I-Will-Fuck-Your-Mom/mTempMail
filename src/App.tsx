import { useEffect, useState, useRef, useCallback } from 'react';
import {
  DEFAULT_PUBLIC_API_KEY,
  generateNewEmail,
  getEmailMessages,
  getAvailableDomains,
  playNotificationChime,
  FALLBACK_DOMAINS,
  extractOtpCodes,
} from './services/mtempmail';
import { DomainOption, EmailMessage, TempEmail } from './types/mail';
import { Header } from './components/Header';
import { HeroEmailBar } from './components/HeroEmailBar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { QrCodeModal } from './components/QrCodeModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ShieldAlert, Sparkles, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Default public API key
  const apiKey = DEFAULT_PUBLIC_API_KEY;

  const [domains, setDomains] = useState<DomainOption[]>(FALLBACK_DOMAINS);
  const [selectedDomain, setSelectedDomain] = useState<string>(() => {
    return localStorage.getItem('mtempmail_selected_domain') || 'mtempmail.com';
  });

  // Mailbox State
  const [currentEmail, setCurrentEmail] = useState<TempEmail | null>(() => {
    try {
      const saved = localStorage.getItem('mtempmail_current_email');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Messages for active mailbox
  const [messages, setMessages] = useState<EmailMessage[]>(() => {
    try {
      const savedEmail = localStorage.getItem('mtempmail_current_email');
      if (savedEmail) {
        const parsed = JSON.parse(savedEmail);
        const savedMsgs = localStorage.getItem(`mtempmail_msgs_${parsed.email}`);
        return savedMsgs ? JSON.parse(savedMsgs) : [];
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [history, setHistory] = useState<TempEmail[]>(() => {
    try {
      const saved = localStorage.getItem('mtempmail_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Settings & Toggles
  const [pollInterval, setPollInterval] = useState<number>(() => {
    const saved = localStorage.getItem('mtempmail_poll_interval');
    return saved ? Number(saved) : 10;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('mtempmail_sound');
    return saved !== null ? saved === 'true' : true;
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

  // Loading & Polling indicators
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState(pollInterval);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // New incoming notification toast
  const [newMailAlert, setNewMailAlert] = useState<{ message: EmailMessage; otp?: string } | null>(null);

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Keep a ref of known message IDs to detect truly new incoming messages
  const knownMessageIdsRef = useRef<Set<string | number>>(new Set());

  // Save history to local storage
  useEffect(() => {
    localStorage.setItem('mtempmail_history', JSON.stringify(history));
  }, [history]);

  // Save current email to local storage
  useEffect(() => {
    if (currentEmail) {
      localStorage.setItem('mtempmail_current_email', JSON.stringify(currentEmail));
      localStorage.setItem('mtempmail_selected_domain', currentEmail.domain);
    }
  }, [currentEmail]);

  // Save messages to local storage whenever they change for the current email
  useEffect(() => {
    if (currentEmail?.email) {
      try {
        localStorage.setItem(`mtempmail_msgs_${currentEmail.email}`, JSON.stringify(messages));
      } catch {
        // storage quota
      }
    }
  }, [messages, currentEmail?.email]);

  // Load available domains on start
  useEffect(() => {
    getAvailableDomains(apiKey)
      .then((doms) => {
        if (doms && doms.length > 0) {
          setDomains(doms);
          if (!doms.some((d) => d.domain === selectedDomain)) {
            setSelectedDomain(doms[0].domain);
          }
        }
      })
      .catch((err) => console.warn('Domains fetch error:', err));
  }, [apiKey, selectedDomain]);

  // Populate knownMessageIdsRef from existing messages
  useEffect(() => {
    messages.forEach((m) => knownMessageIdsRef.current.add(m.id));
  }, [messages]);

  // Refresh messages function - MERGES messages and NEVER wipes out existing ones!
  const refreshMessages = useCallback(async () => {
    if (!currentEmail?.email) return;
    setIsRefreshing(true);
    setErrorBanner(null);

    try {
      const fetched = await getEmailMessages(apiKey, currentEmail.email);

      if (fetched.length > 0) {
        let hasBrandNew = false;
        let latestNewMsg: EmailMessage | null = null;

        for (const m of fetched) {
          if (!knownMessageIdsRef.current.has(m.id)) {
            hasBrandNew = true;
            latestNewMsg = m;
            knownMessageIdsRef.current.add(m.id);
          }
        }

        // Merge fetched messages into existing list without ever losing previous messages
        setMessages((prev) => {
          const map = new Map<string, EmailMessage>();
          for (const m of prev) {
            map.set(String(m.id), m);
          }
          for (const m of fetched) {
            map.set(String(m.id), m);
          }
          return Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.date || a.receivedAt || 0).getTime();
            const timeB = new Date(b.date || b.receivedAt || 0).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          });
        });

        if (hasBrandNew && latestNewMsg) {
          if (soundEnabled) {
            playNotificationChime();
          }

          const otps = extractOtpCodes(latestNewMsg);
          const primaryOtp = otps[0]?.code;

          setNewMailAlert({ message: latestNewMsg, otp: primaryOtp });
          setTimeout(() => setNewMailAlert(null), 8000);

          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(latestNewMsg.subject || 'New Temporary Email', {
              body: primaryOtp ? `Verification code: ${primaryOtp}` : latestNewMsg.from,
              icon: '/favicon.ico',
            });
          }
        }
      }
    } catch (err) {
      console.warn('Error polling messages:', err);
    } finally {
      setIsRefreshing(false);
      setSecondsUntilNextPoll(pollInterval);
    }
  }, [apiKey, currentEmail?.email, pollInterval, soundEnabled, notificationsEnabled]);

  // Generate new email address
  const handleGenerateNew = useCallback(async (customDomain?: string, customUsername?: string) => {
    setIsGenerating(true);
    setErrorBanner(null);
    try {
      const dom = customDomain || selectedDomain;
      const newMail = await generateNewEmail(apiKey, dom, customUsername);

      setCurrentEmail(newMail);
      setSelectedDomain(newMail.domain);
      setSelectedMessage(null);
      knownMessageIdsRef.current.clear();

      // Check if this email already had stored messages
      let existingMsgs: EmailMessage[] = [];
      try {
        const saved = localStorage.getItem(`mtempmail_msgs_${newMail.email}`);
        if (saved) existingMsgs = JSON.parse(saved);
      } catch {
        // ignore
      }
      setMessages(existingMsgs);
      existingMsgs.forEach((m) => knownMessageIdsRef.current.add(m.id));

      // Update history
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.email !== newMail.email);
        return [newMail, ...filtered].slice(0, 20);
      });

      setSecondsUntilNextPoll(pollInterval);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate temporary email';
      setErrorBanner(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, selectedDomain, pollInterval]);

  // Domain change handler from dropdown - directly generate fresh address on chosen domain
  const handleSelectDomain = (newDomain: string) => {
    setSelectedDomain(newDomain);
    handleGenerateNew(newDomain);
  };

  // Initial load: generate address if none exists
  useEffect(() => {
    if (!currentEmail) {
      handleGenerateNew();
    } else {
      refreshMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling timer
  useEffect(() => {
    if (!currentEmail?.email) return;

    const timer = setInterval(() => {
      setSecondsUntilNextPoll((prev) => {
        if (prev <= 1) {
          refreshMessages();
          return pollInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentEmail?.email, pollInterval, refreshMessages]);

  // Delete current email
  const handleDeleteCurrent = () => {
    handleGenerateNew(selectedDomain);
  };

  // Switch to an address from history
  const handleSelectHistoryEmail = (hist: TempEmail) => {
    setCurrentEmail(hist);
    setSelectedDomain(hist.domain);
    setSelectedMessage(null);
    knownMessageIdsRef.current.clear();

    // Load messages from localStorage for this specific email
    let storedMsgs: EmailMessage[] = [];
    try {
      const saved = localStorage.getItem(`mtempmail_msgs_${hist.email}`);
      if (saved) storedMsgs = JSON.parse(saved);
    } catch {
      // ignore
    }
    setMessages(storedMsgs);
    storedMsgs.forEach((m) => knownMessageIdsRef.current.add(m.id));

    setSecondsUntilNextPoll(pollInterval);
    setTimeout(() => refreshMessages(), 200);
  };

  // Simulate an incoming test email - ALWAYS stored & persistent!
  const handleSimulateEmail = (presetType: 'github' | 'discord' | 'login') => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    let simMsg: EmailMessage;

    if (presetType === 'github') {
      simMsg = {
        id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        from: 'GitHub Support',
        from_email: 'noreply@github.com',
        subject: `[GitHub] Please verify your device - Code: ${randomCode}`,
        date: new Date().toISOString(),
        body_text: `Hey there,\n\nA sign-in attempt requires verification. Your one-time verification code is:\n\n${randomCode}\n\nThis code will expire in 10 minutes. If you did not make this request, please change your password immediately.\n\nThanks,\nThe GitHub Team`,
        body_html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0d1117; color: #c9d1d9; border-radius: 8px; border: 1px solid #30363d;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #58a6ff; margin: 0 0 8px;">GitHub Device Verification</h2>
              <p style="color: #8b949e; font-size: 14px; margin: 0;">We noticed a login from a new browser</p>
            </div>
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px;">Verification Code</span>
              <div style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #58a6ff; margin: 8px 0;">${randomCode}</div>
              <span style="font-size: 12px; color: #8b949e;">Valid for 10 minutes</span>
            </div>
            <p style="font-size: 13px; color: #8b949e; line-height: 1.5;">If this wasn't you, no action is required—the code will expire automatically.</p>
          </div>
        `,
        isSimulated: true,
        receivedAt: Date.now(),
      };
    } else if (presetType === 'discord') {
      simMsg = {
        id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        from: 'Discord',
        from_email: 'noreply@discord.com',
        subject: 'Discord New Login Location Detected',
        date: new Date().toISOString(),
        body_text: `Hey!\n\nSomeone is trying to log into your Discord account from a new location.\nYour authorization code is: ${randomCode}\n\nOr click here to verify:\nhttps://discord.com/verify?token=discord_${randomCode}\n\nIf this was not you, you can safely ignore this email.`,
        body_html: `
          <div style="font-family: 'Whitney', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 30px; background: #2f3136; color: #dcddde; border-radius: 8px;">
            <h2 style="color: #ffffff; margin-top: 0;">Verify Discord Login</h2>
            <p style="line-height: 1.6;">Someone is attempting to log in to your account. Use the code below or click the button to continue:</p>
            <div style="background: #202225; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #5865F2;">${randomCode}</span>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://discord.com/verify?token=discord_${randomCode}" style="background-color: #5865F2; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 500; display: inline-block;">Verify Login</a>
            </div>
          </div>
        `,
        isSimulated: true,
        receivedAt: Date.now(),
      };
    } else {
      simMsg = {
        id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        from: 'Security Portal',
        from_email: 'auth@service-provider.com',
        subject: `Your One-Time Passcode is ${randomCode}`,
        date: new Date().toISOString(),
        body_text: `Hello,\n\nYour one-time security login passcode is: ${randomCode}.\nIt will expire in 5 minutes.\n\nDo not share this code with anyone.`,
        body_html: `
          <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
            <h2 style="color: #38bdf8; margin: 0 0 12px;">Instant Passcode</h2>
            <p>Your one-time verification passcode is:</p>
            <h1 style="font-family: monospace; font-size: 36px; color: #34d399; letter-spacing: 4px; margin: 16px 0;">${randomCode}</h1>
            <p style="color: #94a3b8; font-size: 12px;">This passcode expires in 5 minutes.</p>
          </div>
        `,
        isSimulated: true,
        receivedAt: Date.now(),
      };
    }

    setMessages((prev) => [simMsg, ...prev]);
    setSelectedMessage(simMsg);
    knownMessageIdsRef.current.add(simMsg.id);

    if (soundEnabled) {
      playNotificationChime();
    }

    setNewMailAlert({ message: simMsg, otp: randomCode });
    setTimeout(() => setNewMailAlert(null), 7000);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('mtempmail_sound', String(next));
    if (next) {
      playNotificationChime();
    }
  };

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(!notificationsEnabled);
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  };

  const handleDeleteMessage = (id: string | number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Sticky Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        isPolling={isRefreshing}
        secondsUntilNextPoll={secondsUntilNextPoll}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-6">
        {/* Error notification if any */}
        {errorBanner && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => handleGenerateNew(selectedDomain)}
              className="px-2.5 py-1 rounded-md bg-red-900/60 hover:bg-red-800 text-red-200 font-semibold cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Hero Email Box */}
        <HeroEmailBar
          currentEmail={currentEmail}
          domains={domains}
          selectedDomain={selectedDomain}
          onSelectDomain={handleSelectDomain}
          onGenerateNew={handleGenerateNew}
          onRefreshMessages={refreshMessages}
          onDeleteCurrent={handleDeleteCurrent}
          onOpenQr={() => setIsQrOpen(true)}
          isGenerating={isGenerating}
          isRefreshing={isRefreshing}
          secondsUntilNextPoll={secondsUntilNextPoll}
          pollInterval={pollInterval}
        />

        {/* Two-Column Mailbox Layout (Left: Inbox list, Right: Email reader) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[560px]">
          {/* Left Column: Email List */}
          <div
            className={`lg:col-span-5 h-[560px] lg:h-[640px] ${
              selectedMessage ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <EmailList
              messages={messages}
              selectedMessageId={selectedMessage?.id || null}
              onSelectMessage={(msg) => setSelectedMessage(msg)}
              onSimulateEmail={handleSimulateEmail}
              isRefreshing={isRefreshing}
            />
          </div>

          {/* Right Column: Email Detail Viewer */}
          <div
            className={`lg:col-span-7 h-[560px] lg:h-[640px] ${
              !selectedMessage ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <EmailDetail
              message={selectedMessage}
              onBack={() => setSelectedMessage(null)}
              onDeleteMessage={handleDeleteMessage}
            />
          </div>
        </div>
      </main>

      {/* Floating Incoming Notification Toast */}
      {newMailAlert && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-100">New Email Received!</h4>
                <p className="text-[11px] text-slate-400 line-clamp-1">{newMailAlert.message.from}</p>
              </div>
            </div>
            <button
              onClick={() => setNewMailAlert(null)}
              className="text-slate-500 hover:text-slate-300 text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {newMailAlert.otp && (
            <div className="mt-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-amber-400">
                OTP: {newMailAlert.otp}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newMailAlert.otp!);
                  confetti({ particleCount: 20, spread: 35 });
                }}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-semibold cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <p>
            Powered by{' '}
            <a
              href="https://mtempmail.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              mtempmail.com public API
            </a>{' '}
            &bull; Fast, Free &amp; Disposable Temporary Mail
          </p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        email={currentEmail?.email || ''}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        currentEmailId={currentEmail?.id}
        onSelectEmail={handleSelectHistoryEmail}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
}
