# DocDock — Agile Sprint Plan


---

## Sprint Overview

| Sprint | Theme | Duration |
|---|---|---|
| Sprint 1 | Foundation, Auth & Onboarding | Weeks 1–2 |
| Sprint 2 | Admin Verification & Geo-Doctor Search | Weeks 3–4 |
| Sprint 3 | Appointment Booking & Availability Engine | Weeks 5–6 |
| Sprint 4 | Real-Time Layer — Live Tracking & Chat | Weeks 7–8 |
| Sprint 5 | Payments, Prescriptions & Notifications | Weeks 9–10 |
| Sprint 6 | Ratings, Hardening & Production Launch | Weeks 11–12 |

---

## Sprint 1 — Foundation, Auth & Onboarding

### Sprint Goal
Establish the project skeleton (frontend + backend + database) and deliver secure registration/login for Patients and Doctors with role-based access.

### User Stories
- As a **Patient**, I can register with email/phone and password so that I can access the platform.
- As a **Doctor**, I can register and submit basic profile details so that I can begin onboarding.
- As a **Patient/Doctor**, I can log in securely and stay authenticated across sessions.
- As an **Admin**, I have a seeded account so that I can access the admin panel from day one.

### Backend Tasks
- Initialize Node.js + Express.js project structure (MVC/service-layer pattern).
- Set up MongoDB Atlas connection and base Mongoose schemas: `User`, `Doctor`, `Admin`.
- Implement JWT-based auth (access + refresh tokens) and bcrypt password hashing.
- Build `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` endpoints.
- Implement role-based middleware (`patient`, `doctor`, `admin`).
- Configure environment variables and `.env` structure for secrets.

### Frontend Tasks
- Initialize Next.js 14 project with Tailwind CSS configuration.
- Build shared layout, navigation, and route structure (Patient / Doctor / Admin segments).
- Build Registration and Login pages with form validation.
- Implement JWT storage strategy (HTTP-only cookies) and protected route wrapper.
- Build basic Patient and Doctor dashboard shells (empty states).

### Testing Tasks
- Unit tests for auth controllers (register/login/token refresh).
- Unit tests for bcrypt hashing and JWT signing/verification utilities.
- Integration test: end-to-end registration → login flow (Patient and Doctor).
- Manual QA checklist for form validation edge cases (duplicate email, weak password).

### Deliverables
- Working monorepo/two-repo setup deployed to staging (Vercel + Railway/Render).
- Functional registration and login for Patients and Doctors.
- Role-based route protection on frontend and backend.
- Seeded Admin account and base database schema in MongoDB Atlas.

---

## Sprint 2 — Admin Verification & Geo-Doctor Search

### Sprint Goal
Enable Admins to verify Doctor accounts and allow Patients to discover nearby verified doctors using geo-location.

### User Stories
- As a **Doctor**, I can upload verification documents (license, ID) during onboarding.
- As an **Admin**, I can view pending doctor applications and approve or reject them.
- As a **Doctor**, I am notified when my account is verified or rejected.
- As a **Patient**, I can search for nearby verified doctors based on my current location.

### Backend Tasks
- Extend `Doctor` schema with `verificationStatus`, `documents[]`, `location` (GeoJSON `Point`).
- Create `2dsphere` index on doctor location field for geospatial queries.
- Integrate Cloudinary upload for verification documents.
- Build `/admin/doctors/pending`, `/admin/doctors/:id/approve`, `/admin/doctors/:id/reject` endpoints.
- Build `/doctors/nearby?lat&lng&radius` endpoint using `$geoNear`.
- Add status guard middleware: only `verified` doctors are returned in search results.

### Frontend Tasks
- Build Doctor document upload UI (Cloudinary widget/signed upload).
- Build Admin dashboard: pending doctors list, document preview, approve/reject actions.
- Integrate React Leaflet map component for Patient-side nearby doctor search.
- Build doctor list/card UI with distance, specialty, and verification badge.
- Implement geolocation permission request flow (browser Geolocation API).

### Testing Tasks
- Unit tests for geospatial query logic (mocked coordinates, radius boundaries).
- Unit tests for verification status transitions (pending → verified/rejected).
- Integration test: document upload → admin approval → doctor appears in search.
- Manual QA: map rendering across devices, location permission denial handling.

### Deliverables
- Functional Admin Verification dashboard.
- Cloudinary-integrated document upload pipeline.
- Live geo-search returning nearby verified doctors on an interactive map.
- Doctor verification status visible on both Doctor and Admin views.

---

## Sprint 3 — Appointment Booking & Availability Engine

### Sprint Goal
Allow Patients to book appointments with available doctors and allow Doctors to manage their real-time availability.

### User Stories
- As a **Doctor**, I can toggle my availability status (Online/Offline) in real time.
- As a **Patient**, I can only book doctors who are currently marked available.
- As a **Patient**, I can request an appointment with a selected doctor.
- As a **Doctor**, I can accept or reject incoming appointment requests.
- As a **Patient**, I can view the current status of my appointment.

### Backend Tasks
- Create `Appointment` schema with status enum (`pending`, `accepted`, `rejected`, `doctor_on_way`, `in_consultation`, `completed`, `reviewed`).
- Build `/appointments` POST endpoint (create booking request).
- Build `/appointments/:id/accept` and `/appointments/:id/reject` endpoints with transition guards.
- Build `/doctors/:id/availability` PATCH endpoint (toggle online/offline).
- Filter geo-search results (Sprint 2) by live availability status.
- Add scheduled job stub for SLA-based auto-rejection on unanswered requests.

### Frontend Tasks
- Build Doctor availability toggle on Doctor dashboard.
- Build "Book Appointment" flow from doctor profile/map card.
- Build Patient-side appointment status tracker UI (state-driven).
- Build Doctor-side incoming request queue with Accept/Reject actions.
- Add optimistic UI updates with polling fallback (pre-Socket.io).

### Testing Tasks
- Unit tests for appointment state transition guards (invalid transitions blocked).
- Unit tests for availability filter logic in geo-search.
- Integration test: booking request → doctor accept → status reflected for patient.
- Manual QA: race condition check (two patients booking same doctor simultaneously).

### Deliverables
- End-to-end appointment booking flow (request → accept/reject).
- Real-time-ready `Appointment` data model with full status lifecycle support.
- Doctor availability toggle live on the platform.
- Patient and Doctor dashboards reflecting current appointment state.

---

## Sprint 4 — Real-Time Layer: Live Tracking & Chat

### Sprint Goal
Introduce Socket.io to power live doctor location tracking and real-time Patient ↔ Doctor chat during an active appointment.

### User Stories
- As a **Patient**, I can see my doctor's live location on a map once they're en route.
- As a **Doctor**, my location updates are broadcast automatically while traveling.
- As a **Patient/Doctor**, I can exchange real-time chat messages during an active appointment.
- As a **Patient**, I receive a live status update when my doctor marks "Arrived" or "Start Consultation."

### Backend Tasks
- Set up Socket.io server alongside Express.js with namespace/room-per-appointment design.
- Implement `location:update` event handling and broadcast to the relevant patient room.
- Implement `chat:message` event handling with MongoDB persistence (`Message` schema).
- Implement `appointment:status_changed` broadcast on every state transition.
- Add JWT-based Socket.io auth middleware (token passed on connection handshake).

### Frontend Tasks
- Integrate `socket.io-client` in Next.js with connection lifecycle management.
- Build live tracking map view (React Leaflet + moving marker via location events).
- Build real-time chat UI component (message list, input, typing indicator optional).
- Wire appointment status UI (Sprint 3) to real-time `status_changed` events instead of polling.
- Handle reconnect/offline states gracefully in the UI.

### Testing Tasks
- Unit tests for Socket.io event handlers (location update, chat message, status change).
- Integration test: simulate doctor location stream → verify patient client receives updates.
- Integration test: chat message persistence and delivery order.
- Manual QA: multi-tab/multi-device session handling, socket reconnection after network drop.

### Deliverables
- Live doctor tracking on Patient's map during "Doctor On Way" state.
- Functional real-time chat scoped to active appointments.
- Fully event-driven appointment status updates (no polling required).
- Persisted chat history retrievable per appointment.

---

## Sprint 5 — Payments, Prescriptions & Notifications

### Sprint Goal
Enable end-to-end monetization and post-consultation workflows: payments via Razorpay, digital prescription generation, and multi-channel notifications.

### User Stories
- As a **Patient**, I can pay for my consultation securely via Razorpay.
- As a **Doctor**, I can generate a digital prescription after completing a consultation.
- As a **Patient**, I can view/download my prescription as a PDF.
- As a **Patient/Doctor**, I receive notifications for key events (booking confirmed, doctor arriving, payment success).

### Backend Tasks
- Integrate Razorpay order creation API and webhook signature verification.
- Build `Transaction` schema and link to `Appointment`.
- Build `/payments/create-order` and `/payments/webhook` endpoints.
- Build `Prescription` schema and PDF generation service (e.g., via a templating + PDF library).
- Upload generated prescription PDFs to Cloudinary and store secure URL reference.
- Build centralized Notification Service abstraction (push/SMS/email dispatch interface).
- Wire notification triggers into booking, payment, and prescription events.

### Frontend Tasks
- Integrate Razorpay Checkout UI on the booking/payment screen.
- Build payment status screen (success/failure/retry).
- Build Doctor-side "Generate Prescription" form (diagnosis, medicines, notes).
- Build Patient-side prescription view/download page.
- Build in-app notification center (toast + persistent list).

### Testing Tasks
- Unit tests for Razorpay webhook signature verification logic.
- Unit tests for prescription PDF generation service.
- Integration test: full payment flow from order creation to webhook-confirmed status update.
- Integration test: prescription generation → Cloudinary upload → patient retrieval.
- Manual QA: payment failure/retry edge cases, notification delivery across channels.

### Deliverables
- Functional Razorpay payment flow with server-verified confirmation.
- Digital prescription generation and patient-facing PDF access.
- Centralized notification system triggering on key lifecycle events.
- Full transaction history visible to Patients and Admins.

---

## Sprint 6 — Ratings, Hardening & Production Launch

### Sprint Goal
Close the appointment loop with ratings/reviews, harden the system for production (security, performance, error handling), and complete deployment.

### User Stories
- As a **Patient**, I can rate and review my doctor after a completed consultation.
- As a **Doctor**, I can view my aggregate rating and recent reviews.
- As an **Admin**, I can view platform-wide analytics (appointments, doctors, revenue).
- As a **user**, I experience consistent error handling and graceful failure states throughout the app.

### Backend Tasks
- Build `Review` schema and `/appointments/:id/review` endpoint.
- Implement aggregate rating recalculation logic on new review submission.
- Add rate limiting, input sanitization, and helmet/security middleware hardening.
- Add centralized error-handling middleware and structured logging.
- Build basic Admin analytics endpoints (appointment volume, revenue, doctor performance).
- Performance pass: review and optimize MongoDB indexes across all collections.

### Frontend Tasks
- Build Patient-side review submission UI (star rating + comment).
- Build Doctor profile rating display (aggregate score + review list).
- Build Admin analytics dashboard (charts/summary cards).
- UI polish pass: loading states, empty states, error boundaries across all major flows.
- Accessibility and responsive design audit across Patient/Doctor/Admin views.

### Testing Tasks
- Unit tests for rating aggregation logic.
- End-to-end regression test across full appointment lifecycle (booking → payment → consultation → review).
- Security testing: auth bypass attempts, input injection checks, rate-limit verification.
- Load/performance testing on geo-search and Socket.io connections under simulated concurrency.
- Final UAT (User Acceptance Testing) checklist sign-off.

### Deliverables
- Doctor ratings & reviews fully integrated and visible platform-wide.
- Admin analytics dashboard live.
- Hardened, production-ready backend (security middleware, logging, error handling).
- Final deployment to production environments (Vercel, Railway/Render, MongoDB Atlas).
- Portfolio-ready, fully functional DocDock platform across all 12 core features.
