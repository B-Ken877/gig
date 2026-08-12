import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// PATCH /api/messages/[id]
// Edit a message's content. Only the sender can edit their own messages.
// Body: { content: string }
//
// Sets editedAt = now (so the UI can show "edited" indicator).
// Cannot edit a message that's already been deleted.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const body = await req.json();
    const { content } = body as { content?: string };

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    // Look up the message
    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only the sender can edit their own message
    if (message.senderId !== auth.userId) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }

    // Can't edit a deleted message
    if (message.deletedAt) {
      return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 400 });
    }

    const updated = await db.message.update({
      where: { id },
      data: {
        content: content.trim(),
        editedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: {
        id: updated.id,
        content: updated.content,
        editedAt: updated.editedAt?.toISOString() || null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PATCH /api/messages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
}

// DELETE /api/messages/[id]
// Soft-delete a message (WhatsApp "delete for everyone"). Only the sender can
// delete their own messages. Marks deletedAt + deletedBy but keeps the row in
// the DB (so the conversation history isn't broken). The content is replaced
// with a placeholder by the frontend ("This message was deleted").
//
// Body: { } (no body needed)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;

    // Look up the message
    const message = await db.message.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only the sender can delete their own message
    if (message.senderId !== auth.userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Already deleted — idempotent (return success)
    if (message.deletedAt) {
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    await db.message.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: auth.userId,
        // Wipe the original content — it's gone for everyone now, including the
        // sender. The DB row stays so the conversation order/read state stays
        // consistent.
        content: '',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/messages/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
