# DocDock — Agile Sprint Plan


---

## Sprint Overview

| Sprint | Theme | Duration |
|---|---|---|
| Sprint 1 | Foundation, Auth & Onboarding | Weeks 1–2 |
| Sprint 2 | Admin Verification & Geo-Doctor Search | Weeks 3–4 |
| Sprint 3 | Appointment Booking, Availability & Slot Engine | Weeks 5–6 |
| Sprint 4 | Real-Time Layer — Live Tracking, Chat & WebRTC Video | Weeks 7–8 |
| Sprint 5 | Payments, Prescriptions, OTP Verification & BullMQ Workers | Weeks 9–10 |
| Sprint 6 | AI Assistant, Ratings, Earnings & Production Launch | Weeks 11–12 |

---

## Sprint 1 — Foundation, Auth & Onboarding

### Sprint Goal
Establish the project skeleton (frontend + backend + database) and deliver secure registration/login for Patients and Doctors with role-based access control, including Google OAuth 2.0.

### User Stories
- As a **Patient**, I can register with email/phone and password so that I can access the platform.
- As a **Doctor**, I can register and submit basic profile details so that I can begin onboarding.
- As a **Patient/Doctor**, I can log in securely and stay authenticated across sessions.
- As a **Patient/Doctor**, I can log in with my Google account (OAuth 2.0) for faster onboarding.
- As an **Admin**, I have a seeded account so that I can access the admin panel from day one.

### Backend Tasks
- Initialize TypeScript + Node.js + Express.js project structure (service-layer / repository pattern).
- Set up MongoDB Atlas connection and base Mongoose schemas: `User`, `Doctor`, `Patient`.
- Implement JWT-based auth (access token: 15min, refresh token: 7 days) and bcrypt password hashing (cost factor 12).
- Build `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` endpoints.
- Integrate Passport.js Google OAuth 2.0 strategy (`/auth/google` + `/auth/google/callback`).
- Implement role-based middleware (`patient`, `doctor`, `admin`).
- Configure environment variables, `.env` structure, and `providers.ts` feature flags.

### Frontend Tasks
- Initialize Next.js 14 App Router project with Tailwind CSS configuration.
- Build shared layout, navigation, and route structure (`/patient/*`, `/doctor/*`, `/admin/*`).
- Build Registration and Login pages for Patient and Doctor with form validation (React Hook Form + Zod).
- Implement JWT storage strategy (localStorage / sessionStorage) and protected route wrapper.
- Implement Google OAuth login button and callback redirect handler.
- Build basic Patient and Doctor dashboard shells (empty states).

### Testing Tasks
- Unit tests for auth controllers (register/login/token refresh).
- Unit tests for bcrypt hashing and JWT signing/verification utilities.
- Integration test: end-to-end registration → login flow (Patient and Doctor).
- Manual QA checklist for form validation edge cases (duplicate email, weak password).

### Deliverables
- Working monorepo (`npm workspaces`) deployed to staging (Vercel + Railway/Render).
- Functional registration and login for Patients and Doctors including Google OAuth.
- Role-based route protection on frontend and backend.
- Seeded Admin account and base database schema in MongoDB Atlas.

---

## Sprint 2 — Admin Verification & Geo-Doctor Search

### Sprint Goal
Enable Admins to verify Doctor accounts and allow Patients to discover nearby verified doctors using geo-location search on an interactive map with filters.

### User Stories
- As a **Doctor**, I can upload verification documents (medical license, government ID, profile photo) during onboarding.
- As an **Admin**, I can view pending doctor applications and approve or reject them with a note.
- As a **Doctor**, I am notified when my account is approved or rejected.
- As a **Patient**, I can search for nearby verified doctors based on my current location.
- As a **Patient**, I can filter doctors by specialization, experience, and maximum fee.

### Backend Tasks
- Extend `Doctor` schema with `verificationStatus` (`pending | approved | rejected`), `documents[]`, `location` (GeoJSON `Point`), `consultationModes`, `consultationFee`.
- Create `2dsphere` index on doctor location field for geospatial queries (`$geoNear`).
- Integrate Cloudinary upload for verification documents (profile photos, medical license, government ID).
- Build `/admin/doctors?status=pending`, `/admin/doctors/:id/approve`, `/admin/doctors/:id/reject` endpoints.
- Build `/doctors/nearby?lat&lng&radius&specialization&minExperience&maxFee&sortBy` endpoint.
- Add status guard: only `approved` doctors are returned in search results.

### Frontend Tasks
- Build Doctor document upload UI (Cloudinary-signed upload, file preview).
- Build Admin dashboard: pending doctors list, document viewer, approve/reject actions with notes.
- Integrate React Leaflet map component for Patient-side nearby doctor search.
- Build doctor list/card UI with distance, specialty, rating, and consultation modes.
- Implement geolocation permission request flow (browser Geolocation API) and saved address fallback.
- Build doctor filter panel (specialization, experience, fee, sort).

### Testing Tasks
- Unit tests for geospatial query logic (mocked coordinates, radius boundaries).
- Unit tests for verification status transitions (`pending` → `approved`/`rejected`).
- Integration test: document upload → admin approval → doctor appears in search.
- Manual QA: map rendering across devices, location permission denial handling.

### Deliverables
- Functional Admin Verification dashboard with document viewer.
- Cloudinary-integrated document upload pipeline.
- Live geo-search returning nearby approved doctors on an interactive map with filters.
- Doctor verification status visible on both Doctor and Admin views.

---

## Sprint 3 — Appointment Booking, Availability & Slot Engine

### Sprint Goal
Allow Patients to book appointments with available doctors across all three consultation modes (Home Visit, Clinic, Online) using a per-day schedule with configurable slots, and allow Doctors to manage their availability and schedule.

### User Stories
- As a **Doctor**, I can configure my per-day schedule (available days, time slots, break times, slot duration, max appointments per day).
- As a **Doctor**, I can enable Vacation Mode to pause all bookings.
- As a **Patient**, I can select a consultation mode (Home Visit / Clinic / Online) when booking.
- As a **Patient**, I can see and select available time slots from the doctor's schedule.
- As a **Patient**, I can book an appointment at a chosen slot.
- As a **Doctor**, I can accept or reject incoming appointment requests.
- As a **Patient**, I can view the current status of my appointment (11 statuses).

### Backend Tasks
- Implement full `Appointment` schema with: `consultationMode` (`clinic | home | online`), `isEmergency`, all 11 status enum values, `rejectionReason`, `cancellationReason`.
- Build `validTransitions` state machine guard enforcing allowed status transitions.
- Build `GET /doctors/:id/slots?date=YYYY-MM-DD` endpoint: generates available slots from doctor's per-day schedule, excludes booked/cancelled slots, respects break times and slot duration.
- Build `POST /payments/create-order` and booking initiation endpoint.
- Build appointment status update endpoints: `/accept`, `/reject`, `/status` (PATCH).
- Build per-day schedule PATCH endpoint on Doctor profile.
- Build vacation mode toggle on Doctor profile.
- Add BullMQ job stub: auto-rejection SLA job for unanswered requests.

### Frontend Tasks
- Build Doctor availability and per-day schedule settings UI.
- Build Vacation Mode toggle on Doctor dashboard.
- Build consultation mode selector in booking flow (Home / Clinic / Online).
- Build slot picker UI showing available time slots per selected date.
- Build address selector for Home Visit bookings (saved addresses + new address with map picker).
- Build Patient-side appointment status tracker UI (state-driven, all 11 statuses with color-coding).
- Build Doctor-side incoming request queue with Accept/Reject actions.

### Testing Tasks
- Unit tests for appointment state transition guards (invalid transitions blocked).
- Unit tests for slot generation logic (break times, existing bookings, slot duration).
- Integration test: booking request → doctor accept → status reflected for patient.
- Manual QA: race condition check (two patients booking same slot simultaneously).

### Deliverables
- End-to-end appointment booking flow with mode selection and slot picker.
- Per-day schedule and vacation mode management for Doctors.
- Full 11-state appointment lifecycle enforced in backend.
- Patient and Doctor dashboards reflecting current appointment state.

---

## Sprint 4 — Real-Time Layer: Live Tracking, Chat & WebRTC Video

### Sprint Goal
Introduce Socket.io to power live doctor location tracking and real-time Patient ↔ Doctor chat, and implement WebRTC-based peer-to-peer video/audio calling for Online consultation mode.

### User Stories
- As a **Patient**, I can see my doctor's live location on a map once they're en route (Home Visit).
- As a **Doctor**, my location updates are broadcast automatically while traveling.
- As a **Patient/Doctor**, I can exchange real-time chat messages during an active appointment.
- As a **Patient**, I receive a live status update when my doctor marks "Arrived" or "Start Consultation."
- As a **Patient/Doctor**, I can conduct a video/audio consultation for Online appointments.

### Backend Tasks
- Set up Socket.io server with 4 namespaces: `/tracking`, `/chat`, `/availability`, `/notifications`.
- Configure Redis adapter for Socket.io multi-instance pub/sub.
- Implement `location:update` event handling and broadcast to patient room (geo-fence validation for `arrived`).
- Implement chat message event handling with MongoDB persistence (`chat_messages` collection via `ChatMessageModel`).
- Implement `appointment:status_changed` broadcast on every state transition.
- Add JWT-based Socket.io auth middleware (token on connection handshake).
- Implement WebRTC call signalling relay events in `/notifications` namespace: `call:initiate`, `call:accept`, `call:reject`, `call:hangup`, `webrtc:signal`.
- Create `CallLogModel` (`call_logs` collection) for online call metadata persistence.
- Add BullMQ online timeout job: auto-reject online appointments where doctor doesn't join within SLA window.

### Frontend Tasks
- Integrate `socket.io-client` in Next.js with connection lifecycle management across namespaces.
- Build live tracking map view (React Leaflet + moving marker via location events).
- Build real-time chat UI component (message list, input, typing indicator).
- Build WebRTC video consultation room (camera/microphone controls, screen sharing, call accept/reject).
- Wire appointment status UI to real-time `status_changed` events.
- Handle reconnect/offline states gracefully (room rejoin handshake on reconnect).
- Build incoming call modal for patients in Online mode.

### Testing Tasks
- Unit tests for Socket.io event handlers (location update, chat message, status change).
- Integration test: simulate doctor location stream → verify patient client receives updates.
- Integration test: chat message persistence and delivery order.
- Integration test: WebRTC signalling relay (offer → answer → ICE candidates).
- Manual QA: multi-tab/multi-device session handling, socket reconnection after network drop.

### Deliverables
- Live doctor tracking on Patient's map during "Doctor On Way" state.
- Functional real-time chat scoped to active appointments.
- Fully event-driven appointment status updates (no polling required).
- Working WebRTC video/audio consultation for Online mode appointments.
- Call logs persisted per consultation.

---

## Sprint 5 — Payments, Prescriptions, OTP Verification & BullMQ Workers

### Sprint Goal
Enable end-to-end monetization and post-consultation workflows: Razorpay payments with webhook verification, OTP-based session verification for online appointments, digital prescription generation, and full BullMQ worker infrastructure.

### User Stories
- As a **Patient**, I can pay for my consultation securely via Razorpay (UPI, card, net banking).
- As a **Patient**, I can initiate a retry if payment fails, within the booking window.
- As a **Doctor**, I receive an OTP prompt to verify the patient's identity before starting an online session.
- As a **Patient**, I receive the OTP on my registered mobile and share it with the doctor.
- As a **Doctor**, I can generate a digital prescription after completing a consultation.
- As a **Patient**, I can view/download my prescription as a PDF.
- As a **Patient/Doctor**, I receive notifications for key events (booking confirmed, doctor en route, payment success, refund initiated).

### Backend Tasks
- Integrate Razorpay order creation API and HMAC-SHA256 webhook signature verification.
- Build `Payment` schema and link to `Appointment`; implement automatic Razorpay refund on cancellation.
- Build `/payments/create-order` and `/payments/webhook/razorpay` endpoints.
- Build `AppointmentOtp` schema (`otp.model.ts`) with SHA-256 hashed OTP, TTL expiry.
- Build `/appointments/:id/otp/generate` and `/appointments/:id/otp/verify` endpoints.
- Integrate Twilio SMS for OTP delivery.
- Build `Prescription` schema and PDF generation (HTML template → jsPDF/html2canvas → Cloudinary).
- Build QR code generation for prescription verification.
- Build `/prescriptions/verify/:id` public endpoint for pharmacy verification.
- Wire BullMQ workers: appointment reminders, notification dispatch, cleanup (expired OTPs, stale tokens).
- Build centralized Notification Service (in-app via Socket.io, email via SendGrid, SMS via Twilio).

### Frontend Tasks
- Integrate Razorpay Checkout UI on the booking/payment screen with retry option.
- Build payment status screen (success/failure/retry).
- Build Doctor-side "Generate & Start Consultation" OTP flow (generate OTP button, enter OTP field).
- Build Doctor-side "Generate Prescription" form (diagnosis, medicines, notes, follow-up).
- Build Patient-side prescription view/download page (PDF download via signed URL).
- Build in-app notification center (toast notifications + persistent unread list).
- Build appointment receipt/payment summary screen.

### Testing Tasks
- Unit tests for Razorpay webhook signature verification logic.
- Unit tests for OTP hash/verify logic (valid OTP, expired OTP, invalid OTP).
- Unit tests for prescription PDF generation service.
- Integration test: full payment flow from order creation to webhook-confirmed booking.
- Integration test: prescription generation → Cloudinary upload → patient retrieval.
- Manual QA: payment failure/retry edge cases, OTP expiry and resend, notification delivery.

### Deliverables
- Functional Razorpay payment flow with server-verified webhook confirmation.
- OTP-based session verification for online appointments.
- Digital prescription generation with PDF download and QR verification.
- Full BullMQ worker infrastructure (reminders, notification dispatch, cleanup).
- Full transaction history visible to Patients and Admins.

---

## Sprint 6 — AI Assistant, Ratings, Earnings & Production Launch

### Sprint Goal
Add the AI Symptom Checker and medical assistant (Google Gemini), close the appointment loop with ratings/reviews, add doctor earnings tracking, harden the system for production, and complete deployment.

### User Stories
- As a **Patient**, I can describe my symptoms to an AI assistant and receive medical guidance and specialist recommendations.
- As a **Patient**, I can ask follow-up questions in a multi-turn AI chat session.
- As a **Patient**, I can rate and review my doctor after a completed consultation.
- As a **Doctor**, I can view my aggregate rating and recent reviews.
- As a **Doctor**, I can view my earnings history and total revenue from completed appointments.
- As an **Admin**, I can view platform-wide analytics (appointments, doctors, revenue).
- As a **user**, I experience consistent error handling and graceful failure states throughout the app.

### Backend Tasks
- Integrate Google Gemini API (`@google/generative-ai` SDK) with lazy initialisation and feature flag.
- Build `/ai/symptom-check` and `/ai/chat` endpoints with SSE streaming response.
- Implement rule-based fallback when Gemini is unavailable.
- Build `Review` schema and `/reviews` POST endpoint.
- Implement aggregate rating recalculation logic on new review submission (update `avgRating`, `reviewCount` on Doctor document).
- Build Doctor earnings endpoints: total earnings, per-appointment breakdown, earnings by date range.
- Add rate limiting, input sanitization, and Helmet security middleware hardening.
- Add centralized error-handling middleware and structured logging.
- Build Admin analytics endpoints (appointment volume, doctor onboarding count, revenue, verification queue depth).
- Performance pass: review and optimize MongoDB indexes across all 11 collections.

### Frontend Tasks
- Build Patient-facing AI Symptom Checker chat UI (streaming response, specialist shortcut button).
- Build Patient-side multi-turn AI chat interface with conversation history.
- Build Patient-side review submission UI (star rating + comment).
- Build Doctor profile rating display (aggregate score + review list).
- Build Doctor earnings dashboard (total, per-appointment, charts).
- Build Admin analytics dashboard (summary cards, charts).
- UI polish pass: loading states, empty states, error boundaries across all major flows.
- Accessibility and responsive design audit across Patient/Doctor/Admin views.

### Testing Tasks
- Unit tests for rating aggregation logic.
- Unit tests for AI fallback logic (Gemini unavailable → rule-based response).
- End-to-end regression test across full appointment lifecycle (booking → payment → consultation → prescription → review).
- Security testing: auth bypass attempts, input injection checks, rate-limit verification.
- Load/performance testing on geo-search and Socket.io connections under simulated concurrency.
- Final UAT (User Acceptance Testing) checklist sign-off.

### Deliverables
- AI Symptom Checker and multi-turn medical assistant live for patients.
- Doctor ratings & reviews fully integrated and visible platform-wide.
- Doctor earnings dashboard.
- Admin analytics dashboard live.
- Hardened, production-ready backend (security middleware, logging, error handling, BullMQ workers).
- Final deployment to production (Vercel + Railway/Render + MongoDB Atlas + Redis Cloud).
- Portfolio-ready, fully functional DocDock platform across all 12+ core features.
