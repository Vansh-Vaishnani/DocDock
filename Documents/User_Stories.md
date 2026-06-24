# User Stories Documentation

**Project:** DocDock — Doctor-on-Demand Healthcare Platform
**Tagline:** "Knock-Knock, your doctor is here."
**Document Version:** 1.0
**Document Owner:** Product / Engineering Team
**Standard:** Agile/Scrum User Story Format
**Classification:** Internal / Portfolio-Grade Reference

---

## 1. Purpose

This document captures the User Stories for DocDock, written in standard Agile/Scrum format to drive backlog grooming, sprint planning, and development. Each story follows the format:

> **As a** [role], **I want** [goal], **so that** [benefit].

Stories are grouped by persona — **Patient**, **Doctor**, and **Admin** — and include a unique Story ID, Acceptance Criteria (Given/When/Then or checklist style), and a MoSCoW-aligned Priority rating (**Must Have / Should Have / Could Have / Won't Have — this release**).

---

## 2. Priority Legend

| Priority | Meaning |
|----------|---------|
| **Must Have** | Critical for MVP; platform is non-functional without it |
| **Should Have** | Important for a complete product experience; not launch-blocking |
| **Could Have** | Desirable enhancement; deferrable to later sprints |
| **Won't Have (this release)** | Explicitly out of scope for current roadmap |

---

## 3. Patient User Stories

### Epic: Patient Onboarding & Account Management

**Story ID:** US-PAT-01
**User Story:** As a patient, I want to register using my email/phone number and password, so that I can create a secure account on DocDock.
**Acceptance Criteria:**
- Given a new user on the registration page, when they submit a valid email/phone, password, and name, then an account is created and a verification email/OTP is sent.
- Password must meet minimum complexity rules (8+ characters, 1 number, 1 special character).
- Duplicate email/phone registration is rejected with a clear error message.
- Passwords are hashed with bcrypt before storage.
**Priority:** Must Have

---

**Story ID:** US-PAT-02
**User Story:** As a patient, I want to log in securely using my credentials, so that I can access my account and booking history.
**Acceptance Criteria:**
- Given valid credentials, when submitted, then a JWT access/refresh token pair is issued and the patient is redirected to the dashboard.
- Given invalid credentials, when submitted, then a generic "invalid email or password" error is shown (no user-existence leakage).
- Account locks temporarily after 5 failed attempts within 15 minutes.
**Priority:** Must Have

---

**Story ID:** US-PAT-03
**User Story:** As a patient, I want to reset my password if I forget it, so that I can regain access to my account without contacting support.
**Acceptance Criteria:**
- Given a "Forgot Password" request, when a valid registered email/phone is submitted, then a time-limited reset link/OTP is sent.
- Reset link expires after 15 minutes.
- Old password is invalidated immediately upon successful reset.
**Priority:** Must Have

---

**Story ID:** US-PAT-04
**User Story:** As a patient, I want to create and edit my health profile (age, gender, allergies, chronic conditions), so that doctors have relevant context during consultations.
**Acceptance Criteria:**
- Given the profile page, when a patient updates fields, then changes are saved and timestamped.
- Profile fields support optional entries (not all fields mandatory).
- Updated profile is visible to a doctor only during/after an active appointment.
**Priority:** Should Have

---

**Story ID:** US-PAT-05
**User Story:** As a patient, I want to manage my saved addresses (home, work, other), so that I can quickly select a consultation location when booking.
**Acceptance Criteria:**
- Given the address management screen, when a patient adds an address, then it is geocoded and stored with latitude/longitude.
- Patient can mark one address as default.
- Patient can edit or delete saved addresses.
**Priority:** Should Have

---

### Epic: Doctor Discovery & Search

**Story ID:** US-PAT-06
**User Story:** As a patient, I want to search for nearby verified doctors using my current location, so that I can find the closest available care quickly.
**Acceptance Criteria:**
- Given location permission is granted, when the patient opens search, then doctors within a configurable radius (default 10km) are displayed, sorted by distance.
- Only doctors with "Verified" admin status appear in results.
- Results display on a React Leaflet map and as a list view.
**Priority:** Must Have

---

**Story ID:** US-PAT-07
**User Story:** As a patient, I want to filter doctor search results by specialty, rating, and availability, so that I can narrow down to the most relevant doctor.
**Acceptance Criteria:**
- Given search results, when a patient applies filters (specialty/rating/availability), then results update without a full page reload.
- Multiple filters can be combined (AND logic).
- "Clear filters" resets to default unfiltered nearby results.
**Priority:** Should Have

---

**Story ID:** US-PAT-08
**User Story:** As a patient, I want to view a doctor's detailed profile (qualifications, experience, specialty, ratings, consultation fee), so that I can make an informed booking decision.
**Acceptance Criteria:**
- Given a doctor card in search results, when clicked, then a profile page shows verified credentials, years of experience, specialty tags, average rating, and fee.
- Profile displays aggregated review count and rating breakdown.
**Priority:** Must Have

---

**Story ID:** US-PAT-09
**User Story:** As a patient, I want to see real-time availability status of doctors (online/busy/offline), so that I only attempt to book doctors who can respond promptly.
**Acceptance Criteria:**
- Given a doctor's availability changes, when the doctor toggles status, then the patient's search/profile view reflects the new status within 5 seconds via Socket.io.
- Unavailable doctors are visually distinguished (greyed out) but still viewable.
**Priority:** Must Have

---

### Epic: Appointment Booking

**Story ID:** US-PAT-10
**User Story:** As a patient, I want to book an appointment with a selected doctor for a home consultation, so that I can receive care without traveling.
**Acceptance Criteria:**
- Given an available doctor and time slot, when the patient confirms booking, then an appointment record is created with status "Pending Confirmation."
- Booking requires patient address, preferred time, and reason for visit (optional free text).
- Double-booking of the same slot by two patients is prevented via atomic database transaction.
**Priority:** Must Have

---

**Story ID:** US-PAT-11
**User Story:** As a patient, I want to receive confirmation when a doctor accepts my booking request, so that I know my appointment is finalized.
**Acceptance Criteria:**
- Given a doctor accepts a pending request, when the action is taken, then the patient receives a real-time notification and the appointment status updates to "Confirmed."
- Confirmation includes doctor name, ETA, and consultation fee.
**Priority:** Must Have

---

**Story ID:** US-PAT-12
**User Story:** As a patient, I want to cancel or reschedule a booked appointment, so that I have flexibility if my circumstances change.
**Acceptance Criteria:**
- Given a confirmed appointment, when the patient cancels at least 1 hour before the scheduled time, then no cancellation fee applies and the doctor is notified.
- Cancellations within 1 hour of appointment time trigger a configurable cancellation policy/fee disclosure.
- Rescheduling opens the booking flow with the same doctor pre-selected.
**Priority:** Should Have

---

**Story ID:** US-PAT-13
**User Story:** As a patient, I want to view my upcoming and past appointment history, so that I can track my consultations over time.
**Acceptance Criteria:**
- Given the "My Appointments" screen, when loaded, then upcoming and past appointments are listed separately, sorted by date.
- Each entry shows doctor name, date/time, status, and a link to the prescription (if issued).
**Priority:** Should Have

---

### Epic: Live Tracking & Communication

**Story ID:** US-PAT-14
**User Story:** As a patient, I want to track my doctor's live location after booking confirmation, so that I know when they will arrive.
**Acceptance Criteria:**
- Given a confirmed appointment, when the doctor is en route, then the patient's app displays the doctor's live position on a map, updating at least every 5 seconds.
- An estimated time of arrival (ETA) is displayed and recalculated as location updates.
- Location sharing stops automatically when the appointment is marked complete or cancelled.
**Priority:** Must Have

---

**Story ID:** US-PAT-15
**User Story:** As a patient, I want to chat with my doctor in real time before or during the consultation, so that I can share symptoms or ask questions.
**Acceptance Criteria:**
- Given a confirmed appointment, when the patient sends a message, then it is delivered to the doctor within 1 second via Socket.io and persisted to the database.
- Chat history is retrievable for the duration of the appointment lifecycle plus the defined retention period.
- Typing indicators and read receipts are displayed.
**Priority:** Must Have

---

**Story ID:** US-PAT-16
**User Story:** As a patient, I want to receive push/SMS/email notifications for key events (booking confirmed, doctor en route, prescription ready), so that I stay informed without constantly checking the app.
**Acceptance Criteria:**
- Given a triggering event, when it occurs, then a notification is dispatched via the configured channel(s) within 30 seconds.
- Patient can manage notification preferences (push/SMS/email) per event type in settings.
**Priority:** Should Have

---

### Epic: Consultation, Prescriptions & Payments

**Story ID:** US-PAT-17
**User Story:** As a patient, I want to receive a digital prescription after my consultation, so that I have a record of prescribed medications and instructions.
**Acceptance Criteria:**
- Given a completed consultation, when the doctor issues a prescription, then the patient receives an in-app notification and can view/download a PDF copy.
- Prescription includes doctor's registration number, medications, dosage, and digital signature marker.
**Priority:** Must Have

---

**Story ID:** US-PAT-18
**User Story:** As a patient, I want to pay for my consultation securely via Razorpay, so that I can complete payment without handling cash.
**Acceptance Criteria:**
- Given a confirmed/completed appointment, when the patient initiates payment, then Razorpay's checkout flow is launched with the correct amount pre-filled.
- Successful payment updates appointment payment status to "Paid" via webhook confirmation.
- Failed payment shows a clear retry option without losing booking details.
**Priority:** Must Have

---

**Story ID:** US-PAT-19
**User Story:** As a patient, I want to view my payment history and download invoices/receipts, so that I can track my healthcare expenses.
**Acceptance Criteria:**
- Given the payment history screen, when loaded, then all past transactions display amount, date, doctor, and status.
- Each transaction has a downloadable PDF receipt.
**Priority:** Could Have

---

### Epic: Ratings & Trust

**Story ID:** US-PAT-20
**User Story:** As a patient, I want to rate and review a doctor after my consultation, so that I can share my experience and help other patients choose.
**Acceptance Criteria:**
- Given a completed appointment, when the patient submits a 1–5 star rating with optional comment, then it is associated with that doctor's profile and the specific appointment.
- A patient can only rate a doctor once per completed appointment.
- Reviews are visible on the doctor's public profile after a basic moderation check.
**Priority:** Should Have

---

## 4. Doctor User Stories

### Epic: Doctor Onboarding & Verification

**Story ID:** US-DOC-01
**User Story:** As a doctor, I want to register on the platform with my professional details and credentials, so that I can offer consultations to patients.
**Acceptance Criteria:**
- Given the registration form, when a doctor submits name, medical registration number, specialty, and contact details, then an account is created with status "Pending Verification."
- Doctor cannot appear in patient search results until verified.
**Priority:** Must Have

---

**Story ID:** US-DOC-02
**User Story:** As a doctor, I want to upload my medical license and certification documents, so that admins can verify my credentials.
**Acceptance Criteria:**
- Given the document upload step, when a doctor uploads files (PDF/image), then they are stored securely via Cloudinary as private assets.
- Supported formats and a max file size (e.g., 10MB) are enforced with clear error messaging on rejection.
**Priority:** Must Have

---

**Story ID:** US-DOC-03
**User Story:** As a doctor, I want to log in securely to access my dashboard, so that I can manage my practice on DocDock.
**Acceptance Criteria:**
- Given valid credentials, when submitted, then a JWT token is issued scoped to the "Doctor" role.
- Unverified doctors can log in but see a restricted dashboard with verification status messaging.
**Priority:** Must Have

---

**Story ID:** US-DOC-04
**User Story:** As a doctor, I want to receive a notification when my verification is approved or rejected, so that I know whether I can start accepting patients.
**Acceptance Criteria:**
- Given an admin verification decision, when made, then the doctor receives an email/push notification within 1 minute.
- If rejected, the notification includes a reason and resubmission instructions.
**Priority:** Must Have

---

**Story ID:** US-DOC-05
**User Story:** As a doctor, I want to build and edit my professional profile (bio, specialties, experience, consultation fee, clinic photos), so that patients can evaluate me before booking.
**Acceptance Criteria:**
- Given the profile editor, when a doctor updates fields, then changes are reflected on their public profile after save.
- Profile photo and clinic images are uploaded via Cloudinary with size/format validation.
**Priority:** Should Have

---

### Epic: Availability & Schedule Management

**Story ID:** US-DOC-06
**User Story:** As a doctor, I want to toggle my real-time availability status (Online/Busy/Offline), so that patients only see me as bookable when I can actually take appointments.
**Acceptance Criteria:**
- Given the dashboard toggle, when a doctor changes status, then the new status propagates to patient-facing search/profile views within 5 seconds via Socket.io.
- Status automatically reverts to "Offline" after a configurable period of inactivity.
**Priority:** Must Have

---

**Story ID:** US-DOC-07
**User Story:** As a doctor, I want to define my working hours and service radius, so that I only receive booking requests within my operating parameters.
**Acceptance Criteria:**
- Given the schedule settings page, when a doctor sets working hours and a max travel radius (in km), then booking requests outside these constraints are not routed to them.
- Doctor can set different hours per day of the week.
**Priority:** Should Have

---

**Story ID:** US-DOC-08
**User Story:** As a doctor, I want to block specific dates/times (e.g., personal leave), so that I am not booked during periods I'm unavailable.
**Acceptance Criteria:**
- Given the calendar view, when a doctor marks a date/time range as blocked, then no new bookings can be made for that window.
- Existing confirmed bookings in a newly blocked window prompt the doctor to manually resolve (reschedule/cancel) rather than auto-cancelling.
**Priority:** Could Have

---

### Epic: Appointment & Patient Management

**Story ID:** US-DOC-09
**User Story:** As a doctor, I want to receive real-time booking requests from patients, so that I can promptly accept or decline them.
**Acceptance Criteria:**
- Given a new booking request, when created, then the doctor receives a real-time notification (push + in-app) with patient location and reason for visit.
- Doctor must respond (accept/decline) within a configurable SLA window (e.g., 5 minutes) or the request auto-expires.
**Priority:** Must Have

---

**Story ID:** US-DOC-10
**User Story:** As a doctor, I want to accept or decline a booking request, so that I have control over my workload and travel.
**Acceptance Criteria:**
- Given a pending request, when the doctor accepts, then appointment status updates to "Confirmed" and the patient is notified.
- Given a decline action, when submitted, then the patient is notified and the slot is released for other doctors (if applicable).
**Priority:** Must Have

---

**Story ID:** US-DOC-11
**User Story:** As a doctor, I want to view patient details and health profile information relevant to an accepted appointment, so that I can prepare for the consultation.
**Acceptance Criteria:**
- Given a confirmed appointment, when the doctor opens it, then patient name, age, gender, reported symptoms, and relevant health profile fields are visible.
- Access to patient health data is restricted strictly to doctors with an active/past appointment relationship with that patient.
**Priority:** Must Have

---

**Story ID:** US-DOC-12
**User Story:** As a doctor, I want to update my live location while en route to a patient, so that the patient can track my arrival.
**Acceptance Criteria:**
- Given an "en route" status, when the doctor's device reports GPS coordinates, then location updates are emitted via Socket.io at least every 5 seconds.
- Location sharing automatically stops when the appointment is marked "Completed" or "Cancelled."
**Priority:** Must Have

---

**Story ID:** US-DOC-13
**User Story:** As a doctor, I want to mark an appointment as "In Progress" and then "Completed," so that the platform accurately reflects the consultation lifecycle.
**Acceptance Criteria:**
- Given an arrived doctor, when they mark "In Progress," then patient is notified and tracking view transitions to a consultation view.
- Given a finished consultation, when marked "Completed," then prescription and payment flows are unlocked.
**Priority:** Must Have

---

### Epic: Communication, Prescriptions & Reviews

**Story ID:** US-DOC-14
**User Story:** As a doctor, I want to chat with patients in real time, so that I can clarify symptoms before or during a visit.
**Acceptance Criteria:**
- Given an active appointment, when the doctor sends a message, then it is delivered to the patient within 1 second.
- Chat is disabled for appointments not in "Confirmed," "In Progress," or recently "Completed" status.
**Priority:** Must Have

---

**Story ID:** US-DOC-15
**User Story:** As a doctor, I want to generate and issue a digital prescription after a consultation, so that the patient has a verifiable medical record.
**Acceptance Criteria:**
- Given a completed consultation, when the doctor fills in diagnosis and medication details, then a digital prescription PDF is generated with the doctor's registration number and a digital signature marker.
- Prescription is immediately accessible to the patient and stored against the appointment record.
**Priority:** Must Have

---

**Story ID:** US-DOC-16
**User Story:** As a doctor, I want to view my ratings and reviews from patients, so that I can understand my reputation on the platform.
**Acceptance Criteria:**
- Given the doctor dashboard, when the doctor views the "Reviews" tab, then average rating and individual reviews (with dates) are displayed.
- Doctor can respond publicly to a review (optional reply thread).
**Priority:** Could Have

---

**Story ID:** US-DOC-17
**User Story:** As a doctor, I want to view my earnings and payment history, so that I can track my income from consultations on the platform.
**Acceptance Criteria:**
- Given the earnings dashboard, when loaded, then completed and pending payouts are listed with appointment references.
- Doctor can filter earnings by date range.
**Priority:** Should Have

---

**Story ID:** US-DOC-18
**User Story:** As a doctor, I want to receive notifications for new bookings, cancellations, and payment confirmations, so that I stay updated without constantly refreshing the app.
**Acceptance Criteria:**
- Given a triggering event, when it occurs, then the doctor receives a push/email notification within 30 seconds.
- Notification preferences are configurable per event type.
**Priority:** Should Have

---

## 5. Admin User Stories

### Epic: Platform Access & Security

**Story ID:** US-ADM-01
**User Story:** As an admin, I want to log in to a secure admin portal with elevated privileges, so that I can manage platform operations.
**Acceptance Criteria:**
- Given valid admin credentials, when submitted, then a JWT scoped to the "Admin" role is issued.
- Admin accounts require mandatory two-factor authentication (2FA) before access is granted.
**Priority:** Must Have

---

**Story ID:** US-ADM-02
**User Story:** As an admin, I want role-based access control within the admin portal (e.g., Super Admin vs. Support Admin), so that sensitive actions are restricted to authorized personnel.
**Acceptance Criteria:**
- Given an admin sub-role, when they attempt an action outside their permission scope, then the system returns HTTP 403 and logs the attempt.
- Super Admins can create/manage other admin accounts; Support Admins cannot.
**Priority:** Should Have

---

### Epic: Doctor Verification & Compliance

**Story ID:** US-ADM-03
**User Story:** As an admin, I want to view a queue of pending doctor verification requests, so that I can review and process them efficiently.
**Acceptance Criteria:**
- Given the verification queue, when loaded, then pending doctors are listed with submission date, sorted oldest-first by default.
- Queue supports filtering by specialty and search by name/registration number.
**Priority:** Must Have

---

**Story ID:** US-ADM-04
**User Story:** As an admin, I want to review a doctor's submitted credentials (license, certifications) before approving or rejecting their account, so that only legitimate, qualified doctors are verified.
**Acceptance Criteria:**
- Given a doctor's verification request, when opened, then all uploaded documents are viewable in-browser via secure signed URLs.
- Admin can approve, reject, or request additional documents, each action requiring a logged reason/note.
**Priority:** Must Have

---

**Story ID:** US-ADM-05
**User Story:** As an admin, I want to suspend or deactivate a doctor's account for policy violations or complaints, so that I can protect patient safety and platform trust.
**Acceptance Criteria:**
- Given a verified doctor account, when an admin applies a suspension, then the doctor is immediately removed from patient search results and cannot accept new bookings.
- Suspension action requires a documented reason and is recorded in the audit trail.
- Doctor receives a notification explaining the suspension and any appeal process.
**Priority:** Must Have

---

### Epic: User & Content Management

**Story ID:** US-ADM-06
**User Story:** As an admin, I want to view and manage patient accounts, so that I can resolve support issues or handle policy violations.
**Acceptance Criteria:**
- Given the patient management screen, when an admin searches by name/email/phone, then matching accounts display profile and appointment summary.
- Admin can suspend a patient account, with the action logged and a reason required.
**Priority:** Should Have

---

**Story ID:** US-ADM-07
**User Story:** As an admin, I want to moderate doctor reviews and ratings, so that I can remove fraudulent, abusive, or policy-violating content.
**Acceptance Criteria:**
- Given a flagged or reported review, when an admin opens it, then they can view the full review, reporter details (if applicable), and choose to remove or retain it.
- Removed reviews are excluded from the doctor's average rating recalculation immediately.
**Priority:** Could Have

---

**Story ID:** US-ADM-08
**User Story:** As an admin, I want to view all appointments across the platform with filtering options, so that I can monitor operational activity and resolve disputes.
**Acceptance Criteria:**
- Given the appointments dashboard, when an admin applies filters (status, date range, doctor, patient), then matching records display with key details.
- Admin can drill into a specific appointment to view full chat/prescription/payment history for dispute resolution.
**Priority:** Should Have

---

### Epic: Payments & Financial Oversight

**Story ID:** US-ADM-09
**User Story:** As an admin, I want to view and reconcile all payment transactions processed via Razorpay, so that I can ensure financial accuracy and detect discrepancies.
**Acceptance Criteria:**
- Given the payments dashboard, when loaded, then transactions display amount, status, doctor, patient, and Razorpay reference ID.
- A daily automated reconciliation report flags mismatches between Razorpay records and internal payment records.
**Priority:** Must Have

---

**Story ID:** US-ADM-10
**User Story:** As an admin, I want to process refunds for disputed or cancelled appointments, so that patients are fairly compensated when issues arise.
**Acceptance Criteria:**
- Given a valid refund case, when an admin initiates a refund via Razorpay, then the refund status updates in real time and the patient is notified.
- All refund actions are logged with admin ID, amount, and reason.
**Priority:** Should Have

---

### Epic: Platform Monitoring & Analytics

**Story ID:** US-ADM-11
**User Story:** As an admin, I want to view a dashboard of key platform metrics (active doctors, daily bookings, revenue, patient growth), so that I can monitor business health.
**Acceptance Criteria:**
- Given the analytics dashboard, when loaded, then core KPIs are displayed with trend charts over a selectable date range (7/30/90 days).
- Data refreshes at least every 24 hours, with a manual refresh option.
**Priority:** Should Have

---

**Story ID:** US-ADM-12
**User Story:** As an admin, I want to configure and broadcast platform-wide notifications (e.g., maintenance alerts, policy updates), so that I can communicate important information to all users.
**Acceptance Criteria:**
- Given the notification composer, when an admin targets a user segment (all/patients/doctors) and sends, then the notification is delivered via the configured channel(s) within 5 minutes.
- Sent broadcasts are logged with timestamp, audience, and content for audit purposes.
**Priority:** Could Have

---

**Story ID:** US-ADM-13
**User Story:** As an admin, I want to view system audit logs of sensitive actions (verifications, suspensions, refunds, role changes), so that I can maintain accountability and support compliance audits.
**Acceptance Criteria:**
- Given the audit log screen, when an admin searches by action type, date range, or actor, then matching log entries display actor, action, timestamp, and outcome.
- Audit logs are immutable (no edit/delete capability within the admin UI).
**Priority:** Must Have

---

## 6. Story Summary by Persona

| Persona | Story Count | Must Have | Should Have | Could Have |
|---------|--------------|-----------|--------------|-------------|
| Patient | 20 | 10 | 7 | 3 |
| Doctor | 18 | 11 | 5 | 2 |
| Admin | 13 | 5 | 5 | 3 |
| **Total** | **51** | **26** | **17** | **8** |

---

## 7. Notes for Backlog Grooming

- Stories marked **Must Have** form the MVP scope and should be prioritized into early sprints (Sprint 1–4).
- Stories with real-time dependencies (Socket.io-based: US-PAT-09, US-PAT-14, US-PAT-15, US-DOC-06, US-DOC-12, US-DOC-14) should be sequenced after core auth and booking flows are stable, since they depend on appointment state transitions.
- Payment-related stories (US-PAT-18, US-ADM-09, US-ADM-10) should be developed alongside a Razorpay sandbox integration before production credentials are introduced.
- Each story should be further broken down into technical tasks (API endpoints, schema changes, UI components, Socket.io event contracts) during sprint planning — this document defines the *what* and *why*, not the implementation *how*.

---

## 8. Revision History

| Version | Date | Author | Change Summary |
|---------|------|--------|------------------|
| 1.0 | 2026-06-24 | Product / Engineering Team | Initial User Stories documentation for DocDock (51 stories across Patient, Doctor, Admin personas). |
