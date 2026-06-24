# DocDock — Functional Requirements Specification
---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Scope](#2-scope)
3. [Definitions and Acronyms](#3-definitions-and-acronyms)
4. [Actors](#4-actors)
5. [Authentication Module](#5-authentication-module)
6. [Doctor Management Module](#6-doctor-management-module)
7. [Patient Management Module](#7-patient-management-module)
8. [Appointment System Module](#8-appointment-system-module)
9. [Location Tracking Module](#9-location-tracking-module)
10. [Chat System Module](#10-chat-system-module)
11. [Prescription System Module](#11-prescription-system-module)
12. [Review System Module](#12-review-system-module)
13. [Payments Module](#13-payments-module)
14. [Notifications Module](#14-notifications-module)
15. [Admin Dashboard Module](#15-admin-dashboard-module)
16. [Requirements Traceability Matrix](#16-requirements-traceability-matrix)

---

## 1. Introduction

DocDock is a Doctor-on-Demand healthcare platform that connects patients with verified, nearby doctors for home consultations. Modelled on the on-demand service paradigm, DocDock enables patients to discover available doctors by proximity, book appointments in real time, track doctor arrival, consult via in-app chat, receive digital prescriptions, and process payments — all within a single unified interface.

This document specifies the complete set of functional requirements for the DocDock platform. Each requirement is traceable, prioritised, and scoped to a specific actor and trigger. This specification serves as the authoritative reference for design, development, testing, and acceptance activities.

---

## 2. Scope

This FRS covers all system functionality for the following user-facing surfaces:

- Patient web/mobile application (Next.js 14 frontend)
- Doctor web/mobile application (Next.js 14 frontend)
- Admin dashboard (Next.js 14 frontend)
- Backend API (Node.js + Express.js)
- Real-time services (Socket.io)
- Payment processing (Razorpay)
- Storage (Cloudinary)
- Database (MongoDB Atlas)

Out of scope for v1.0: telemedicine video calling, insurance processing, multi-language support, and third-party EHR integration.

---

## 3. Definitions and Acronyms

| Term | Definition |
|---|---|
| Actor | A user role or external system that interacts with DocDock |
| FR | Functional Requirement |
| JWT | JSON Web Token — stateless authentication mechanism |
| OTP | One-Time Password |
| Geo-fence | A virtual perimeter around a geographic area |
| ETA | Estimated Time of Arrival |
| SRS | Software Requirements Specification |
| FRS | Functional Requirements Specification |
| KYC | Know Your Customer — identity verification process |
| API | Application Programming Interface |
| RBAC | Role-Based Access Control |

---

## 4. Actors

| Actor ID | Actor | Description |
|---|---|---|
| A-01 | Patient | A registered user who books home consultations |
| A-02 | Doctor | A verified medical professional who accepts and fulfils consultations |
| A-03 | Admin | A DocDock platform administrator who manages users, verification, and disputes |
| A-04 | System | Automated platform processes (scheduler, notifier, payment service) |

---

## 5. Authentication Module

---

### FR-001 — Patient Registration

| Field | Detail |
|---|---|
| **ID** | FR-001 |
| **Title** | Patient Self-Registration |
| **Priority** | Critical |
| **Module** | Authentication |
| **Actor** | Patient |

**Description:**  
The system shall allow a new patient to create an account by providing their full name, mobile number, email address, date of birth, gender, and a secure password. Upon submission, the system shall validate all fields, hash the password using bcrypt, store the record in MongoDB Atlas, and issue a JWT access token alongside a refresh token.

**Trigger:**  
Patient navigates to the registration page and submits the registration form.

**Preconditions:**
- The patient does not already have an account with the provided email or mobile number.
- The platform registration feature is enabled by Admin.

**Postconditions:**
- A new Patient document is created in the database with `status: unverified`.
- An email verification link is dispatched to the provided email address.
- The patient is redirected to an email verification pending screen.

---

### FR-002 — Patient Email Verification

| Field | Detail |
|---|---|
| **ID** | FR-002 |
| **Title** | Patient Email Verification |
| **Priority** | Critical |
| **Module** | Authentication |
| **Actor** | Patient, System |

**Description:**  
The system shall send a time-limited (24 hours) email verification link upon patient registration. When the patient clicks the link, the system shall validate the token and update the patient's account status to `verified`.

**Trigger:**  
Patient clicks the verification link in their registration email.

**Preconditions:**
- FR-001 has been completed successfully.
- The verification token has not expired.

**Postconditions:**
- Patient account status updated to `verified`.
- Patient is redirected to the login screen with a success notification.
- Expired or invalid tokens display an appropriate error with an option to resend.

---

### FR-003 — Patient Login

| Field | Detail |
|---|---|
| **ID** | FR-003 |
| **Title** | Patient Login with JWT |
| **Priority** | Critical |
| **Module** | Authentication |
| **Actor** | Patient |

**Description:**  
The system shall authenticate a patient using their registered email or mobile number and password. On successful authentication, the system shall issue a short-lived JWT access token (15 minutes) and a long-lived refresh token (7 days), storing the refresh token in an HTTP-only cookie.

**Trigger:**  
Patient submits the login form with valid credentials.

**Preconditions:**
- Patient account exists and is in `verified` status.
- Patient account is not suspended or banned.

**Postconditions:**
- JWT access token returned to the client.
- Refresh token stored securely as HTTP-only cookie.
- Patient session established; patient is redirected to the home dashboard.
- Failed login attempts are logged; account is temporarily locked after 5 consecutive failures.

---

### FR-004 — Doctor Registration

| Field | Detail |
|---|---|
| **ID** | FR-004 |
| **Title** | Doctor Self-Registration |
| **Priority** | Critical |
| **Module** | Authentication |
| **Actor** | Doctor |

**Description:**  
The system shall allow a medical professional to register by providing their full name, mobile number, email address, medical registration number, specialisation, years of experience, clinic/practice address, consultation fee, and a profile photograph. The system shall also allow upload of supporting KYC documents (medical degree, government-issued ID) via Cloudinary.

**Trigger:**  
Doctor navigates to the doctor registration page and submits the form with all required documents.

**Preconditions:**
- The email and medical registration number are not already in use.
- Uploaded documents are in accepted formats (PDF, JPG, PNG) and within size limits (max 5 MB per file).

**Postconditions:**
- A new Doctor document is created with `status: pending_verification`.
- Documents are stored on Cloudinary; URLs are saved to the Doctor record.
- Admin receives a notification of a new pending verification request.
- Doctor receives a confirmation email indicating their application is under review.

---

### FR-005 — Doctor Login

| Field | Detail |
|---|---|
| **ID** | FR-005 |
| **Title** | Doctor Login with JWT |
| **Priority** | Critical |
| **Module** | Authentication |
| **Actor** | Doctor |

**Description:**  
The system shall authenticate a doctor using their registered email and password. Login shall be permitted only if the doctor's account status is `verified`. Doctors with `pending_verification` or `suspended` status shall be denied access with an appropriate message.

**Trigger:**  
Doctor submits the login form.

**Preconditions:**
- Doctor account exists with status `verified`.

**Postconditions:**
- JWT access token and refresh token issued.
- Doctor redirected to their availability dashboard.

---

### FR-006 — Token Refresh

| Field | Detail |
|---|---|
| **ID** | FR-006 |
| **Title** | Silent JWT Token Refresh |
| **Priority** | High |
| **Module** | Authentication |
| **Actor** | Patient, Doctor, System |

**Description:**  
When a user's JWT access token expires, the system shall automatically use the stored refresh token to obtain a new access token without requiring re-login, provided the refresh token is valid and not revoked.

**Trigger:**  
API request returns HTTP 401 Unauthorized due to expired access token.

**Preconditions:**
- A valid, non-revoked refresh token exists in the HTTP-only cookie.

**Postconditions:**
- New access token issued and returned to client.
- Subsequent API request retried with the new token.
- If the refresh token is also expired, the user is redirected to the login screen.

---

### FR-007 — Logout

| Field | Detail |
|---|---|
| **ID** | FR-007 |
| **Title** | User Logout |
| **Priority** | High |
| **Module** | Authentication |
| **Actor** | Patient, Doctor |

**Description:**  
The system shall allow any authenticated user to log out. On logout, the server shall revoke the refresh token and clear the HTTP-only cookie. The access token shall be invalidated via a token blocklist with TTL matching the remaining token lifetime.

**Trigger:**  
User clicks the Logout button.

**Preconditions:**
- User is authenticated.

**Postconditions:**
- Refresh token revoked in the database.
- Cookie cleared on the client.
- User redirected to the landing/login page.

---

### FR-008 — Password Reset

| Field | Detail |
|---|---|
| **ID** | FR-008 |
| **Title** | Forgot Password / Password Reset |
| **Priority** | High |
| **Module** | Authentication |
| **Actor** | Patient, Doctor |

**Description:**  
The system shall allow a user to request a password reset by entering their registered email. The system shall send a time-limited reset link (1 hour). When the user accesses the link and submits a new password, the system shall validate password strength, hash the new password with bcrypt, and update the record.

**Trigger:**  
User clicks "Forgot Password" and submits their email address.

**Preconditions:**
- The email address belongs to a registered account.

**Postconditions:**
- Password updated in the database.
- All active refresh tokens for the account are revoked.
- User receives a confirmation email.
- Used reset token is invalidated immediately.

---

### FR-009 — Role-Based Access Control

| Field | Detail |
|---|---|
| **ID** | FR-009 |
| **Title** | RBAC — Route and Feature Protection |
| **Priority** | Critical |
| **Module** | Authentication |
| **Actor** | System |

**Description:**  
The system shall enforce role-based access control across all API endpoints and frontend routes. The three roles — `patient`, `doctor`, and `admin` — shall have strictly defined access scopes. JWT payload shall contain the user's role, and middleware shall validate this role on every protected request.

**Trigger:**  
Any authenticated request to a protected API endpoint or frontend route.

**Preconditions:**
- User is authenticated with a valid JWT.

**Postconditions:**
- Request proceeds if the user's role matches the required role.
- HTTP 403 Forbidden returned if the role does not match.
- Unauthorised access attempts are logged for audit.

---

## 6. Doctor Management Module

---

### FR-010 — Admin Verification of Doctor

| Field | Detail |
|---|---|
| **ID** | FR-010 |
| **Title** | Admin Verification of Doctor Profile |
| **Priority** | Critical |
| **Module** | Doctor Management |
| **Actor** | Admin |

**Description:**  
The system shall provide an Admin interface to review a doctor's registration application, inspect uploaded documents, and either approve or reject the application with a mandatory reason note. Approved doctors are transitioned to `verified` status; rejected doctors are notified with the rejection reason.

**Trigger:**  
Admin clicks on a pending doctor application in the Admin Dashboard.

**Preconditions:**
- At least one doctor application exists with `status: pending_verification`.
- Admin is authenticated with the `admin` role.

**Postconditions:**
- On approval: doctor status updated to `verified`; doctor receives an approval email and can now log in.
- On rejection: doctor status updated to `rejected`; doctor receives a rejection email with the reason; application is archived.

---

### FR-011 — Doctor Profile Management

| Field | Detail |
|---|---|
| **ID** | FR-011 |
| **Title** | Doctor Profile Update |
| **Priority** | High |
| **Module** | Doctor Management |
| **Actor** | Doctor |

**Description:**  
The system shall allow a verified doctor to update their profile information including bio, specialisation, consultation fee, profile photo, and availability schedule. Changes to critical fields (medical registration number, documents) shall require re-verification by Admin.

**Trigger:**  
Doctor navigates to Profile Settings and submits updated information.

**Preconditions:**
- Doctor is authenticated and verified.

**Postconditions:**
- Profile updated in the database and reflected immediately on the patient-facing search results.
- If critical fields are modified, doctor status reverts to `pending_verification` and doctor is notified.

---

### FR-012 — Doctor Availability Toggle

| Field | Detail |
|---|---|
| **ID** | FR-012 |
| **Title** | Real-Time Doctor Availability Toggle |
| **Priority** | Critical |
| **Module** | Doctor Management |
| **Actor** | Doctor |

**Description:**  
The system shall allow a verified doctor to toggle their availability status between `available` and `unavailable` in real time. When set to `available`, the doctor's current geo-location shall be broadcast via Socket.io to all connected patients searching in that vicinity. When set to `unavailable`, the doctor shall be removed from active search results.

**Trigger:**  
Doctor toggles the availability switch on their dashboard.

**Preconditions:**
- Doctor is authenticated, verified, and has location permissions granted.

**Postconditions:**
- Doctor's `isAvailable` field updated in MongoDB.
- Socket.io event emitted to the `availability` channel.
- If `available`: doctor appears in nearby search results.
- If `unavailable`: doctor removed from real-time search; any pending booking requests are cancelled with notifications to affected patients.

---

### FR-013 — Doctor Earnings Dashboard

| Field | Detail |
|---|---|
| **ID** | FR-013 |
| **Title** | Doctor Earnings and Appointment History |
| **Priority** | Medium |
| **Module** | Doctor Management |
| **Actor** | Doctor |

**Description:**  
The system shall provide a doctor with a dashboard displaying their total earnings, completed consultation count, pending payouts, and a tabular history of all appointments with patient name, date, amount, and status.

**Trigger:**  
Doctor navigates to the Earnings section of their dashboard.

**Preconditions:**
- Doctor is authenticated and verified.
- At least one completed appointment exists.

**Postconditions:**
- Dashboard renders with accurate aggregated data from the Appointments collection.
- Data is filterable by date range (today, this week, this month, custom).

---

## 7. Patient Management Module

---

### FR-014 — Patient Profile Management

| Field | Detail |
|---|---|
| **ID** | FR-014 |
| **Title** | Patient Profile Update |
| **Priority** | High |
| **Module** | Patient Management |
| **Actor** | Patient |

**Description:**  
The system shall allow a registered patient to view and update their profile, including full name, profile photo, date of birth, gender, address, and emergency contact. The patient shall also be able to manage saved addresses for consultation locations.

**Trigger:**  
Patient navigates to Profile Settings and submits an update.

**Preconditions:**
- Patient is authenticated and verified.

**Postconditions:**
- Profile record updated in the database.
- Updated profile photo uploaded to Cloudinary; old photo URL replaced.

---

### FR-015 — Medical History Management

| Field | Detail |
|---|---|
| **ID** | FR-015 |
| **Title** | Patient Medical History |
| **Priority** | Medium |
| **Module** | Patient Management |
| **Actor** | Patient |

**Description:**  
The system shall allow a patient to maintain a structured medical history profile, including known allergies, chronic conditions, current medications, blood group, and past prescriptions received through DocDock. This information shall be viewable by an assigned doctor during an active consultation.

**Trigger:**  
Patient navigates to the Medical History section and adds or updates entries.

**Preconditions:**
- Patient is authenticated.

**Postconditions:**
- Medical history saved to the Patient document.
- During an active consultation, the assigned doctor can read (but not modify) the patient's medical history via the consultation interface.

---

### FR-016 — Patient Appointment History

| Field | Detail |
|---|---|
| **ID** | FR-016 |
| **Title** | Patient Appointment and Prescription History |
| **Priority** | Medium |
| **Module** | Patient Management |
| **Actor** | Patient |

**Description:**  
The system shall provide a patient with a chronological history of all their past and upcoming appointments, including the doctor's name, consultation date, status, amount paid, and a link to download the digital prescription (where available).

**Trigger:**  
Patient navigates to the My Appointments section.

**Preconditions:**
- Patient is authenticated.

**Postconditions:**
- Appointment history rendered with filtering options (upcoming, completed, cancelled).
- Each completed appointment with a prescription displays a Download PDF option.

---

## 8. Appointment System Module

---

### FR-017 — Nearby Doctor Search

| Field | Detail |
|---|---|
| **ID** | FR-017 |
| **Title** | Geo-Based Nearby Doctor Search |
| **Priority** | Critical |
| **Module** | Appointment System |
| **Actor** | Patient |

**Description:**  
The system shall allow a patient to search for available, verified doctors within a configurable radius (default 10 km) of their current or specified location. Results shall be displayed on an interactive map (React Leaflet) and as a sorted list by distance. Filters for specialisation, gender, and consultation fee range shall be provided.

**Trigger:**  
Patient opens the Find a Doctor screen and grants location access (or manually enters an address).

**Preconditions:**
- Patient is authenticated.
- At least one doctor is available within the search radius.

**Postconditions:**
- Map renders with doctor markers indicating their real-time location.
- List view shows doctor name, specialisation, rating, distance, ETA estimate, and fee.
- Real-time updates via Socket.io reflect any new doctors coming online or going offline within the search area.

---

### FR-018 — Appointment Booking

| Field | Detail |
|---|---|
| **ID** | FR-018 |
| **Title** | Book a Home Consultation Appointment |
| **Priority** | Critical |
| **Module** | Appointment System |
| **Actor** | Patient |

**Description:**  
The system shall allow a patient to book a home consultation with an available doctor by selecting a consultation address from their saved addresses or entering a new one, confirming the appointment, and proceeding to payment. The system shall place the appointment in `pending_payment` status until payment is confirmed.

**Trigger:**  
Patient selects a doctor from search results and clicks Book Now.

**Preconditions:**
- The selected doctor is currently available.
- Patient is authenticated and verified.
- Patient has not already booked the same doctor for an overlapping time.

**Postconditions:**
- An Appointment document is created with `status: pending_payment`.
- Patient is redirected to the Payment screen (FR-041).
- If payment succeeds: status updated to `confirmed`; doctor and patient both receive booking confirmation notifications.
- If payment fails or times out (10 minutes): appointment document deleted; doctor's availability is restored.

---

### FR-019 — Appointment Confirmation to Doctor

| Field | Detail |
|---|---|
| **ID** | FR-019 |
| **Title** | Doctor Receives and Accepts Appointment |
| **Priority** | Critical |
| **Module** | Appointment System |
| **Actor** | Doctor, System |

**Description:**  
Upon successful payment (FR-018), the system shall notify the assigned doctor via Socket.io of the new confirmed booking. The doctor shall receive the patient's name, address, medical history summary, and mapped route. The doctor must accept or decline the appointment within 5 minutes.

**Trigger:**  
System emits a `new_booking` Socket.io event to the doctor upon payment confirmation.

**Preconditions:**
- Appointment status is `confirmed`.
- Doctor is online and available.

**Postconditions:**
- If accepted: appointment status updated to `en_route`; patient notified; live tracking activated.
- If declined or timed out: appointment cancelled; patient receives a full refund (FR-043); patient is prompted to search for another doctor.

---

### FR-020 — Appointment Status Lifecycle

| Field | Detail |
|---|---|
| **ID** | FR-020 |
| **Title** | Appointment Status State Machine |
| **Priority** | Critical |
| **Module** | Appointment System |
| **Actor** | System, Doctor, Patient |

**Description:**  
The system shall enforce a defined appointment status lifecycle. Transitions shall only occur under specified conditions and by authorised actors.

**Status Flow:**

```
pending_payment → confirmed → en_route → arrived → in_consultation → completed → [reviewed]
                    ↓
                 cancelled
```

| Transition | Triggered By | Condition |
|---|---|---|
| `pending_payment` → `confirmed` | System | Payment success webhook received |
| `confirmed` → `en_route` | Doctor | Doctor accepts the appointment |
| `en_route` → `arrived` | Doctor | Doctor marks arrival at patient location |
| `arrived` → `in_consultation` | Doctor | Doctor begins consultation |
| `in_consultation` → `completed` | Doctor | Doctor ends consultation and issues prescription |
| Any → `cancelled` | Patient / Admin | Before `in_consultation`; refund policy applies |

**Trigger:**  
Status transitions are triggered by explicit actor actions or system events.

**Preconditions:**
- The transition follows the defined lifecycle.

**Postconditions:**
- Status updated in the database.
- Relevant Socket.io events emitted.
- Push and email notifications dispatched to the other party.

---

### FR-021 — Appointment Cancellation

| Field | Detail |
|---|---|
| **ID** | FR-021 |
| **Title** | Appointment Cancellation and Refund |
| **Priority** | High |
| **Module** | Appointment System |
| **Actor** | Patient, Admin |

**Description:**  
The system shall allow a patient to cancel a confirmed appointment before the doctor has marked `arrived`. A tiered refund policy shall apply: full refund if cancelled more than 30 minutes before; 50% refund if within 30 minutes; no refund if doctor has already arrived. Admin can cancel at any stage with full refund.

**Trigger:**  
Patient clicks Cancel Appointment, or Admin initiates cancellation from the Dashboard.

**Preconditions:**
- Appointment status is `confirmed` or `en_route`.

**Postconditions:**
- Appointment status updated to `cancelled`.
- Refund initiated via Razorpay based on the refund policy.
- Doctor notified of cancellation.
- Cancellation reason recorded in the Appointment document.

---

## 9. Location Tracking Module

---

### FR-022 — Doctor Live Location Broadcast

| Field | Detail |
|---|---|
| **ID** | FR-022 |
| **Title** | Real-Time Doctor Location Broadcast |
| **Priority** | Critical |
| **Module** | Location Tracking |
| **Actor** | Doctor, System |

**Description:**  
When a doctor's appointment status is `en_route`, the system shall continuously broadcast the doctor's GPS coordinates via Socket.io to the patient at a configurable interval (default 5 seconds). The patient's app shall render the doctor's position on a live map with an updated ETA.

**Trigger:**  
Appointment status transitions to `en_route` after doctor acceptance.

**Preconditions:**
- Doctor has location access enabled on their device.
- Appointment status is `en_route`.

**Postconditions:**
- Doctor's location updated in the database and emitted to the patient's Socket.io room.
- Patient's map re-renders with the doctor's latest position and route.
- Location broadcasting stops when appointment status becomes `arrived`.

---

### FR-023 — Patient Map View

| Field | Detail |
|---|---|
| **ID** | FR-023 |
| **Title** | Patient Real-Time Tracking Map |
| **Priority** | Critical |
| **Module** | Location Tracking |
| **Actor** | Patient, System |

**Description:**  
The system shall render a React Leaflet map on the patient's tracking screen showing the doctor's live position, the patient's address pin, the route between them, and the estimated time of arrival, which shall update in real time as the doctor's position changes.

**Trigger:**  
Patient opens the Track Doctor screen after appointment confirmation.

**Preconditions:**
- Appointment status is `en_route`.
- Patient is authenticated.

**Postconditions:**
- Map renders with live-updating doctor marker.
- ETA label updates with each location event received.
- Upon `arrived` status, map transitions to an "Your doctor has arrived" screen and push notification is dispatched.

---

### FR-024 — Doctor Arrival Confirmation

| Field | Detail |
|---|---|
| **ID** | FR-024 |
| **Title** | Doctor Marks Arrival |
| **Priority** | High |
| **Module** | Location Tracking |
| **Actor** | Doctor |

**Description:**  
The system shall allow a doctor to manually mark themselves as arrived at the patient's address. The system shall validate that the doctor's current GPS coordinates are within a configurable geo-fence radius (default 100 metres) of the patient's address before permitting the transition.

**Trigger:**  
Doctor taps the I've Arrived button on their consultation screen.

**Preconditions:**
- Appointment status is `en_route`.
- Doctor's GPS location is within 100 metres of the appointment address.

**Postconditions:**
- Appointment status updated to `arrived`.
- Patient receives a push notification: "Your doctor has arrived."
- Location broadcasting stops.
- Consultation interface unlocked for the doctor.

---

## 10. Chat System Module

---

### FR-025 — Consultation Chat

| Field | Detail |
|---|---|
| **ID** | FR-025 |
| **Title** | In-App Patient–Doctor Chat |
| **Priority** | High |
| **Module** | Chat System |
| **Actor** | Patient, Doctor |

**Description:**  
The system shall provide a real-time bidirectional chat channel between a patient and their assigned doctor, available from appointment confirmation through to consultation completion. Messages shall be delivered via Socket.io and persisted in MongoDB for the duration of the appointment.

**Trigger:**  
Patient or Doctor opens the Chat tab on their appointment detail screen.

**Preconditions:**
- Appointment status is `confirmed`, `en_route`, `arrived`, or `in_consultation`.
- Both parties are authenticated.

**Postconditions:**
- Messages delivered in real time via Socket.io to the receiving party.
- All messages stored in a Messages collection linked to the Appointment document.
- Message delivery status (sent, delivered, read) tracked and displayed.

---

### FR-026 — Chat Message Types

| Field | Detail |
|---|---|
| **ID** | FR-026 |
| **Title** | Support for Multiple Chat Message Types |
| **Priority** | Medium |
| **Module** | Chat System |
| **Actor** | Patient, Doctor |

**Description:**  
The chat system shall support the following message types: plain text, images (uploaded via Cloudinary), and file attachments (PDF, max 5 MB). Each message shall be timestamped and attributed to its sender.

**Trigger:**  
User selects attachment icon and uploads a file, or sends a text message.

**Preconditions:**
- Active chat session exists (FR-025 preconditions met).
- File size is within limits and file type is permitted.

**Postconditions:**
- Image/file uploaded to Cloudinary; Cloudinary URL stored in the message document.
- Message delivered to the recipient with the appropriate rendering (image preview or file download link).

---

### FR-027 — Chat History Retention

| Field | Detail |
|---|---|
| **ID** | FR-027 |
| **Title** | Post-Consultation Chat History Access |
| **Priority** | Low |
| **Module** | Chat System |
| **Actor** | Patient, Doctor |

**Description:**  
The system shall retain the full chat history for a completed appointment and make it accessible to both the patient and the doctor from their appointment history for a period of 90 days, after which it is archived.

**Trigger:**  
User clicks View Chat History on a completed appointment.

**Preconditions:**
- Appointment status is `completed`.
- Chat history was generated during the appointment.

**Postconditions:**
- Read-only chat history rendered in the appointment detail view.
- No new messages can be sent in a completed appointment chat.

---

## 11. Prescription System Module

---

### FR-028 — Digital Prescription Generation

| Field | Detail |
|---|---|
| **ID** | FR-028 |
| **Title** | Doctor Issues Digital Prescription |
| **Priority** | Critical |
| **Module** | Prescription System |
| **Actor** | Doctor |

**Description:**  
The system shall provide a structured prescription form accessible to the doctor during or after a consultation. The form shall allow the doctor to enter patient details (auto-populated), diagnosis, medications (name, dosage, frequency, duration), additional notes, and follow-up instructions. Upon submission, the system shall generate a PDF prescription bearing the doctor's name, registration number, digital signature, and a unique prescription ID.

**Trigger:**  
Doctor clicks Generate Prescription during or after consultation.

**Preconditions:**
- Appointment status is `in_consultation` or `completed`.
- Doctor is authenticated and verified.

**Postconditions:**
- Prescription document created in the database linked to the Appointment.
- PDF generated and stored on Cloudinary.
- Prescription available for download by both the patient and the doctor.
- Appointment status transitions to `completed` upon prescription submission (if not already).

---

### FR-029 — Patient Prescription Download

| Field | Detail |
|---|---|
| **ID** | FR-029 |
| **Title** | Patient Downloads Digital Prescription |
| **Priority** | High |
| **Module** | Prescription System |
| **Actor** | Patient |

**Description:**  
The system shall allow a patient to download their digital prescription as a PDF at any time after it has been issued, accessible from the appointment detail screen or the Prescription History section of their profile.

**Trigger:**  
Patient clicks Download Prescription on a completed appointment.

**Preconditions:**
- A prescription has been generated for the appointment (FR-028 completed).
- Patient is authenticated and owns the appointment.

**Postconditions:**
- PDF file downloaded from Cloudinary URL to the patient's device.
- Download event logged in the Audit Log.

---

### FR-030 — Prescription Validity and Security

| Field | Detail |
|---|---|
| **ID** | FR-030 |
| **Title** | Prescription Integrity and Tamper-Proofing |
| **Priority** | High |
| **Module** | Prescription System |
| **Actor** | System |

**Description:**  
Each generated prescription shall contain a unique UUID, a QR code linking to a verification URL on the DocDock platform, and the issuing doctor's digital signature field. The verification URL shall return prescription authenticity status when scanned by a pharmacist or third party.

**Trigger:**  
Prescription PDF is generated (FR-028).

**Preconditions:**
- Prescription document has been committed to the database.

**Postconditions:**
- QR code embedded in the PDF links to `https://docdock.app/verify/{prescriptionId}`.
- Verification endpoint returns doctor name, registration number, patient name, date, and a `valid` or `invalid` status.
- Prescription document is immutable post-generation; no edits are permitted.

---

## 12. Review System Module

---

### FR-031 — Patient Submits Review

| Field | Detail |
|---|---|
| **ID** | FR-031 |
| **Title** | Patient Reviews and Rates a Doctor |
| **Priority** | High |
| **Module** | Review System |
| **Actor** | Patient |

**Description:**  
The system shall allow a patient to submit one rating (1–5 stars) and an optional written review (max 500 characters) for a doctor after a consultation is marked `completed`. Each patient may submit only one review per appointment.

**Trigger:**  
Patient clicks Rate Your Doctor after a completed appointment, or is prompted via a post-consultation notification.

**Preconditions:**
- Appointment status is `completed`.
- Patient has not already reviewed this appointment.
- Review window is open (within 7 days of completion).

**Postconditions:**
- Review document created and linked to the Appointment and Doctor records.
- Doctor's aggregate rating recalculated and updated in the Doctor document.
- Review visible on the doctor's public profile.

---

### FR-032 — Doctor's Aggregate Rating

| Field | Detail |
|---|---|
| **ID** | FR-032 |
| **Title** | Real-Time Aggregate Doctor Rating |
| **Priority** | Medium |
| **Module** | Review System |
| **Actor** | System |

**Description:**  
The system shall maintain and display a doctor's aggregate star rating, calculated as the arithmetic mean of all approved review ratings. The total number of reviews shall also be displayed alongside the star rating on the doctor's profile and search result card.

**Trigger:**  
A new review is submitted (FR-031) or an existing review is removed by Admin.

**Preconditions:**
- At least one approved review exists for the doctor.

**Postconditions:**
- `averageRating` and `reviewCount` fields on the Doctor document updated atomically.
- Updated rating reflected immediately on all patient-facing surfaces.

---

### FR-033 — Admin Review Moderation

| Field | Detail |
|---|---|
| **ID** | FR-033 |
| **Title** | Admin Moderates Reviews |
| **Priority** | Medium |
| **Module** | Review System |
| **Actor** | Admin |

**Description:**  
The system shall provide an Admin interface to view all submitted reviews, flag reviews containing inappropriate content, and remove reviews that violate platform policies. Removed reviews shall be archived with a removal reason, and the doctor's aggregate rating shall be recalculated.

**Trigger:**  
Admin accesses the Review Moderation section of the Admin Dashboard.

**Preconditions:**
- Admin is authenticated.
- At least one review exists.

**Postconditions:**
- Removed reviews excluded from aggregate rating calculation.
- Doctor and patient notified of review removal with reason.
- Review archived (not deleted) for audit purposes.

---

## 13. Payments Module

---

### FR-034 — Payment Initiation via Razorpay

| Field | Detail |
|---|---|
| **ID** | FR-034 |
| **Title** | Razorpay Order Creation and Checkout |
| **Priority** | Critical |
| **Module** | Payments |
| **Actor** | Patient, System |

**Description:**  
When a patient proceeds to book an appointment, the system shall create a Razorpay order on the server side using the doctor's consultation fee. The patient shall be presented with the Razorpay checkout interface supporting UPI, net banking, credit/debit card, and wallet payment methods.

**Trigger:**  
Patient clicks Confirm and Pay on the appointment booking screen.

**Preconditions:**
- Appointment document with `status: pending_payment` exists.
- Doctor is still available.
- Razorpay API keys are configured.

**Postconditions:**
- Razorpay Order ID generated and stored in the Appointment document.
- Razorpay checkout modal presented to the patient.
- Payment timeout of 10 minutes enforced; appointment cancelled if not paid within the window.

---

### FR-035 — Payment Verification

| Field | Detail |
|---|---|
| **ID** | FR-035 |
| **Title** | Razorpay Payment Signature Verification |
| **Priority** | Critical |
| **Module** | Payments |
| **Actor** | System |

**Description:**  
Upon receiving a payment success callback from Razorpay, the system shall verify the payment signature server-side using the Razorpay secret key and HMAC-SHA256. Only after successful verification shall the appointment status be updated to `confirmed`. Unverified payment events shall be rejected and logged.

**Trigger:**  
Razorpay sends a payment success event to the backend webhook endpoint.

**Preconditions:**
- A valid Razorpay Order exists.
- Payment has been processed by Razorpay.

**Postconditions:**
- Signature verified server-side.
- Appointment status updated to `confirmed`.
- Payment record created in the Payments collection.
- Patient and doctor receive booking confirmation notifications.

---

### FR-036 — Payment Receipt

| Field | Detail |
|---|---|
| **ID** | FR-036 |
| **Title** | Digital Payment Receipt |
| **Priority** | Medium |
| **Module** | Payments |
| **Actor** | Patient, System |

**Description:**  
The system shall generate and send a digital payment receipt to the patient's email after a successful payment. The receipt shall include the appointment ID, doctor name, amount, transaction ID, payment method, date, and time.

**Trigger:**  
Payment verified successfully (FR-035).

**Preconditions:**
- Payment verification is complete.

**Postconditions:**
- Receipt email dispatched to the patient.
- Receipt accessible from the patient's appointment detail screen.

---

### FR-037 — Refund Processing

| Field | Detail |
|---|---|
| **ID** | FR-037 |
| **Title** | Razorpay Refund Initiation |
| **Priority** | High |
| **Module** | Payments |
| **Actor** | System, Admin |

**Description:**  
The system shall initiate refunds via the Razorpay Refund API for eligible cancellations (FR-021) and for appointments cancelled due to doctor non-acceptance (FR-019). Refund amounts shall be calculated per the refund policy. Refund status shall be tracked and displayed to the patient.

**Trigger:**  
System determines a refund is due following appointment cancellation or doctor decline.

**Preconditions:**
- Original payment exists in the Payments collection with `status: captured`.
- Refund amount is greater than zero.

**Postconditions:**
- Refund request submitted to Razorpay API.
- Refund record created with `status: pending`.
- Patient notified of refund initiation with estimated credit timeline (5–7 business days).
- Refund status updated to `processed` upon Razorpay webhook confirmation.

---

### FR-038 — Doctor Payout

| Field | Detail |
|---|---|
| **ID** | FR-038 |
| **Title** | Doctor Earnings Payout |
| **Priority** | Medium |
| **Module** | Payments |
| **Actor** | System, Admin |

**Description:**  
The system shall calculate doctor earnings for completed consultations after deducting the platform commission (configurable, default 15%). Payouts shall be processed weekly via Razorpay Route or manual bank transfer, and earnings records shall be maintained per consultation.

**Trigger:**  
Scheduled weekly payout job (System) or Admin-initiated manual payout.

**Preconditions:**
- At least one consultation with status `completed` and unpaid payout exists for the doctor.
- Doctor's bank account details are registered and verified.

**Postconditions:**
- Payout initiated; earnings record updated to `paid`.
- Doctor receives payout notification with breakdown.

---

## 14. Notifications Module

---

### FR-039 — Push Notifications

| Field | Detail |
|---|---|
| **ID** | FR-039 |
| **Title** | In-App and Push Notification Delivery |
| **Priority** | High |
| **Module** | Notifications |
| **Actor** | System |

**Description:**  
The system shall deliver in-app notifications via Socket.io and browser push notifications for the following events: appointment confirmed, doctor en route, doctor arrived, consultation completed, prescription issued, payment received, refund initiated, and new chat message received.

**Trigger:**  
Any of the defined notification events occur in the system.

**Preconditions:**
- Recipient user is registered and has not opted out of notifications.
- For push: user has granted browser notification permission.

**Postconditions:**
- In-app notification rendered in the notification bell/drawer.
- Push notification delivered to the user's device if the app is backgrounded.
- Notification stored in the Notifications collection with `read: false`.

---

### FR-040 — Email Notifications

| Field | Detail |
|---|---|
| **ID** | FR-040 |
| **Title** | Transactional Email Notifications |
| **Priority** | High |
| **Module** | Notifications |
| **Actor** | System |

**Description:**  
The system shall send transactional emails for the following events: account registration, email verification, password reset, appointment confirmation, appointment cancellation, payment receipt, refund confirmation, prescription available, and doctor verification status change.

**Trigger:**  
Any of the defined transactional events occur.

**Preconditions:**
- Recipient's email address is verified.
- Email service (SMTP / third-party provider) is configured.

**Postconditions:**
- Email dispatched within 60 seconds of the triggering event.
- Email delivery status logged; failed deliveries retried up to 3 times with exponential backoff.

---

### FR-041 — Notification Preferences

| Field | Detail |
|---|---|
| **ID** | FR-041 |
| **Title** | User Notification Preferences |
| **Priority** | Low |
| **Module** | Notifications |
| **Actor** | Patient, Doctor |

**Description:**  
The system shall allow users to manage their notification preferences, choosing to enable or disable email notifications, push notifications, and in-app notifications independently for each notification category.

**Trigger:**  
User navigates to Notification Settings in their account profile.

**Preconditions:**
- User is authenticated.

**Postconditions:**
- Preferences saved to the user's profile document.
- System respects preferences on all subsequent notification dispatches.
- Critical notifications (security, account status changes) cannot be disabled.

---

## 15. Admin Dashboard Module

---

### FR-042 — Admin Overview Dashboard

| Field | Detail |
|---|---|
| **ID** | FR-042 |
| **Title** | Admin Analytics and Platform Overview |
| **Priority** | High |
| **Module** | Admin Dashboard |
| **Actor** | Admin |

**Description:**  
The system shall provide an Admin dashboard with key platform metrics: total registered patients, total registered doctors (by verification status), total appointments (by status), total revenue collected, total refunds issued, and active consultations in real time.

**Trigger:**  
Admin logs in and navigates to the Dashboard home.

**Preconditions:**
- Admin is authenticated with the `admin` role.

**Postconditions:**
- Dashboard renders with aggregated metrics pulled from MongoDB.
- Real-time active consultation count updated via Socket.io.
- Metrics filterable by date range.

---

### FR-043 — Doctor Account Management

| Field | Detail |
|---|---|
| **ID** | FR-043 |
| **Title** | Admin Manages Doctor Accounts |
| **Priority** | High |
| **Module** | Admin Dashboard |
| **Actor** | Admin |

**Description:**  
The system shall allow an Admin to view a list of all doctor accounts, filter by verification status, and take the following actions on any account: approve, reject, suspend, reinstate, or permanently deactivate. All actions shall be logged with timestamp, Admin ID, and reason.

**Trigger:**  
Admin navigates to the Doctors Management section of the Dashboard.

**Preconditions:**
- Admin is authenticated.

**Postconditions:**
- Doctor account status updated in the database.
- Doctor receives an email notification of the action and reason.
- If suspended: doctor's active appointments are cancelled; affected patients are notified and refunded.
- Action logged in the Audit Log collection.

---

### FR-044 — Patient Account Management

| Field | Detail |
|---|---|
| **ID** | FR-044 |
| **Title** | Admin Manages Patient Accounts |
| **Priority** | Medium |
| **Module** | Admin Dashboard |
| **Actor** | Admin |

**Description:**  
The system shall allow an Admin to view all patient accounts, search by name or email, and take actions including suspend and reinstate. Suspended patients cannot log in or make new bookings.

**Trigger:**  
Admin navigates to the Patients Management section and selects an account.

**Preconditions:**
- Admin is authenticated.

**Postconditions:**
- Patient account status updated.
- Patient notified of suspension with reason.
- Suspended patient's active sessions invalidated.

---

### FR-045 — Appointment Management and Override

| Field | Detail |
|---|---|
| **ID** | FR-045 |
| **Title** | Admin Views and Overrides Appointments |
| **Priority** | High |
| **Module** | Admin Dashboard |
| **Actor** | Admin |

**Description:**  
The system shall allow an Admin to view all appointments with full detail, filter by status/date/doctor/patient, and perform override actions: cancel an appointment (with full refund), reassign a doctor (in exceptional circumstances), or mark a disputed appointment as resolved.

**Trigger:**  
Admin navigates to Appointment Management and searches/filters appointments.

**Preconditions:**
- Admin is authenticated.

**Postconditions:**
- Override action applied to the Appointment document.
- Relevant parties (patient, doctor) notified of the change.
- All admin actions logged in the Audit Log.

---

### FR-046 — Platform Configuration

| Field | Detail |
|---|---|
| **ID** | FR-046 |
| **Title** | Admin Configures Platform Settings |
| **Priority** | Medium |
| **Module** | Admin Dashboard |
| **Actor** | Admin |

**Description:**  
The system shall allow an Admin to configure global platform settings including: default doctor search radius, geo-fence arrival radius, appointment timeout duration, platform commission percentage, refund policy thresholds, and maintenance mode toggle.

**Trigger:**  
Admin navigates to Platform Settings in the Admin Dashboard.

**Preconditions:**
- Admin is authenticated with Super Admin privileges.

**Postconditions:**
- Settings saved to a Config collection in MongoDB.
- Changes take effect immediately without requiring a server restart.
- Config changes logged in the Audit Log.

---

### FR-047 — Audit Log

| Field | Detail |
|---|---|
| **ID** | FR-047 |
| **Title** | Comprehensive Admin Audit Trail |
| **Priority** | High |
| **Module** | Admin Dashboard |
| **Actor** | Admin, System |

**Description:**  
The system shall maintain an immutable audit log of all administrative actions, including actor ID, action type, affected resource, timestamp, and before/after values for update actions. The audit log shall be viewable and searchable by Admin.

**Trigger:**  
Any administrative action is performed (FR-010, FR-033, FR-043, FR-044, FR-045, FR-046).

**Preconditions:**
- Admin is authenticated.

**Postconditions:**
- Audit entry appended to the AuditLog collection.
- Entries are read-only; no modification or deletion is permitted via the application layer.
- Logs retained for a minimum of 2 years.

---

## 16. Requirements Traceability Matrix

| FR ID | Title | Priority | Module | Actor |
|---|---|---|---|---|
| FR-001 | Patient Self-Registration | Critical | Authentication | Patient |
| FR-002 | Patient Email Verification | Critical | Authentication | Patient, System |
| FR-003 | Patient Login with JWT | Critical | Authentication | Patient |
| FR-004 | Doctor Self-Registration | Critical | Authentication | Doctor |
| FR-005 | Doctor Login with JWT | Critical | Authentication | Doctor |
| FR-006 | Silent JWT Token Refresh | High | Authentication | Patient, Doctor, System |
| FR-007 | User Logout | High | Authentication | Patient, Doctor |
| FR-008 | Forgot Password / Password Reset | High | Authentication | Patient, Doctor |
| FR-009 | RBAC — Route and Feature Protection | Critical | Authentication | System |
| FR-010 | Admin Verification of Doctor Profile | Critical | Doctor Management | Admin |
| FR-011 | Doctor Profile Update | High | Doctor Management | Doctor |
| FR-012 | Real-Time Doctor Availability Toggle | Critical | Doctor Management | Doctor |
| FR-013 | Doctor Earnings and Appointment History | Medium | Doctor Management | Doctor |
| FR-014 | Patient Profile Update | High | Patient Management | Patient |
| FR-015 | Patient Medical History | Medium | Patient Management | Patient |
| FR-016 | Patient Appointment and Prescription History | Medium | Patient Management | Patient |
| FR-017 | Geo-Based Nearby Doctor Search | Critical | Appointment System | Patient |
| FR-018 | Book a Home Consultation Appointment | Critical | Appointment System | Patient |
| FR-019 | Doctor Receives and Accepts Appointment | Critical | Appointment System | Doctor, System |
| FR-020 | Appointment Status State Machine | Critical | Appointment System | System, Doctor, Patient |
| FR-021 | Appointment Cancellation and Refund | High | Appointment System | Patient, Admin |
| FR-022 | Real-Time Doctor Location Broadcast | Critical | Location Tracking | Doctor, System |
| FR-023 | Patient Real-Time Tracking Map | Critical | Location Tracking | Patient, System |
| FR-024 | Doctor Marks Arrival | High | Location Tracking | Doctor |
| FR-025 | In-App Patient–Doctor Chat | High | Chat System | Patient, Doctor |
| FR-026 | Support for Multiple Chat Message Types | Medium | Chat System | Patient, Doctor |
| FR-027 | Post-Consultation Chat History Access | Low | Chat System | Patient, Doctor |
| FR-028 | Doctor Issues Digital Prescription | Critical | Prescription System | Doctor |
| FR-029 | Patient Downloads Digital Prescription | High | Prescription System | Patient |
| FR-030 | Prescription Integrity and Tamper-Proofing | High | Prescription System | System |
| FR-031 | Patient Reviews and Rates a Doctor | High | Review System | Patient |
| FR-032 | Real-Time Aggregate Doctor Rating | Medium | Review System | System |
| FR-033 | Admin Moderates Reviews | Medium | Review System | Admin |
| FR-034 | Razorpay Order Creation and Checkout | Critical | Payments | Patient, System |
| FR-035 | Razorpay Payment Signature Verification | Critical | Payments | System |
| FR-036 | Digital Payment Receipt | Medium | Payments | Patient, System |
| FR-037 | Razorpay Refund Initiation | High | Payments | System, Admin |
| FR-038 | Doctor Earnings Payout | Medium | Payments | System, Admin |
| FR-039 | In-App and Push Notification Delivery | High | Notifications | System |
| FR-040 | Transactional Email Notifications | High | Notifications | System |
| FR-041 | User Notification Preferences | Low | Notifications | Patient, Doctor |
| FR-042 | Admin Analytics and Platform Overview | High | Admin Dashboard | Admin |
| FR-043 | Admin Manages Doctor Accounts | High | Admin Dashboard | Admin |
| FR-044 | Admin Manages Patient Accounts | Medium | Admin Dashboard | Admin |
| FR-045 | Admin Views and Overrides Appointments | High | Admin Dashboard | Admin |
| FR-046 | Admin Configures Platform Settings | Medium | Admin Dashboard | Admin |
| FR-047 | Comprehensive Admin Audit Trail | High | Admin Dashboard | Admin, System |

---

