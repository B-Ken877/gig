import { db } from '@/lib/db';

interface NotifyPayload {
  userId: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  actionUrl?: string;
  relatedEntityId?: string;
}

export async function notify(payload: NotifyPayload): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: payload.userId,
        channel: 'in-app',
        title: payload.title,
        message: payload.message,
        type: payload.type || 'info',
      },
    });
  } catch (error) {
    // Non-blocking — don't let notification failures break the main flow
    console.error('Notification delivery failed:', error);
  }
}
