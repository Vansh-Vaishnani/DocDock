'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { fetchMyReviews, type DoctorReview, type DoctorReviewsResponse } from '../api';

export default function DoctorReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadReviews = async (pageNum = 1) => {
    setLoading(true);
    try {
      const data: DoctorReviewsResponse = await fetchMyReviews(pageNum, 10);
      setReviews(data.reviews);
      setPage(data.meta.page);
      setTotalPages(data.meta.totalPages);
      setTotal(data.meta.total);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to load reviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews(1);
  }, [showToast]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-slate-300'}>★</span>
    ));
  };

  return (
    <div className="dd-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Patient Reviews</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>See what patients say about your consultations.</p>
        </div>
        <div className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40">
          Total: {total}
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading reviews...</div>
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No reviews yet. Complete consultations to receive patient feedback.</p>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  {review.patientPhoto ? (
                    <img src={review.patientPhoto} alt={review.patientName} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {review.patientName?.charAt(0) || 'P'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{review.patientName || 'Patient'}</p>
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{review.rating}/5</span>
                      </div>
                    </div>
                    <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                      <p>Appointment: {formatDate(review.appointmentDate)}</p>
                      <p>Reviewed: {formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm" style={{ color: 'var(--text-primary)' }}>{review.comment}</p>
                  )}
                  {review.reply && (
                    <div className="mt-3 rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Your reply:</p>
                      <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{review.reply}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(review.replyAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void loadReviews(page - 1)}
            disabled={page === 1}
            className="btn-secondary py-2"
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void loadReviews(page + 1)}
            disabled={page === totalPages}
            className="btn-secondary py-2"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
