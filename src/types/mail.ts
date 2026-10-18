export interface TempEmail {
  id: number | string;
  email: string;
  domain: string;
  expire_at?: string;
  created_at?: string;
  email_token?: string;
  fingerprint?: string;
  createdAtTimestamp: number;
}

export interface DomainOption {
  domain: string;
  type: string;
}

export interface EmailAttachment {
  filename: string;
  size?: string;
  url?: string;
}

export interface EmailMessage {
  id: string | number;
  from: string;
  from_email?: string;
  subject: string;
  date?: string;
  time?: string;
  body_text?: string;
  body_html?: string;
  message?: string;
  content?: string;
  is_seen?: boolean;
  attachments?: EmailAttachment[];
  isSimulated?: boolean;
  receivedAt?: number;
}

export interface DetectedOtp {
  code: string;
  type: 'numeric' | 'alphanumeric' | 'link';
  context?: string;
}
