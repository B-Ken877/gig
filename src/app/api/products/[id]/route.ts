// Product detail — update (PATCH, admin only) + delete (DELETE, admin only).

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.image !== undefined) data.image = body.image;
    if (body.specs !== undefined) {
      data.specs = typeof body.specs === 'string' ? body.specs : JSON.stringify(body.specs);
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.stock !== undefined) data.stock = Number(body.stock);
    if (body.featured !== undefined) data.featured = !!body.featured;

    const product = await db.product.update({ where: { id }, data });
    return NextResponse.json({ product: { ...product, specs: safeJson(product.specs, {}) } });
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await db.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
