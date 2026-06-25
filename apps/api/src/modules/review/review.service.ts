import { ApiError } from '../../common/errors/ApiError';
import { AppointmentModel } from '../appointment/appointment.repository';
import { DoctorModel } from '../doctor/doctor.repository';

import { ReviewModel, IReviewDocument } from './review.repository';

interface ReviewListResult {
  reviews: IReviewDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ReviewService {
  async submitReview(patientId: string, appointmentId: string, rating: number, comment: string): Promise<IReviewDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (appointment.patientId.toString() !== patientId) {
      throw new ApiError('Only the booking patient can submit a review', 403, 'FORBIDDEN');
    }

    if (appointment.status !== 'completed') {
      throw new ApiError('Appointment must be completed before review submission', 400, 'APPOINTMENT_NOT_COMPLETED');
    }

    const existingReview = await ReviewModel.findOne({ appointmentId });
    if (existingReview) {
      throw new ApiError('Review already exists for this appointment', 409, 'REVIEW_ALREADY_EXISTS');
    }

    const review = await ReviewModel.create({
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      appointmentId: appointment._id,
      rating,
      comment: comment.trim(),
      isHidden: false
    });

    const doctor = await DoctorModel.findById(appointment.doctorId);
    if (doctor) {
      const totalReviews = doctor.reviewCount + 1;
      const averageRating = ((doctor.averageRating * doctor.reviewCount) + rating) / totalReviews;
      doctor.reviewCount = totalReviews;
      doctor.averageRating = Number(averageRating.toFixed(2));
      await doctor.save();
    }

    return review;
  }

  async listDoctorReviews(doctorId: string, page = 1, limit = 10, sort = 'createdAt', order: 'asc' | 'desc' = 'desc'): Promise<ReviewListResult> {
    const query = { doctorId, isHidden: false };
    const total = await ReviewModel.countDocuments(query);
    const reviews = await ReviewModel.find(query)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      reviews,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async replyToReview(doctorId: string, reviewId: string, reply: string): Promise<IReviewDocument> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new ApiError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    if (review.doctorId.toString() !== doctorId) {
      throw new ApiError('Review does not belong to this doctor', 403, 'FORBIDDEN');
    }

    if (review.reply) {
      throw new ApiError('Doctor already replied to this review', 409, 'REPLY_ALREADY_EXISTS');
    }

    review.reply = reply;
    review.replyAt = new Date();
    await review.save();
    return review;
  }

  async moderateReview(reviewId: string, isHidden: boolean): Promise<IReviewDocument> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new ApiError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    review.isHidden = isHidden;
    await review.save();
    return review;
  }
}
