'use client';

// Gig Solutions Marketplace — premium product catalog for agents + call centers.
// Sells headsets, routers (with IP locations), and laptops.
// Clicking "Buy" opens a 1:1 chat with the admin to confirm the order.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Headphones, Wifi, Laptop, Tag, Star, Check, ArrowRight,
  Loader2, AlertCircle, Sparkles, Shield, Truck, RefreshCw, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore, authFetch } from '@/lib/store';

interface ProductSpecs {
  brand?: string;
  model?: string;
  ipLocation?: string;
  ram?: string;
  storage?: string;
  processor?: string;
  connectivity?: string[];
  [key: string]: unknown;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  specs: ProductSpecs;
  isActive: boolean;
  stock: number;
  featured: boolean;
  createdAt: string;
}

type CategoryFilter = 'all' | 'headset' | 'router' | 'laptop' | 'other';

const CATEGORY_META: Record<string, { label: string; icon: typeof Headphones; color: string }> = {
  headset: { label: 'Headsets', icon: Headphones, color: 'text-[#16A34A]' },
  router: { label: 'Routers', icon: Wifi, color: 'text-[#16A34A]' },
  laptop: { label: 'Laptops', icon: Laptop, color: 'text-[#16A34A]' },
  other: { label: 'Other', icon: Tag, color: 'text-[#16A34A]' },
};

export default function MarketplacePage() {
  const { currentUser, navigateTo, addToast } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const loadProducts = useCallback(() => {
    setLoading(true);
    setError(null);
    authFetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load products');
        return r.json();
      })
      .then((data) => {
        if (data.products) setProducts(data.products);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter((p) => p.category === activeCategory);

  const featuredProducts = products.filter((p) => p.featured);

  const handleBuy = async () => {
    if (!buyingProduct) return;
    setBuying(true);
    try {
      const res = await authFetch(`/api/products/${buyingProduct.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to place order');
      }
      const data = await res.json();
      addToast({
        title: 'Order Placed!',
        description: 'Opening chat with admin to confirm your order...',
        variant: 'success',
      });
      // Set the pending chat user so MessagesPage auto-opens the conversation
      // Find the admin user ID from the conversation — we need to search
      useAppStore.getState().pendingChatUserId = null; // will be set by messages page
      navigateTo('messages');
      setBuyingProduct(null);
      setQuantity(1);
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed to place order', variant: 'destructive' });
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <Card className="border-red-200 bg-red-50/50 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-700 mb-1">Failed to load marketplace</p>
            <p className="text-xs text-red-500 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={loadProducts}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Hero Banner ─── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[#16A34A]/20"
        style={{
          background: 'linear-gradient(135deg, #0B1A2E 0%, #132D5E 50%, #0B1A2E 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #16A34A 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#16A34A]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 p-8 sm:p-12">
          <div className="inline-flex items-center gap-2 bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#16A34A] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" />
            Premium Equipment Marketplace
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Everything You Need to <span className="text-[#16A34A]">Work Remotely</span>
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-2xl">
            Professional headsets, VPN routers with US IPs, and certified laptops.
            Curated for call center agents and remote professionals.
          </p>
          <div className="flex flex-wrap gap-6 mt-6 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-[#16A34A]" />Quality Guaranteed</span>
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-[#16A34A]" />Fast Delivery</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-[#16A34A]" />Admin-Verified</span>
          </div>
        </div>
      </div>

      {/* ─── Category Filter ─── */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'headset', 'router', 'laptop', 'other'] as CategoryFilter[]).map((cat) => {
          const Icon = cat === 'all' ? ShoppingBag : CATEGORY_META[cat]?.icon || Tag;
          const isActive = activeCategory === cat;
          const count = cat === 'all'
            ? products.length
            : products.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-md shadow-[#16A34A]/25'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#16A34A]/30 hover:text-[#16A34A]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat === 'all' ? 'All Products' : CATEGORY_META[cat]?.label || cat}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-gray-100'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Featured Products (only on 'all' view) ─── */}
      {activeCategory === 'all' && featuredProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-[#16A34A] fill-[#16A34A]" />
            <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                featured
                onBuy={(p) => { setQuantity(1); setBuyingProduct(p); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Product Grid ─── */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <h3 className="text-sm font-semibold text-gray-500 mb-1">No Products Available</h3>
            <p className="text-xs text-gray-400">Check back soon — we're adding new items regularly.</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {activeCategory === 'all' && featuredProducts.length > 0 && (
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Products</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onBuy={(p) => { setQuantity(1); setBuyingProduct(p); }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ─── Buy Dialog ─── */}
      <Dialog open={!!buyingProduct} onOpenChange={(o) => { if (!o) setBuyingProduct(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#16A34A]" />
              Confirm Your Order
            </DialogTitle>
          </DialogHeader>
          {buyingProduct && (
            <div className="space-y-4">
              {/* Product preview */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <img
                  src={buyingProduct.image}
                  alt={buyingProduct.name}
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{buyingProduct.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{buyingProduct.description}</p>
                  <p className="text-lg font-bold text-[#16A34A] mt-1">
                    {buyingProduct.currency} {buyingProduct.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >−</Button>
                  <Input
                    id="qty" type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >+</Button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-[#16A34A]/5 rounded-xl border border-[#16A34A]/10">
                <span className="text-sm font-medium text-gray-600">Total</span>
                <span className="text-2xl font-bold text-[#16A34A]">
                  {buyingProduct.currency} {(buyingProduct.price * quantity).toFixed(2)}
                </span>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Clicking "Place Order" will open a chat with our admin to confirm
                availability, arrange payment, and coordinate delivery.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyingProduct(null)} disabled={buying}>
              Cancel
            </Button>
            <Button
              onClick={handleBuy}
              disabled={buying}
              className="bg-[#16A34A] text-white hover:bg-[#0F7B35]"
            >
              {buying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Order...</>
              ) : (
                <>Place Order <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Product Card Component ────────────────────────────────────────────
function ProductCard({
  product,
  featured,
  onBuy,
}: {
  product: Product;
  featured?: boolean;
  onBuy: (p: Product) => void;
}) {
  const catMeta = CATEGORY_META[product.category] || CATEGORY_META.other;
  const Icon = catMeta.icon;
  const specs = product.specs || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 group ${
        featured ? 'border-[#16A34A]/30 ring-1 ring-[#16A34A]/10' : 'border-gray-200'
      }`}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-white/95 backdrop-blur-sm text-gray-700 border-0 shadow-sm text-xs">
              <Icon className={`h-3 w-3 mr-1 ${catMeta.color}`} />
              {catMeta.label}
            </Badge>
          </div>
          {/* Featured badge */}
          {featured && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-[#16A34A] text-white border-0 shadow-sm text-xs">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            </div>
          )}
          {/* Stock badge */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge className="bg-red-500 text-white border-0">Out of Stock</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-5">
          <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">
            {product.description || 'No description available'}
          </p>

          {/* Specs highlights */}
          {Object.keys(specs).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {specs.brand && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {specs.brand}
                </span>
              )}
              {specs.ipLocation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] font-medium">
                  🌐 {specs.ipLocation} IP
                </span>
              )}
              {specs.ram && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  {specs.ram} RAM
                </span>
              )}
              {specs.processor && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                  {specs.processor}
                </span>
              )}
            </div>
          )}

          {/* Price + Buy */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {product.currency} <span className="text-[#16A34A]">{product.price.toFixed(2)}</span>
              </p>
              {product.stock > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">{product.stock} in stock</p>
              )}
              {product.stock === -1 && (
                <p className="text-[10px] text-[#16A34A] mt-0.5">✓ In stock</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => onBuy(product)}
              disabled={product.stock === 0}
              className="bg-[#16A34A] text-white hover:bg-[#0F7B35] font-semibold"
            >
              <ShoppingBag className="h-4 w-4 mr-1" />
              Buy
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
