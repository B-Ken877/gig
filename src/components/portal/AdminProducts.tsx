'use client';

// Admin Products Management — full CRUD for the marketplace.
// Admins can add, edit, delete, activate/deactivate, and feature products.
// Supports image upload from device AND selection from existing gallery.

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, Star, StarOff, Eye, EyeOff, Loader2, AlertCircle,
  ShoppingBag, Package, RefreshCw, X, Check, Upload, ImagePlus, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

const CATEGORIES = [
  { value: 'headset', label: 'Headset' },
  { value: 'router', label: 'Router' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'other', label: 'Other' },
];

// Available product images (pre-uploaded to /products/ on the VPS)
const AVAILABLE_IMAGES = [
  '/products/jabra-headset-1.jpg',
  '/products/jabra-headset-2.jpg',
  '/products/jabra-headset-3.jpg',
  '/products/mini-router-1.jpg',
  '/products/mini-router-2.jpg',
  '/products/mini-router-3.jpg',
  '/products/laptop-1.jpg',
  '/products/laptop-2.jpg',
  '/products/laptop-3.jpg',
];

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'headset',
  price: '',
  currency: 'USD',
  image: '',
  stock: '-1',
  featured: false,
  isActive: true,
  specs: {
    brand: '',
    model: '',
    ipLocation: '',
    ram: '',
    storage: '',
    processor: '',
  } as ProductSpecs,
};

export default function AdminProducts() {
  const { addToast } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [imageSource, setImageSource] = useState<'upload' | 'gallery' | 'url'>('upload');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(() => {
    setLoading(true);
    setError(null);
    authFetch('/api/products?all=true')
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

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setUploadPreview(null);
    setImageSource('upload');
    setShowForm(true);
  };

  const handleOpenEdit = (product: Product) => {
    // Determine image source based on existing image path
    const isGalleryImage = AVAILABLE_IMAGES.includes(product.image);
    const isUploadedImage = product.image.startsWith('/api/uploads/product-image/');
    const source = isGalleryImage ? 'gallery' : isUploadedImage ? 'upload' : 'url';

    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      currency: product.currency,
      image: product.image,
      stock: String(product.stock),
      featured: product.featured,
      isActive: product.isActive,
      specs: {
        brand: product.specs?.brand || '',
        model: product.specs?.model || '',
        ipLocation: product.specs?.ipLocation || '',
        ram: product.specs?.ram || '',
        storage: product.specs?.storage || '',
        processor: product.specs?.processor || '',
      },
    });
    setEditingId(product.id);
    setUploadPreview(product.image);
    setImageSource(source);
    setShowForm(true);
  };

  /**
   * Handle file selection from device — immediately upload to server
   * and set the returned URL as the product image.
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      addToast({ title: 'Invalid file type', description: 'Please select a JPG, PNG, WebP, or GIF image.', variant: 'destructive' });
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast({ title: 'File too large', description: 'Maximum allowed size is 10 MB.', variant: 'destructive' });
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setUploadPreview(localPreview);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch('/api/uploads/product-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setForm((prev) => ({ ...prev, image: data.image }));
      // Update preview to the server URL (so it persists)
      setUploadPreview(data.image);
      addToast({ title: 'Image uploaded', description: 'Your image has been uploaded successfully.', variant: 'success' });
    } catch (err: any) {
      addToast({ title: 'Upload failed', description: err?.message || 'Could not upload image.', variant: 'destructive' });
      setUploadPreview(null);
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.price || !form.image) {
      addToast({ title: 'Missing required fields', description: 'Please fill in all required fields and upload or select an image.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Build specs object — only include non-empty fields
      const specs: Record<string, string> = {};
      if (form.specs.brand) specs.brand = form.specs.brand;
      if (form.specs.model) specs.model = form.specs.model;
      if (form.specs.ipLocation) specs.ipLocation = form.specs.ipLocation;
      if (form.specs.ram) specs.ram = form.specs.ram;
      if (form.specs.storage) specs.storage = form.specs.storage;
      if (form.specs.processor) specs.processor = form.specs.processor;

      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price),
        currency: form.currency,
        image: form.image,
        stock: Number(form.stock),
        featured: form.featured,
        isActive: form.isActive,
        specs,
      };

      const url = editingId
        ? `/api/products/${editingId}`
        : '/api/products';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save product');
      }

      addToast({
        title: editingId ? 'Product Updated' : 'Product Created',
        description: `${form.name} has been ${editingId ? 'updated' : 'added'} successfully.`,
        variant: 'success',
      });
      setShowForm(false);
      setEditingId(null);
      loadProducts();
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const res = await authFetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      loadProducts();
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      const res = await authFetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !product.featured }),
      });
      if (!res.ok) throw new Error('Failed to update');
      loadProducts();
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/products/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      addToast({ title: 'Product deleted', variant: 'default' });
      setDeleteId(null);
      loadProducts();
    } catch (e: any) {
      addToast({ title: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
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
            <p className="text-sm font-medium text-red-700 mb-1">Failed to load products</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#16A34A]/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-[#16A34A]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Marketplace Products</h2>
            <p className="text-xs text-gray-500">{products.length} product{products.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadProducts}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="bg-[#16A34A] text-white hover:bg-[#0F7B35]">
            <Plus className="h-4 w-4 mr-1.5" />Add Product
          </Button>
        </div>
      </div>

      {/* Products grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <h3 className="text-sm font-semibold text-gray-500 mb-1">No Products Yet</h3>
            <p className="text-xs text-gray-400 mb-4">Add your first product to the marketplace.</p>
            <Button size="sm" onClick={handleOpenAdd} className="bg-[#16A34A] text-white hover:bg-[#0F7B35]">
              <Plus className="h-4 w-4 mr-1.5" />Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className={`overflow-hidden ${!product.isActive ? 'opacity-60' : ''} ${
                product.featured ? 'ring-1 ring-[#16A34A]/20' : ''
              }`}
            >
              <div className="relative aspect-[4/3] bg-gray-50">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {product.featured && (
                    <Badge className="bg-[#16A34A] text-white border-0 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />Featured
                    </Badge>
                  )}
                  {!product.isActive && (
                    <Badge className="bg-gray-500 text-white border-0 text-[10px]">Hidden</Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-1 mb-2">{product.description}</p>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] capitalize">{product.category}</Badge>
                  <span className="text-lg font-bold text-[#16A34A]">
                    {product.currency} {product.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleOpenEdit(product)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleFeatured(product)}
                    title={product.featured ? 'Unfeature' : 'Feature'}
                  >
                    {product.featured
                      ? <Star className="h-3.5 w-3.5 text-[#16A34A] fill-[#16A34A]" />
                      : <StarOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleActive(product)}
                    title={product.isActive ? 'Hide' : 'Show'}
                  >
                    {product.isActive
                      ? <Eye className="h-3.5 w-3.5" />
                      : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteId(product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Product Dialog ─── */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#16A34A]" />
              {editingId ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* ─── Image Section ─── */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Product Image *</Label>

              {/* Image source tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setImageSource('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    imageSource === 'upload'
                      ? 'bg-white text-[#16A34A] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Upload from Device
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('gallery')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    imageSource === 'gallery'
                      ? 'bg-white text-[#16A34A] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    imageSource === 'url'
                      ? 'bg-white text-[#16A34A] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  URL
                </button>
              </div>

              {/* ─── Upload from Device ─── */}
              {imageSource === 'upload' && (
                <div className="space-y-3">
                  {/* Drop zone / file picker */}
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      uploading
                        ? 'border-[#16A34A]/30 bg-[#16A34A]/5 opacity-70 pointer-events-none'
                        : uploadPreview
                          ? 'border-[#16A34A]/40 bg-[#16A34A]/5 hover:border-[#16A34A]/60'
                          : 'border-gray-300 bg-gray-50 hover:border-[#16A34A]/50 hover:bg-[#16A34A]/5'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-[#16A34A] animate-spin" />
                        <p className="text-sm font-medium text-[#16A34A]">Uploading image...</p>
                        <p className="text-xs text-gray-400">Please wait</p>
                      </div>
                    ) : uploadPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={uploadPreview}
                          alt="Preview"
                          className="w-32 h-32 rounded-lg object-cover shadow-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-[#16A34A]" />
                          <p className="text-sm font-medium text-[#16A34A]">Image uploaded</p>
                        </div>
                        <p className="text-xs text-gray-400">Click to replace with a different image</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
                          <Camera className="h-6 w-6 text-[#16A34A]" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Click to choose a picture</p>
                        <p className="text-xs text-gray-400">JPG, PNG, WebP, or GIF — Max 10 MB</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Gallery Picker ─── */}
              {imageSource === 'gallery' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Select from pre-uploaded images:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {AVAILABLE_IMAGES.map((img) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, image: img });
                          setUploadPreview(img);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          form.image === img
                            ? 'border-[#16A34A] ring-2 ring-[#16A34A]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {form.image === img && (
                          <div className="absolute inset-0 bg-[#16A34A]/20 flex items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── URL Input ─── */}
              {imageSource === 'url' && (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter image URL (e.g. https://example.com/image.jpg)"
                    value={form.image}
                    onChange={(e) => {
                      setForm({ ...form, image: e.target.value });
                      setUploadPreview(e.target.value);
                    }}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Preview (shared across all sources) */}
              {form.image && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <img src={uploadPreview || form.image} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 block truncate">{form.image}</span>
                    <span className="text-[10px] text-gray-400">
                      {form.image.startsWith('/api/uploads/product-image/') && 'Uploaded from device'}
                      {form.image.startsWith('/products/') && 'Gallery image'}
                      {form.image.startsWith('http') && 'External URL'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jabra Evolve2 65"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            {/* Price + Currency + Stock */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price" type="number" step="0.01" min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="HTG">HTG (Gdes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock (-1 = unlimited)</Label>
                <Input
                  id="stock" type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>

            {/* Specs (varies by category) */}
            <div className="space-y-3">
              <Label>Product Specifications</Label>
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Brand</Label>
                  <Input
                    value={form.specs.brand || ''}
                    onChange={(e) => setForm({ ...form, specs: { ...form.specs, brand: e.target.value } })}
                    placeholder="e.g. Jabra"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Model</Label>
                  <Input
                    value={form.specs.model || ''}
                    onChange={(e) => setForm({ ...form, specs: { ...form.specs, model: e.target.value } })}
                    placeholder="e.g. Evolve2 65"
                    className="text-sm"
                  />
                </div>
                {form.category === 'router' && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-gray-500">IP Location (e.g. Texas, Florida, New York)</Label>
                    <Input
                      value={form.specs.ipLocation || ''}
                      onChange={(e) => setForm({ ...form, specs: { ...form.specs, ipLocation: e.target.value } })}
                      placeholder="e.g. Texas"
                      className="text-sm"
                    />
                  </div>
                )}
                {form.category === 'laptop' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">RAM</Label>
                      <Input
                        value={form.specs.ram || ''}
                        onChange={(e) => setForm({ ...form, specs: { ...form.specs, ram: e.target.value } })}
                        placeholder="e.g. 16GB"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Storage</Label>
                      <Input
                        value={form.specs.storage || ''}
                        onChange={(e) => setForm({ ...form, specs: { ...form.specs, storage: e.target.value } })}
                        placeholder="e.g. 512GB SSD"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-gray-500">Processor</Label>
                      <Input
                        value={form.specs.processor || ''}
                        onChange={(e) => setForm({ ...form, specs: { ...form.specs, processor: e.target.value } })}
                        placeholder="e.g. Intel i7-1165G7"
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label className="text-sm cursor-pointer">Active (visible in marketplace)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })}
                />
                <Label className="text-sm cursor-pointer">Featured (shown at top)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-[#16A34A] text-white hover:bg-[#0F7B35]"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <>{editingId ? 'Save Changes' : 'Create Product'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Product?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will permanently delete the product and all related orders.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <>Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

