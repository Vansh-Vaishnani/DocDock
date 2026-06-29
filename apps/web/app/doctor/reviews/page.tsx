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
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Patient Reviews</h2>
          <p className="mt-2 text-slate-600">See what patients say about your consultations.</p>
        </div>
        <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          Total: {total}
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="text-sm text-slate-600">Loading reviews...</div>
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-600">No reviews yet. Complete consultations to receive patient feedback.</p>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  {review.patientPhoto ? (
                    <img src={review.patientPhoto} alt={review.patientName} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-slate-500">
                      {review.patientName?.charAt(0) || 'P'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{review.patientName || 'Patient'}</p>
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-slate-500">{review.rating}/5</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Appointment: {formatDate(review.appointmentDate)}</p>
                      <p>Reviewed: {formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm text-slate-700">{review.comment}</p>
                  )}
                  {review.reply && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <p className="font-semibold text-slate-900">Your reply:</p>
                      <p className="mt-1 text-slate-700">{review.reply}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(review.replyAt)}</p>
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
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void loadReviews(page + 1)}
            disabled={page === totalPages}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
