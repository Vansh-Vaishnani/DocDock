'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import { deleteReview, fetchReviews } from '../../api';
import { formatDate, Pagination } from '../../_components/admin-ui';

export default function AdminReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Array<{ _id: string; rating: number; comment: string; doctorName: string; patientName: string; createdAt: string }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReviews({ rating, page, limit: 10 });
      setReviews(result.data.items);
      setTotalPages(result.data.totalPages);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rating, showToast]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Remove this review?')) return;
    try {
      await deleteReview(reviewId);
      showToast('Review removed', 'success');
      await loadReviews();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reviews</h2>
        <p className="mt-1 text-slate-600">Moderate patient feedback and remove abusive reviews.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setRating(undefined); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-medium ${rating === undefined ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>All</button>
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => { setRating(star); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-medium ${rating === star ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>{star}★</button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="text-slate-500">No reviews found.</p>
        ) : reviews.map((review) => (
          <article key={review._id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{review.patientName} → {review.doctorName}</p>
                <p className="mt-1 text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                <p className="mt-2 text-sm text-slate-700">{review.comment || 'No comment'}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(review.createdAt)}</p>
              </div>
              <button type="button" onClick={() => void handleDelete(review._id)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">Delete</button>
            </div>
          </article>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}
