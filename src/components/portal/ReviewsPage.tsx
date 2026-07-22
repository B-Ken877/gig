'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Star, Search, ArrowLeft, MessageSquare, Loader2, Star as StarIcon,
  TrendingUp, Users, ShieldCheck, AlertCircle, Sparkles, Quote, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, authFetch } from '@/lib/store';
import { UserProfileModal } from '@/components/ui/user-profile-modal';
import type { Review, ReviewableUser } from '@/lib/types';
import {
  VerifiedBadge,
  VerifiedBadgeStyles,
  topVerificationTier,
  type VerificationTier,
} from '@/components/ui/verified-badge';

// ─── Star helpers ──────────────────────────────────────────────────────────

function Stars({
  value, size = 16, onChange, readonly = true,
}: { value: number; size?: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
          style={{ padding: 0, border: 'none', background: 'transparent' }}
        >
          <StarIcon
            style={{
              width: size,
              height: size,
              color: star <= shown ? '#FFB300' : '#D1D5DB',
              fill: star <= shown ? '#FFB300' : 'transparent',
              transition: 'color 120ms ease, fill 120ms ease, transform 120ms ease',
              transform: !readonly && star <= hover ? 'scale(1.12)' : 'scale(1)',
              filter: star <= shown && readonly ? 'drop-shadow(0 1px 1px rgba(255,179,0,0.35))' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  );
}

function ratingLabel(v: number): string {
  if (v >= 4.5) return 'Excellent';
  if (v >= 3.5) return 'Great';
  if (v >= 2.5) return 'Average';
  if (v >= 1.5) return 'Poor';
  if (v > 0) return 'Bad';
  return 'No reviews yet';
}

function ratingColor(v: number): string {
  if (v >= 4.5) return '#16A34A';
  if (v >= 3.5) return '#65A30D';
  if (v >= 2.5) return '#D97706';
  if (v >= 1.5) return '#DC2626';
  if (v > 0) return '#B91C1C';
  return '#9CA3AF';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(iso);
  } catch {
    return '';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
          <div className="text-xs text-gray-500 truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AggregateHeader({
  reviewee, avgRating, reviewCount, distribution,
}: {
  reviewee: ReviewableUser | null;
  avgRating: number;
  reviewCount: number;
  distribution: { star: number; count: number }[];
}) {
  if (!reviewee) return null;
  const initials = (reviewee.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const accent = ratingColor(avgRating);
  const maxCount = Math.max(1, ...distribution.map(d => d.count));
  const revieweeTiers: VerificationTier[] = (reviewee.verificationTiers || []) as VerificationTier[];
  const revieweeTopTier = topVerificationTier(revieweeTiers);
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-6"
      style={{
        background: 'linear-gradient(135deg, #0B1A2E 0%, #122842 60%, #1e3a5f 100%)',
        boxShadow: '0 12px 32px -8px rgba(11, 26, 46, 0.35)',
      }}
    >
      <VerifiedBadgeStyles />
      {/* Decorative gradient blobs */}
      <div
        className="absolute -top-12 -right-12 w-56 h-56 rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #16A34A 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FFB300 0%, transparent 70%)' }}
      />
      <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-7 items-start">
        <div className="relative shrink-0">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white/15 shadow-2xl">
            {reviewee.avatar && <AvatarImage src={reviewee.avatar} alt={reviewee.name} />}
            <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {revieweeTopTier && (
            <span className="absolute -bottom-1 -right-1">
              <VerifiedBadge tier={revieweeTopTier} iconOnly size="md" verifiedAt={reviewee.verifiedAt} />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => onShowProfile?.(reviewee.id)}
              className="text-2xl sm:text-3xl font-bold text-white hover:underline cursor-pointer"
              title="View full profile"
            >
              {reviewee.name}
            </button>
            <Badge
              className="bg-white/10 text-white hover:bg-white/15 border border-white/10 capitalize"
            >
              {reviewee.role === 'client' ? 'Call Center' : reviewee.role}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300 mb-3">
            {reviewee.role === 'client' && reviewee.industry && (
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-amber-300" />{reviewee.industry}</span>
            )}
            {reviewee.role === 'agent' && reviewee.country && (
              <span>📍 {reviewee.country}</span>
            )}
            {reviewee.role === 'agent' && reviewee.skills && reviewee.skills.length > 0 && (
              <span className="inline-flex flex-wrap gap-1">
                {reviewee.skills.slice(0, 3).map(s => (
                  <span key={s} className="px-1.5 py-0.5 rounded bg-white/10 text-xs">{s}</span>
                ))}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Average rating */}
            <div className="flex items-center gap-3">
              <div
                className="text-5xl font-bold leading-none"
                style={{ color: avgRating > 0 ? '#FFB300' : '#9CA3AF' }}
              >
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </div>
              <div>
                <Stars value={Math.round(avgRating)} size={18} />
                <div className="text-xs text-gray-300 mt-1">
                  {reviewCount > 0
                    ? `Based on ${reviewCount} review${reviewCount === 1 ? '' : 's'}`
                    : 'No reviews yet'}
                </div>
                <div
                  className="text-sm font-semibold mt-0.5"
                  style={{ color: avgRating > 0 ? '#FFB300' : '#9CA3AF' }}
                >
                  {ratingLabel(avgRating)}
                </div>
              </div>
            </div>

            {/* Distribution bars */}
            {reviewCount > 0 && (
              <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1">
                {distribution.map(d => (
                  <div key={d.star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-gray-300">{d.star}</span>
                    <StarIcon className="h-3 w-3" style={{ color: '#FFB300', fill: '#FFB300' }} />
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(d.count / maxCount) * 100}%`,
                          background: 'linear-gradient(90deg, #FFB300, #FF8F00)',
                        }}
                      />
                    </div>
                    <span className="w-7 text-right text-gray-300 tabular-nums">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, canSeeReviewer, onShowProfile }: { review: Review; canSeeReviewer: boolean; onShowProfile?: (userId: string) => void; }) {
  const reviewer = review.reviewer;
  const displayName = reviewer?.companyName || reviewer?.name || 'Anonymous';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const reviewerTiers: VerificationTier[] = (reviewer?.verificationTiers || []) as VerificationTier[];
  const reviewerTopTier = topVerificationTier(reviewerTiers);
  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => reviewer?.id && onShowProfile?.(reviewer.id)}
            className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
            title="View full profile"
          >
            <Avatar className="h-10 w-10 ring-1 ring-gray-100">
              {reviewer?.avatar && <AvatarImage src={reviewer.avatar} alt={displayName} />}
              <AvatarFallback className="bg-gradient-to-br from-[#0B1A2E] to-[#16A34A] text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {reviewerTopTier && (
              <span className="absolute -bottom-1 -right-1">
                <VerifiedBadge tier={reviewerTopTier} iconOnly size="xs" verifiedAt={reviewer?.verifiedAt} />
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => reviewer?.id && canSeeReviewer && onShowProfile?.(reviewer.id)}
                    disabled={!canSeeReviewer || !reviewer?.id}
                    className="font-semibold text-gray-900 truncate hover:text-[#16A34A] hover:underline cursor-pointer disabled:cursor-default disabled:hover:text-gray-900 disabled:hover:no-underline"
                    title={canSeeReviewer && reviewer?.id ? 'View full profile' : ''}
                  >
                    {canSeeReviewer ? displayName : 'Verified reviewer'}
                  </button>
                  {reviewer?.role === 'client' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Call Center</Badge>
                  )}
                  {reviewer?.role === 'agent' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Agent</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">{timeAgo(review.createdAt)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Stars value={review.rating} size={14} />
                <span className="text-xs font-semibold text-gray-700">{review.rating}.0</span>
              </div>
            </div>
            {review.title && (
              <h4 className="font-semibold text-gray-900 mt-3 text-sm">{review.title}</h4>
            )}
            <div className="relative mt-2">
              <Quote className="absolute -left-0 -top-1 h-4 w-4 text-gray-200" />
              <p className="text-sm text-gray-700 leading-relaxed pl-5 whitespace-pre-wrap">
                {review.comment}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewForm({
  reviewee, onSubmitted, existingReview,
}: {
  reviewee: ReviewableUser;
  onSubmitted: () => void;
  existingReview?: Review | null;
}) {
  const { currentUser, addToast } = useAppStore();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Role check: agents review clients, clients review agents
  const isAllowed =
    (currentUser?.role === 'agent' && reviewee.role === 'client') ||
    (currentUser?.role === 'client' && reviewee.role === 'agent');

  const isSelf = currentUser?.id === reviewee.id;

  if (isSelf) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-800 font-medium">You can&apos;t review yourself.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAllowed) {
    const youAre = currentUser?.role === 'agent' ? 'agent' : currentUser?.role === 'client' ? 'call center' : currentUser?.role;
    const targetIs = reviewee.role === 'agent' ? 'agent' : 'call center';
    const allowedTarget = currentUser?.role === 'agent' ? 'call centers' : 'agents';
    return (
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">Cross-role reviews only</p>
              <p className="text-blue-800/80">
                As a <strong>{youAre}</strong>, you can only review <strong>{allowedTarget}</strong>.
                This profile is a <strong>{targetIs}</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    setError(null);
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating (1–5).');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters in your review.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revieweeId: reviewee.id,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');
      addToast({
        title: existingReview ? 'Review updated!' : 'Review posted!',
        description: 'Thank you for your feedback.',
        variant: 'success',
      });
      // Reset form (but keep rating visible) and trigger reload
      if (!existingReview) {
        setRating(0);
        setTitle('');
        setComment('');
      }
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={formRef}>
      <Card
        className="border-0 shadow-lg overflow-hidden"
        style={{ boxShadow: '0 10px 30px -8px rgba(11,26,46,0.15)' }}
      >
        <div
          className="px-6 py-4 text-white flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #0B1A2E 0%, #16A34A 100%)' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">
              {existingReview ? 'Update your review' : `Review ${reviewee.name}`}
            </h3>
          </div>
          {existingReview && (
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />You reviewed this
            </Badge>
          )}
        </div>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Your rating <span className="text-red-500">*</span></Label>
            <div className="flex items-center gap-3">
              <Stars value={rating} size={32} readonly={false} onChange={setRating} />
              {rating > 0 && (
                <span
                  className="text-sm font-semibold"
                  style={{ color: ratingColor(rating) }}
                >
                  {ratingLabel(rating)} · {rating}.0
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-title">Title <span className="text-gray-400 text-xs">(optional)</span></Label>
            <Input
              id="review-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Summarize your experience in a few words"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Your review <span className="text-red-500">*</span></Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`Share details about your experience working with ${reviewee.name}...`}
              rows={5}
              maxLength={4000}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Minimum 10 characters · Be honest and professional</span>
              <span>{comment.length}/4000</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              onClick={submit}
              disabled={submitting}
              className="gap-2 bg-[#16A34A] text-white hover:bg-[#16A34A]/90 font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              {existingReview ? 'Update Review' : 'Post Review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const { currentUser, pendingReviewUserId, pendingReviewScrollToForm, setPendingReviewUserId, addToast } = useAppStore();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReviewableUser[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Active reviewee state (when viewing one user's reviews)
  const [activeReviewee, setActiveReviewee] = useState<ReviewableUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aggregate, setAggregate] = useState<{ avgRating: number; reviewCount: number; distribution: { star: number; count: number }[] } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  const reviewFormRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Search ────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await authFetch(`/api/reviews/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (activeReviewee) return; // don't search when viewing one user
    if (query.trim().length < 1) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => runSearch(query), 280);
    return () => clearTimeout(t);
  }, [query, runSearch, activeReviewee]);

  // ─── Load one user's reviews ───────────────────────────────────────────
  const loadReviews = useCallback(async (revieweeId: string) => {
    setLoadingReviews(true);
    try {
      const res = await authFetch(`/api/reviews?revieweeId=${revieweeId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load reviews');
      setActiveReviewee({
        id: data.reviewee.id,
        name: data.reviewee.name,
        role: data.reviewee.role,
        avatar: data.reviewee.avatar,
        industry: data.reviewee.industry || null,
        country: data.reviewee.country || null,
        skills: data.reviewee.skills || [],
        avgRating: data.aggregate?.avgRating || null,
        reviewCount: data.aggregate?.reviewCount || 0,
      });
      setReviews(data.reviews || []);
      setAggregate(data.aggregate || null);
      // Find current user's existing review (if any)
      if (currentUser) {
        const mine = (data.reviews || []).find((r: Review) => r.reviewerId === currentUser.id);
        setExistingReview(mine || null);
      } else {
        setExistingReview(null);
      }
    } catch (e) {
      addToast({
        title: 'Could not load reviews',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
      setActiveReviewee(null);
    } finally {
      setLoadingReviews(false);
    }
  }, [currentUser, addToast]);

  // ─── On mount: if pendingReviewUserId is set (came from a profile button), load that user ─
  useEffect(() => {
    if (pendingReviewUserId) {
      loadReviews(pendingReviewUserId).then(() => {
        // Consume the pending state
        setPendingReviewUserId(null, false);
        if (pendingReviewScrollToForm) {
          // Wait for the form to render
          setTimeout(() => {
            reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 250);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectResult = (user: ReviewableUser) => {
    setQuery('');
    setSearchResults(null);
    loadReviews(user.id);
  };

  const handleBackToSearch = () => {
    setActiveReviewee(null);
    setReviews([]);
    setAggregate(null);
    setExistingReview(null);
    setQuery('');
    setSearchResults(null);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const canReviewActive = activeReviewee && currentUser && (
    (currentUser.role === 'agent' && activeReviewee.role === 'client') ||
    (currentUser.role === 'client' && activeReviewee.role === 'agent')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-[#FFB300] fill-[#FFB300]" />
            Reviews
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Search for an agent or call center to read what others have to say.
          </p>
        </div>
        {activeReviewee && (
          <Button variant="outline" size="sm" onClick={handleBackToSearch} className="gap-2">
            <ArrowLeft className="h-4 w-4" />Back to search
          </Button>
        )}
      </div>

      {/* Stats strip */}
      {!activeReviewee && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={Users} label="Reviewed profiles" value="All agents & call centers" accent="#16A34A" />
          <StatCard icon={ShieldCheck} label="Cross-role only" value="Verified identities" accent="#1e88e5" />
          <StatCard icon={TrendingUp} label="1–5 star ratings" value="Public & transparent" accent="#FFB300" />
        </div>
      )}

      {/* Search bar (hidden when viewing one user) */}
      {!activeReviewee && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <Label htmlFor="review-search" className="text-sm font-medium text-gray-700 mb-2 block">
              Find an agent or call center
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                id="review-search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type a name, e.g. 'Marie' or 'TechCall'..."
                className="pl-10 h-11 text-base"
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search results */}
            {searchResults && (
              <div className="mt-4 space-y-2 max-h-[480px] overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No matches. Try a different name.
                  </div>
                ) : (
                  searchResults.map(u => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectResult(u)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#16A34A]/30 hover:bg-green-50/40 transition-colors group cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setProfileUserId(u.id); }}
                        className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
                        title="View full profile"
                      >
                        <Avatar className="h-10 w-10 ring-1 ring-gray-100">
                          {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                          <AvatarFallback className="bg-gradient-to-br from-[#16A34A] to-[#0B1A2E] text-white text-xs font-semibold">
                            {u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {topVerificationTier((u.verificationTiers || []) as VerificationTier[]) && (
                          <span className="absolute -bottom-1 -right-1">
                            <VerifiedBadge
                              tier={topVerificationTier((u.verificationTiers || []) as VerificationTier[])!}
                              iconOnly
                              size="xs"
                              verifiedAt={u.verifiedAt}
                            />
                          </span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setProfileUserId(u.id); }}
                            className="font-semibold text-gray-900 truncate hover:text-[#16A34A] hover:underline cursor-pointer"
                            title="View full profile"
                          >
                            {u.name}
                          </button>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {u.role === 'client' ? 'Call Center' : 'Agent'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {u.role === 'client' && u.industry && `Industry: ${u.industry}`}
                          {u.role === 'agent' && u.country && `📍 ${u.country}`}
                          {u.role === 'agent' && u.skills && u.skills.length > 0 && ` · ${u.skills.join(', ')}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.reviewCount && u.reviewCount > 0 ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Stars value={Math.round(u.avgRating || 0)} size={14} />
                              <span className="text-sm font-semibold text-gray-700">{(u.avgRating || 0).toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-gray-400">({u.reviewCount})</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No reviews</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Hint when no search yet */}
            {!searchResults && (
              <div className="mt-4 text-xs text-gray-400 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                <span>
                  Tip: agents can review call centers, and call centers can review agents.
                  Reviews are public — only one review per pair is allowed, but you can update yours anytime.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active reviewee view */}
      {activeReviewee && (
        <>
          {loadingReviews ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <AggregateHeader
                reviewee={activeReviewee}
                avgRating={aggregate?.avgRating || 0}
                reviewCount={aggregate?.reviewCount || 0}
                distribution={aggregate?.distribution || []}
                onShowProfile={setProfileUserId}
              />

              {/* Review form (only if cross-role + logged in) */}
              {currentUser && canReviewActive && (
                <div ref={reviewFormRef}>
                  <ReviewForm
                    reviewee={activeReviewee}
                    existingReview={existingReview}
                    onSubmitted={() => loadReviews(activeReviewee.id)}
                  />
                </div>
              )}

              {/* Reviews list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {reviews.length > 0
                      ? `${reviews.length} review${reviews.length === 1 ? '' : 's'}`
                      : 'No reviews yet'}
                  </h3>
                  {reviews.length > 0 && (
                    <span className="text-xs text-gray-500">Sorted by: most recent</span>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Star className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-900 mb-1">No reviews yet</p>
                      <p className="text-sm text-gray-500">
                        {canReviewActive
                          ? 'Be the first to share your experience.'
                          : 'Check back later for reviews.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map(r => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      canSeeReviewer={!!currentUser}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
