// Product purchase — POST /api/products/[id]/buy
// Initiates a purchase by:
//   1. Creating a ProductOrder (status=pending)
//   2. Finding an admin
//   3. Creating/finding a 1:1 conversation with the admin
//   4. Sending a pre-written message with product details
//   5. Creating a notification for the admin
// Returns the conversationId so the client can navigate to messages.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// Normalize user ID pairs so user1Id < user2Id (matches Conversation schema).
function norm(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: productId } = await params;
    const body = await req.json().catch(() => ({}));
    const quantity = Math.max(1, Number(body.quantity) || 1);

    // Find the product
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not available' }, { status: 404 });
    }

    // Find an admin (prefer 'admin' role, fall back to payment_taker)
    const admin = await db.user.findFirst({
      where: { role: { in: ['admin', 'payment_taker'] }, isActive: true, accountStatus: 'active' },
      orderBy: { role: 'asc' }, // 'admin' < 'payment_taker' alphabetically
    });
    if (!admin) {
      return NextResponse.json({ error: 'No admin available to process your order' }, { status: 503 });
    }

    const buyer = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    // Build the pre-written message for the admin
    const totalPrice = product.price * quantity;
    const currency = product.currency || 'USD';
    const messageText =
      `🛒 NEW ORDER\n\n` +
      `Product: ${product.name}\n` +
      `Category: ${product.category}\n` +
      `Quantity: ${quantity}\n` +
      `Unit Price: ${currency} ${product.price.toFixed(2)}\n` +
      `Total: ${currency} ${totalPrice.toFixed(2)}\n\n` +
      `Buyer: ${buyer.name} (${buyer.email})\n` +
      `Role: ${buyer.role}\n\n` +
      `Description: ${product.description || 'N/A'}\n\n` +
      `Please confirm availability and arrange payment/shipping.`;

    // Create or find conversation with admin (same normalization as messages API)
    const [u1, u2] = norm(auth.userId, admin.id);
    let conversation = await db.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: { user1Id: u1, user2Id: u2, lastMessage: messageText },
      });
    } else {
      await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessage: messageText, lastMessageAt: new Date() },
      });
    }

    // Send the message
    await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: auth.userId,
        senderRole: auth.role,
        content: messageText,
      },
    });

    // Increment unread count for admin
    const adminField = u1 === admin.id ? 'unreadUser1' : 'unreadUser2';
    await db.conversation.update({
      where: { id: conversation.id },
      data: { [adminField]: { increment: 1 } },
    });

    // Create the ProductOrder record
    const order = await db.productOrder.create({
      data: {
        productId: product.id,
        buyerId: auth.userId,
        buyerRole: auth.role,
        status: 'pending',
        conversationId: conversation.id,
        message: messageText,
        quantity,
      },
    });

    // Create in-app + push notification for admin
    await createNotification({
      userId: admin.id,
      title: 'New Product Order',
      message: `${buyer.name} wants to buy ${quantity}x ${product.name} (${currency} ${totalPrice.toFixed(2)})`,
      type: 'product_order',
      pushBody: `${buyer.name} ordered ${product.name}`,
      pushUrl: 'https://167.86.124.101:4001/#messages',
    });

    return NextResponse.json({
      orderId: order.id,
      conversationId: conversation.id,
      message: 'Order placed! Opening chat with admin...',
    });
  } catch (error) {
    console.error('POST /api/products/[id]/buy error:', error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
