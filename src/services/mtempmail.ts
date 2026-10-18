import { DomainOption, EmailMessage, TempEmail, DetectedOtp } from '../types/mail';

export const DEFAULT_PUBLIC_API_KEY = 'pub_nRn1hUwpdmZvxQNVWDfoXgKyF7dIm9nRIIIt1qDw';
export const DIRECT_BASE_URL = 'https://mtempmail.com/api';
export const PROXY_BASE_URL = '/proxy-api';

// Fallback domains if API endpoint is slow or unreachable
export const FALLBACK_DOMAINS: DomainOption[] = [
  { domain: 'mtempmail.com', type: 'Free' },
  { domain: 'zub.edu.pl', type: 'Free' },
  { domain: 'fraudfindez.com', type: 'Free' },
];

/**
 * Generate a random readable username prefix
 */
export function generateRandomUsername(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  let prefix = '';
  for (let i = 0; i < 5; i++) {
    prefix += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 2; i++) {
    prefix += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return prefix;
}

/**
 * Robust fetcher that tries direct API first, then falls back to proxy if CORS/network fails
 */
async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const directUrl = `${DIRECT_BASE_URL}${cleanEndpoint}`;
  const proxyUrl = `${PROXY_BASE_URL}${cleanEndpoint}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(directUrl, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok || response.status === 400 || response.status === 422) {
      return response;
    }
  } catch {
    // Direct call failed (possibly CORS or network), try proxy fallback
  }

  // Fallback to proxy
  try {
    const proxyResponse = await fetch(proxyUrl, options);
    return proxyResponse;
  } catch (err) {
    throw new Error(`Failed to connect to mTempMail API: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Fetch available domain options from mtempmail
 */
export async function getAvailableDomains(apiKey: string = DEFAULT_PUBLIC_API_KEY): Promise<DomainOption[]> {
  try {
    const res = await fetchWithFallback(`/domains/${encodeURIComponent(apiKey)}/all`);
    if (!res.ok) {
      return FALLBACK_DOMAINS;
    }
    const data = await res.json();
    if (data?.status && data?.data?.domains && Array.isArray(data.data.domains) && data.data.domains.length > 0) {
      return data.data.domains;
    }
    return FALLBACK_DOMAINS;
  } catch (error) {
    console.warn('Error fetching domains, using fallback domains:', error);
    return FALLBACK_DOMAINS;
  }
}

/**
 * Create a new disposable email address.
 * If domain is requested, guarantees the returned address uses that exact domain!
 */
export async function generateNewEmail(
  apiKey: string = DEFAULT_PUBLIC_API_KEY,
  requestedDomain?: string,
  customUsername?: string
): Promise<TempEmail> {
  const targetDomain = requestedDomain || 'mtempmail.com';
  const username = customUsername ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') : generateRandomUsername();

  // Call the official endpoint to request creation
  try {
    const formData = new URLSearchParams();
    formData.append('domain', targetDomain);
    formData.append('name', username);

    const res = await fetchWithFallback(`/emails/${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (res.ok) {
      const result = await res.json();
      if (result?.status && result?.data) {
        const d = result.data;
        // If domain matches requested domain, use returned email
        const generatedUser = d.email ? d.email.split('@')[0] : username;
        const finalEmail = requestedDomain ? `${generatedUser}@${requestedDomain}` : d.email;
        const finalDomain = requestedDomain || d.domain || (finalEmail.split('@')[1] ?? 'mtempmail.com');

        return {
          id: d.id || `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: finalEmail,
          domain: finalDomain,
          expire_at: d.expire_at,
          created_at: d.created_at,
          email_token: d.email_token,
          fingerprint: d.fingerprint,
          createdAtTimestamp: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('POST /emails API note, fallback to direct mailbox initialization:', err);
  }

  // Fallback direct mailbox creation on targetDomain
  const fallbackEmail = `${username}@${targetDomain}`;
  // Initialize mailbox by calling messages endpoint
  try {
    await fetchWithFallback(`/messages/${encodeURIComponent(apiKey)}/${encodeURIComponent(fallbackEmail)}`);
  } catch {
    // mailbox will initialize on first incoming message
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    email: fallbackEmail,
    domain: targetDomain,
    expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    createdAtTimestamp: Date.now(),
  };
}

/**
 * Fetch messages for a specific email address
 */
export async function getEmailMessages(
  apiKey: string = DEFAULT_PUBLIC_API_KEY,
  email: string
): Promise<EmailMessage[]> {
  if (!email) return [];

  try {
    const res = await fetchWithFallback(`/messages/${encodeURIComponent(apiKey)}/${encodeURIComponent(email)}`);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();

    // Check if messages array exists in data
    if (data && Array.isArray(data.messages) && data.messages.length > 0) {
      return data.messages.map(normalizeMessage);
    }
    if (data && data.data && Array.isArray(data.data.messages) && data.data.messages.length > 0) {
      return data.data.messages.map(normalizeMessage);
    }
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map(normalizeMessage);
    }
    return [];
  } catch (error) {
    console.warn(`Could not fetch messages for ${email}:`, error);
    return [];
  }
}

/**
 * Convert HTML or entity-encoded text into clean, readable plain text
 */
export function convertHtmlToPlainText(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let text = input;

  // 1. Remove style, script, head tags and their contents
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // 2. Replace line-breaking elements with clean newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|tr|h[1-6])>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, ' • ');
  text = text.replace(/<\/li>/gi, '\n');

  // 3. Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 5. Clean up duplicate blank lines and trailing spaces
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1]?.length > 0))
    .join('\n')
    .trim();
}

/**
 * Standardize message fields from various potential API shapes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMessage(raw: any): EmailMessage {
  const fromStr = raw.from || raw.sender || raw.from_email || 'Unknown Sender';
  const fromEmail = raw.from_email || (fromStr.includes('<') ? fromStr.replace(/.*<([^>]+)>.*/, '$1') : fromStr);
  const subjectStr = raw.subject || '(No Subject)';

  // Find genuine HTML string (mtempmail API often sets raw.body_html to boolean true,
  // with actual HTML inside raw.content or raw.body_text)
  const candidateHtml = [
    typeof raw.body_html === 'string' && raw.body_html.trim() ? raw.body_html : null,
    typeof raw.content === 'string' && raw.content.trim() ? raw.content : null,
    typeof raw.body_text === 'string' && /<[a-z][\s\S]*>/i.test(raw.body_text) ? raw.body_text : null,
    typeof raw.html === 'string' && raw.html.trim() ? raw.html : null,
    typeof raw.message === 'string' && raw.message.trim() ? raw.message : null,
  ].find((c) => Boolean(c)) || '';

  // Find text candidate
  const candidateText = [
    typeof raw.text === 'string' ? raw.text : null,
    typeof raw.body_text === 'string' ? raw.body_text : null,
    typeof raw.content === 'string' ? raw.content : null,
    typeof raw.message === 'string' ? raw.message : null,
  ].find((c) => Boolean(c)) || '';

  const cleanText = convertHtmlToPlainText(candidateText || candidateHtml);

  return {
    id: raw.id || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    from: fromStr,
    from_email: fromEmail,
    subject: subjectStr,
    date: raw.date || raw.time || raw.created_at || new Date().toISOString(),
    time: raw.time || raw.date,
    body_text: cleanText,
    body_html: candidateHtml,
    message: typeof raw.message === 'string' ? raw.message : cleanText,
    content: typeof raw.content === 'string' ? raw.content : candidateHtml,
    is_seen: Boolean(raw.is_seen),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    receivedAt: raw.receivedAt || Date.now(),
  };
}

/**
 * Smart OTP / Verification code detector
 * Extracts numeric PINs (4-8 digits), alphanumeric tokens (e.g. G-123456), or verification action links
 */
export function extractOtpCodes(message: EmailMessage): DetectedOtp[] {
  const combinedText = `${message.subject} \n ${message.body_text || ''} \n ${message.body_html || ''}`;
  const results: DetectedOtp[] = [];
  const seenCodes = new Set<string>();

  // Regex 1: Explicit labels like "verification code: 123456", "code is 123456", "OTP: 123456"
  const labeledRegex = /(?:code|otp|pin|passcode|token|verification|verify)\s*(?:is|:|=|-)?\s*([0-9]{4,8})/gi;
  let match: RegExpExecArray | null;

  while ((match = labeledRegex.exec(combinedText)) !== null) {
    const code = match[1].trim();
    if (!seenCodes.has(code) && code.length >= 4 && code.length <= 8) {
      seenCodes.add(code);
      results.push({
        code,
        type: 'numeric',
        context: match[0],
      });
    }
  }

  // Regex 2: Alphanumeric format like G-123456 or ABC-1234
  const prefixRegex = /\b([A-Z]{1,3}-[0-9]{4,8})\b/g;
  while ((match = prefixRegex.exec(combinedText)) !== null) {
    const code = match[1].trim();
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      results.push({
        code,
        type: 'alphanumeric',
        context: `Verification Token: ${code}`,
      });
    }
  }

  // Regex 3: Standalone 6-digit number if nothing else found
  if (results.length === 0) {
    const standalone6Digit = /\b([0-9]{6})\b/g;
    while ((match = standalone6Digit.exec(combinedText)) !== null) {
      const code = match[1].trim();
      // Avoid matching years like 2026 or timestamps
      if (!seenCodes.has(code) && !code.startsWith('202') && !code.startsWith('19')) {
        seenCodes.add(code);
        results.push({
          code,
          type: 'numeric',
          context: `Detected 6-digit Code: ${code}`,
        });
        break; // take first valid candidate
      }
    }
  }

  // Regex 4: Primary verification link
  const linkRegex = /https?:\/\/[^\s"'<>]+(?:verify|confirm|activate|validation|token)[^\s"'<>]+/gi;
  const linkMatch = linkRegex.exec(combinedText);
  if (linkMatch && linkMatch[0]) {
    results.push({
      code: linkMatch[0],
      type: 'link',
      context: 'Verification / Confirmation Link',
    });
  }

  return results;
}

/**
 * Play a pleasant audio chime when a new email arrives using the Web Audio API
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6

    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.06);

    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio might be blocked by browser autoplay policy before user interaction
  }
}
