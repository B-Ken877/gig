import { Resend } from 'resend';
import { db } from '@/lib/db';

// ──────────────────────────────────────────────────────────────────────────
// Email system — every in-app notification ALSO sends an email via Resend.
//
// The sender address is "Gig Solutions Team <onboarding@resend.dev>" until the
// gigsolutions.app domain is verified on Resend (requires DNS records —
// SPF/DKIM/DMARC). Once verified, change RESEND_FROM to
// "Gig Solutions Team <noreply@gigsolutions.app>".
//
// All email sends are best-effort: if Resend is down or the API key is invalid,
// the in-app notification + push still go through. Email failures are logged
// but never break the user flow.
// ──────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Domain is verified on Resend (partially — sufficient for sending).
// Uses "contact" instead of "noreply" so replies go to the contact inbox.
const RESEND_FROM = process.env.RESEND_FROM || 'Gig Solutions Team <contact@gigsolutions.app>';

// Lazy-init the Resend client (so we don't crash on import if the key isn't set)
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(RESEND_API_KEY);
  return _resend;
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;  // plain-text fallback
}

/**
 * Send an email via Resend. Best-effort — failures are logged but don't throw.
 * Returns true on success, false on failure.
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('[sendEmail] RESEND_API_KEY not set — skipping email send');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error('[sendEmail] Resend API error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[sendEmail] Failed to send email:', err);
    return false;
  }
}

/**
 * Look up a user's email address by userId.
 * Returns null if the user doesn't exist or has no email.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) return null;
    return user.email;
  } catch (err) {
    console.error('[getUserEmail] Failed to look up user email:', err);
    return null;
  }
}

/**
 * Look up a user's name by userId (for personalizing emails).
 */
export async function getUserName(userId: string): Promise<string | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name || null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Email templates
//
// Each template takes the notification payload + the recipient's name and
// returns { subject, html, text? }. Templates are plain HTML strings (not
// React Email components) to keep the dependency surface small.
// ──────────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Reusable email wrapper — gives every email a consistent header/footer
function emailWrapper(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#0B1A2E;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.5px;">
                Gig Solutions
              </h1>
              <p style="margin:4px 0 0;color:#4ADE80;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:500;">
                Staffing Resource Management
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
                You're receiving this email because you have a Gig Solutions account.
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">
                © ${new Date().getFullYear()} Gig Solutions · <a href="https://gigsolutions.app" style="color:#9ca3af;text-decoration:underline;">gigsolutions.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Reusable CTA button — ensures the URL is absolute (emails need full URLs)
function ctaButton(label: string, url: string | undefined): string {
  if (!url) return '';
  // Convert relative URLs (e.g. "/#messages") to absolute URLs
  const absoluteUrl = url.startsWith('http') ? url : `https://gigsolutions.app${url}`;
  return `
    <a href="${absoluteUrl}" style="display:inline-block;background:#16A34A;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin:16px 0;">
      ${label}
    </a>
  `.trim();
}

// Helper: convert a relative URL to absolute for plain-text email fallbacks
function absUrl(url: string | undefined): string {
  if (!url) return 'https://gigsolutions.app';
  return url.startsWith('http') ? url : `https://gigsolutions.app${url}`;
}

// ─── Templates ────────────────────────────────────────────────────────────

interface MessageNotification {
  recipientName: string;
  title: string;
  body: string;
  url?: string;
  urlLabel?: string;
}

const templates: Record<string, (msg: MessageNotification) => EmailTemplate> = {
  // ─── Job posted (to all agents) ───
  job_post: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">A new job has been posted on Gig Solutions:</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0B1A2E;">${msg.title}</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'View Job', msg.url) : ''}
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Log in to your dashboard to apply.</p>
    `;
    return {
      subject: `New Job Posted: ${msg.title}`,
      html: emailWrapper('New Job Posted', body),
      text: `Hi ${msg.recipientName},\n\nA new job has been posted: ${msg.title}\n\n${msg.body}\n\nView it at ${absUrl(msg.url)}`,
    };
  },

  // ─── New application submitted (to admins) ───
  job_application: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">A new job application has been submitted:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Review Application', msg.url) : ''}
    `;
    return {
      subject: `New Job Application Received`,
      html: emailWrapper('New Application', body),
      text: `Hi ${msg.recipientName},\n\nA new job application has been submitted.\n\n${msg.body}\n\nReview it at ${absUrl(msg.url)}`,
    };
  },

  // ─── Application hired (to agent) ───
  hired: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Congratulations, ${msg.recipientName}!</p>
      <p style="margin:0 0 16px;">Your application has been approved and you've been hired:</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#16A34A;">${msg.title}</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'View Details', msg.url) : ''}
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Check your "My Work" tab for placement details, salary dates, and next steps.</p>
    `;
    return {
      subject: `Congratulations — You're Hired!`,
      html: emailWrapper("You're Hired!", body),
      text: `Congratulations, ${msg.recipientName}!\n\nYour application has been approved and you've been hired.\n\n${msg.title}\n${msg.body}\n\nView details at ${absUrl(msg.url)}`,
    };
  },

  // ─── Application rejected (to agent) ───
  rejected: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">Thank you for your interest in the position. Unfortunately, your application was not selected at this time:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      <p style="margin:0 0 16px;color:#4b5563;">We encourage you to keep applying for other opportunities on the platform — new jobs are posted regularly.</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Browse Jobs', msg.url) : ''}
    `;
    return {
      subject: `Application Update`,
      html: emailWrapper('Application Update', body),
      text: `Hi ${msg.recipientName},\n\nThank you for your interest. Unfortunately, your application was not selected at this time.\n\n${msg.body}\n\nBrowse more jobs at ${absUrl(msg.url)}`,
    };
  },

  // ─── Interview scheduled (to agent) ───
  interview_scheduled: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Congratulations, ${msg.recipientName}!</p>
      <p style="margin:0 0 16px;">After reviewing your application, we'd like to schedule an interview with you:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'View Details in Messages', msg.url) : ''}
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Please reply to the message in your inbox to confirm attendance or request a reschedule.</p>
    `;
    return {
      subject: `Interview Scheduled — Congratulations!`,
      html: emailWrapper('Interview Scheduled', body),
      text: `Congratulations, ${msg.recipientName}!\n\nAfter reviewing your application, we'd like to schedule an interview.\n\n${msg.body}\n\nView details at ${absUrl(msg.url)}`,
    };
  },

  // ─── Interview completed (to agent) ───
  interview_completed: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">Thank you for attending the interview. We'll be in touch soon with the next steps:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      <p style="margin:0 0 16px;color:#4b5563;">If you have any questions in the meantime, feel free to reach out via your messages.</p>
    `;
    return {
      subject: `Interview Completed — Thank You`,
      html: emailWrapper('Interview Completed', body),
      text: `Hi ${msg.recipientName},\n\nThank you for attending the interview. We'll be in touch soon.\n\n${msg.body}`,
    };
  },

  // ─── Interview cancelled (to agent) ───
  interview_cancelled: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">Your interview has been cancelled:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      <p style="margin:0 0 16px;color:#4b5563;">Please check your messages for more information. If you believe this is an error, please contact support.</p>
    `;
    return {
      subject: `Interview Cancelled`,
      html: emailWrapper('Interview Cancelled', body),
      text: `Hi ${msg.recipientName},\n\nYour interview has been cancelled.\n\n${msg.body}\n\nPlease check your messages for more information.`,
    };
  },

  // ─── New message received ───
  message: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">You have a new message:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Read Message', msg.url) : ''}
    `;
    return {
      subject: `${msg.title}`,
      html: emailWrapper('New Message', body),
      text: `Hi ${msg.recipientName},\n\nYou have a new message.\n\n${msg.body}\n\nRead it at ${absUrl(msg.url)}`,
    };
  },

  // ─── ID verification approved (to agent) ───
  id_verified: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">Your identity has been verified! You can now apply for jobs on Gig Solutions.</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Browse Jobs', msg.url) : ''}
    `;
    return {
      subject: `Identity Verified — You Can Now Apply for Jobs`,
      html: emailWrapper('Identity Verified', body),
      text: `Hi ${msg.recipientName},\n\nYour identity has been verified! You can now apply for jobs.\n\n${msg.body}\n\nBrowse jobs at ${absUrl(msg.url)}`,
    };
  },

  // ─── ID verification rejected (to agent) ───
  id_rejected: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">Your ID verification was not approved:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      <p style="margin:0 0 16px;color:#4b5563;">You can resubmit your verification from your dashboard. Please make sure your photos are clear and your ID is valid.</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Resubmit Verification', msg.url) : ''}
    `;
    return {
      subject: `ID Verification — Action Required`,
      html: emailWrapper('ID Verification Update', body),
      text: `Hi ${msg.recipientName},\n\nYour ID verification was not approved.\n\n${msg.body}\n\nPlease resubmit your verification at ${absUrl(msg.url)}`,
    };
  },

  // ─── ID submitted for review (to admins) ───
  id_verification: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">A new ID verification has been submitted and is awaiting review:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Review Verifications', msg.url) : ''}
    `;
    return {
      subject: `New ID Verification Awaiting Review`,
      html: emailWrapper('ID Verification Review', body),
      text: `Hi ${msg.recipientName},\n\nA new ID verification has been submitted.\n\n${msg.body}\n\nReview it at ${absUrl(msg.url)}`,
    };
  },

  // ─── Welcome email (to new agent on registration) ───
  welcome: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">Welcome to Gig Solutions! We're excited to have you on board.</p>
      <p style="margin:0 0 16px;color:#4b5563;">To start applying for jobs and unlock all features of your account, you'll need to verify your identity. It's a quick process that only takes about 3 minutes.</p>
      <p style="margin:0 0 24px;color:#4b5563;">You'll need a valid ID (national ID card or driver's license) and your camera to take a few photos. Once verified, you'll be able to apply for all open positions.</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'Verify Your Identity', msg.url) : ''}
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">If you have any questions, feel free to reach out via the Messages tab once you're logged in. Our team is here to help!</p>
    `;
    return {
      subject: `Welcome to Gig Solutions — Verify Your Identity`,
      html: emailWrapper('Welcome to Gig Solutions', body),
      text: `Hi ${msg.recipientName},\n\nWelcome to Gig Solutions! We're excited to have you on board.\n\nTo start applying for jobs and unlock all features of your account, you'll need to verify your identity. It's a quick process that only takes about 3 minutes.\n\nYou'll need a valid ID (national ID card or driver's license) and your camera to take a few photos. Once verified, you'll be able to apply for all open positions.\n\nVerify your identity at ${absUrl(msg.url)}\n\nIf you have any questions, feel free to reach out via the Messages tab once you're logged in. Our team is here to help!`,
    };
  },

  // ─── Support ticket update ───
  support_ticket: (msg) => {
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;">There's an update on your support ticket:</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'View Ticket', msg.url) : ''}
    `;
    return {
      subject: `${msg.title}`,
      html: emailWrapper('Support Ticket Update', body),
      text: `Hi ${msg.recipientName},\n\nThere's an update on your support ticket.\n\n${msg.body}\n\nView it at ${absUrl(msg.url)}`,
    };
  },
};

/**
 * Build an email template for a given notification type.
 * Falls back to a generic template if the type isn't recognized.
 */
export function buildEmailForNotification(
  type: string | null | undefined,
  msg: MessageNotification
): EmailTemplate | null {
  if (!type) {
    // Generic fallback
    const body = `
      <p style="margin:0 0 16px;">Hi ${msg.recipientName},</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0B1A2E;">${msg.title}</p>
      <p style="margin:0 0 24px;color:#4b5563;">${msg.body}</p>
      ${msg.url ? ctaButton(msg.urlLabel || 'View Details', msg.url) : ''}
    `;
    return {
      subject: msg.title,
      html: emailWrapper(msg.title, body),
      text: `Hi ${msg.recipientName},\n\n${msg.title}\n\n${msg.body}\n\nView at ${absUrl(msg.url)}`,
    };
  }

  const template = templates[type];
  if (!template) {
    // Unknown type — use generic
    return buildEmailForNotification(null, msg);
  }
  return template(msg);
}

/**
 * Send an email notification for a given notification type + userId.
 * This is the main entry point called by createNotification().
 *
 * Returns true if the email was sent (or skipped because the user has no email),
 * false if there was an actual error.
 */
export async function sendNotificationEmail(
  userId: string,
  type: string | null | undefined,
  title: string,
  message: string,
  options?: {
    pushUrl?: string;
    urlLabel?: string;
  }
): Promise<boolean> {
  try {
    // Look up the user's email + name
    const [email, name] = await Promise.all([
      getUserEmail(userId),
      getUserName(userId),
    ]);

    if (!email) {
      // User has no email or is inactive — skip the email (not an error)
      return true;
    }

    // ─── Strip the encoded prefix from the message body ────────────────
    // Several notification types encode an ID at the start of the message,
    // separated by "|", so the frontend can route clicks:
    //   - type 'message':            "senderId|You have a new message from..."
    //   - type 'interview_scheduled': "conversationId|Your interview for..."
    // For emails, we strip everything before the first "|" so the agent
    // sees only the human-readable text — no cryptic IDs.
    let cleanMessage = message;
    if (message && message.includes('|')) {
      const pipeIndex = message.indexOf('|');
      const prefix = message.substring(0, pipeIndex);
      // Only strip if the prefix looks like a CUID (24+ chars, starts with 'c')
      // — so we don't accidentally strip a legitimate "|" in the body text.
      if (prefix.length >= 20 && prefix.startsWith('c')) {
        cleanMessage = message.substring(pipeIndex + 1);
      }
    }

    // Build the email template with the cleaned message
    const template = buildEmailForNotification(type, {
      recipientName: name || 'there',
      title,
      body: cleanMessage,
      url: options?.pushUrl,
      urlLabel: options?.urlLabel,
    });

    if (!template) {
      return true;  // no template — skip
    }

    return await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    console.error('[sendNotificationEmail] Failed:', err);
    return false;
  }
}