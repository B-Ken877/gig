// Push notification helper library
// Saves/loads subscriptions and sends push messages

import webpush from 'web-push';

const VAPID_PUBLIC = 'BAbJPGXO2vIp0YjM9XgrE4vSTnY7MgVELN1Pn5XNa5lLOPk6WiKFl24Z-pdIjSR838S9JrIQnlLQJXJfPuqHR38';
const VAPID_PRIVATE = 'LUklhHUnOxwfI7toqkqmIu7wTrMycA9TnXG2aAyc5Mk';

webpush.setVapidDetails(
  'mailto:contact.gigsolutions@gmail.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

export const vapidPublicKey = VAPID_PUBLIC;

interface PushSubscriptionRecord {
  id?: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt?: string;
}

export async function saveSubscription(db: any, userId: string, subscription: any) {
  // Upsert subscription
  const existing = await db.pushSubscription.findUnique({ where: { userId } });
  const data = {
    userId,
    endpoint: subscription.endpoint,
    keys: JSON.stringify(subscription.keys),
  };

  if (existing) {
    return db.pushSubscription.update({ where: { userId }, data });
  }
  return db.pushSubscription.create({ data });
}

export async function removeSubscription(db: any, userId: string) {
  return db.pushSubscription.deleteMany({ where: { userId } }).catch(() => {});
}

export async function sendPushToUser(db: any, userId: string, payload: { title: string; body: string; url?: string }) {
  try {
    const sub = await db.pushSubscription.findUnique({ where: { userId } });
    if (!sub) return false;

    const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    };

    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return true;
  } catch (error: any) {
    // If subscription is invalid/expired, remove it
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await removeSubscription(db, userId);
    }
    return false;
  }
}

export async function sendPushToMultiple(db: any, userIds: string[], payload: { title: string; body: string; url?: string }) {
  const results = await Promise.allSettled(
    userIds.map(uid => sendPushToUser(db, uid, payload))
  );
  return results.filter(r => r.status === 'fulfilled' && r.value === true).length;
}

export async function sendPushToRole(db: any, role: string, payload: { title: string; body: string; url?: string }) {
  const users = await db.user.findMany({ where: { role, isActive: true }, select: { id: true } });
  const userIds = users.map((u: any) => u.id);
  return sendPushToMultiple(db, userIds, payload);
}