// Marketplace Products — list (GET) + create (POST, admin only).
// Any authenticated user can browse; only admins can create products.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// Safe JSON parse for the specs field (stored as a JSON string in SQLite).
function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// GET /api/products — list all active products (any authenticated user).
// Admins can pass ?all=true to see inactive products too.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const showAll = searchParams.get('all') === 'true';
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';

    const where: Record<string, unknown> = {};
    if (category && category !== 'all') where.category = category;
    if (!isAdmin || !showAll) where.isActive = true;

    const products = await db.product.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        specs: safeJson(p.specs, {}),
      })),
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products — create a new product (admin only).
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, category, price, currency, image, specs, stock, featured } = body;

    if (!name || !category || price === undefined || !image) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, price, image' },
        { status: 400 },
      );
    }

    const product = await db.product.create({
      data: {
        name,
        description: description || '',
        category,
        price: Number(price),
        currency: currency || 'USD',
        image,
        specs: typeof specs === 'string' ? specs : JSON.stringify(specs || {}),
        stock: stock !== undefined ? Number(stock) : -1,
        featured: !!featured,
        isActive: true,
      },
    });

    return NextResponse.json({ product: { ...product, specs: safeJson(product.specs, {}) } });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
