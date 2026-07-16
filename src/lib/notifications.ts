import { db } from '@/lib/db';
import { sendPushToUser } from '@/lib/push';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  pushBody?: string;
  pushUrl?: string;
}

/**
 * Create an in-app notification AND send a browser push notification.
 * Push is best-effort — failures are silently swallowed.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, title, message, type, pushBody, pushUrl } = params;

  // Always create in-app notification
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

  // Best-effort push notification
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

