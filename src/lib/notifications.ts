import { db } from '@/lib/db';
import { sendPushToUser } from '@/lib/push';
import { sendNotificationEmail } from '@/lib/email';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  pushBody?: string;
  pushUrl?: string;
  // Optional: override the email subject/body. If not provided, the email is
  // built from the title + message + type using the templates in /lib/email.ts.
  emailSubject?: string;
  emailBody?: string;
  // Optional: label for the CTA button in the email (defaults to "View Details")
  emailCtaLabel?: string;
}

/**
 * Create an in-app notification, send a browser push notification, AND send
 * an email — all three channels for every notification.
 *
 * Push + email are best-effort: if they fail, the in-app notification still
 * goes through. Email failures are logged but never break the user flow.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, title, message, type, pushBody, pushUrl, emailSubject, emailBody, emailCtaLabel } = params;

  // 1. Always create in-app notification
  try {
    await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || null,
        channel: 'in-app',
      },
    });
  } catch (err) {
    console.error('[createNotification] DB write failed:', err);
  }

  // 2. Best-effort push notification
  if (pushBody) {
    try {
      await sendPushToUser(db, userId, {
        title,
        body: pushBody,
        url: pushUrl,
      });
    } catch (_pushErr) {
      /* push is best-effort */
    }
  }

  // 3. Best-effort email notification
  // For message-type notifications, the "message" field has a "senderId|text"
  // format. The email helper strips the senderId automatically.
  try {
    await sendNotificationEmail(userId, type, emailSubject || title, emailBody || message, {
      pushUrl,
      urlLabel: emailCtaLabel,
    });
  } catch (emailErr) {
    console.error('[createNotification] email send failed:', emailErr);
    /* email is best-effort */
  }
}

/**
 * Create notifications for multiple users (e.g., all agents when a new need is posted).
 */
export async function createNotificationBulk(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  for (const uid of userIds) {
    await createNotification({ ...params, userId: uid });
  }
}

