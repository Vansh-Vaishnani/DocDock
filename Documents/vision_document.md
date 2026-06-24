# DocDock — Vision Document

### *"Knock-Knock, your doctor is here."*

---

## Table of Contents

1. [Vision Statement](#1-vision-statement)
2. [Mission Statement](#2-mission-statement)
3. [Problem Definition](#3-problem-definition)
4. [Market Need](#4-market-need)
5. [Target Audience](#5-target-audience)
6. [Business Goals](#6-business-goals)
7. [Product Goals](#7-product-goals)
8. [Scope](#8-scope)
9. [Out of Scope](#9-out-of-scope)
10. [Assumptions](#10-assumptions)
11. [Constraints](#11-constraints)
12. [Success Metrics](#12-success-metrics)

---

## 1. Vision Statement

> **DocDock is the on-demand healthcare platform that makes accessing a doctor as simple, fast, and trustworthy as booking a ride — bringing verified, nearby doctors directly to the patient's door.**

DocDock envisions a world where geography, wait times, and clinic queues are no longer barriers to quality healthcare. Every patient, regardless of mobility or schedule, should be able to access a licensed doctor within the hour — from the comfort and safety of their own home.

This vision is realized through a platform that treats healthcare access as an on-demand service: real-time doctor availability, proximity-based discovery, live tracking, and a complete digital clinical workflow — all in one application.

---

## 2. Mission Statement

> **To eliminate the distance between patients and quality healthcare by building a trusted, real-time platform that connects patients with verified nearby doctors — on demand.**

DocDock's mission is operationalized through four commitments:

| Commitment | What It Means in Practice |
|---|---|
| **Trust** | Every doctor on the platform is verified by a human admin before going live |
| **Speed** | A patient can discover, book, and confirm a doctor in under 2 minutes |
| **Transparency** | Real-time tracking, live availability, and honest reviews — no black boxes |
| **Completeness** | End-to-end clinical workflow: book → consult → prescribe → review, all in one place |

---

## 3. Problem Definition

### 3.1 The Core Problem

**Patients who need a doctor at home have no reliable, fast, and trustworthy way to find and book one.**

The alternatives are broken:

- **Calling clinics** is slow, manual, and yields no real-time availability
- **Existing platforms** (Practo, Apollo 24/7) are appointment-first, not availability-first — they show you *calendars*, not *who is available right now*
- **Emergency services** are reserved for life-threatening events, not urgent-but-non-critical needs
- **Walk-in clinics** require patients who may be unwell to physically travel and wait

### 3.2 Problem Breakdown

#### From the Patient's Perspective

```
"I have a high fever. My child has been vomiting for 4 hours.
I need a doctor — not in 3 days, not after a 2-hour ER wait.
I need one now, at home, today."
```

| Pain Point | Impact |
|---|---|
| Cannot find which doctors are available right now | Delays care; forces guesswork |
| No visibility into doctor proximity or ETA | Anxiety; poor experience |
| No tracking after booking | Zero confidence in arrival |
| Paper prescriptions, manual processes | Inconvenient, losable records |
| No way to verify a home-visit doctor's credentials | Safety concern |

#### From the Doctor's Perspective

```
"I want to take home-visit patients, but there's no
digital tool built for this. I manage it all over
WhatsApp and phone calls."
```

| Pain Point | Impact |
|---|---|
| No digital tool for managing on-demand availability | Missed patients, disorganized schedule |
| Manual appointment coordination via phone/WhatsApp | Time wasted; errors |
| No built-in prescription workflow | Paper dependency |
| No channel to build a digital reputation | No reviews, no online presence |

### 3.3 Problem Statement (Formal)

> Patients seeking on-demand, home-based medical consultations in India lack a reliable, proximity-aware digital platform that provides real-time doctor availability, verified doctor profiles, instant booking, live tracking, and a complete digital clinical workflow — resulting in delayed care, patient anxiety, and underutilized doctor capacity.

---

## 4. Market Need

### 4.1 Market Context

India's healthcare access problem is structural and growing:

- **Doctor-to-patient ratio:** ~1:834 (WHO recommends 1:1000; India's metro vs. tier-2 gap is severe)
- **Home healthcare market size:** Projected to grow from USD 6.5B (2022) to USD 11B+ by 2027 (CAGR ~11%)
- **Internet + smartphone penetration:** 850M+ internet users in India; growing comfort with app-based services
- **Post-COVID behavioral shift:** Patients now actively prefer home consultations and telemedicine over clinic visits

### 4.2 Demand Signals

| Signal | Insight |
|---|---|
| Practo reports 20M+ monthly patients searching for doctors | Discovery demand exists; supply-side availability is the gap |
| Urban Company scaled to 40M+ home service bookings | Behavioral readiness for on-demand home services is proven |
| Apollo 24/7, Tata 1mg pivoted to at-home diagnostics | Market validation that home-based healthcare services are viable |
| 67% of outpatient visits in India are for non-emergency, manageable conditions | Large addressable pool for on-demand, home-visit consultations |

### 4.3 The Underserved Segment

DocDock targets the gap between **"emergency care"** (hospitals, ERs) and **"scheduled appointments"** (clinics, teleconsultation). This middle segment — **urgent but non-emergency, home-based consultations** — is chronically underserved by existing digital platforms.

```
Emergency                  DocDock Zone                    Routine
────────────────────────────────────────────────────────────────────
Hospital ER          On-demand home visit           Scheduled clinic
Ambulance            Urgent but not critical        Teleconsultation
(Life-threatening)   Same-day, within hours         (Days in advance)
```

---

## 5. Target Audience

### 5.1 Primary User: Patient

| Attribute | Description |
|---|---|
| **Demographics** | Urban/semi-urban adults, ages 20–60; primary caregivers (parents, adult children of elderly) |
| **Geography** | Tier-1 and Tier-2 Indian cities (Phase 1); nationwide (Phase 2) |
| **Tech Comfort** | Comfortable with app-based services (Swiggy, Uber, Practo) |
| **Use Case** | Sudden illness, elderly care, child fever, post-surgery monitoring, mobility-limited patients |
| **Motivation** | Speed, convenience, safety, trust |
| **Frustration** | Not knowing who is available; traveling while unwell; paper prescriptions |

**Patient Personas:**

> **Priya, 34 — Working mother, Bangalore**
> Her 5-year-old has a 103°F fever at 9 PM. She needs a doctor tonight — not tomorrow. She wants to see which doctors are nearby, check their ratings, book in one tap, and watch them arrive on a map.

> **Ramesh, 62 — Retired, Delhi**
> He has knee pain and limited mobility. He cannot travel to a clinic. He wants a trusted GP to visit him at home, handle his prescription, and maintain his health records digitally.

---

### 5.2 Primary User: Doctor

| Attribute | Description |
|---|---|
| **Profile** | Independent GPs, general physicians, or specialists offering home visits |
| **Experience Level** | 2–20 years in practice; registered with MCI/NMC |
| **Tech Comfort** | Moderate; comfortable with WhatsApp/smartphone but not necessarily with complex tools |
| **Use Case** | Supplement clinic income with on-demand home visits; manage schedule digitally |
| **Motivation** | More patients, structured workflow, digital presence, income growth |
| **Frustration** | No tool built for home-visit management; manual coordination; no digital reputation |

**Doctor Persona:**

> **Dr. Mehta, 41 — GP, Pune**
> He has a clinic that runs 9–1 PM. From 2 PM onward, he's available for home visits but has no organized way to receive and manage requests. He handles it over phone calls and often misses patients. He wants a dashboard that shows him incoming requests, lets him accept with one tap, and handles the prescription digitally.

---

### 5.3 Secondary User: Admin

| Attribute | Description |
|---|---|
| **Profile** | Platform operators; DocDock internal team |
| **Responsibility** | Doctor credential verification, platform health monitoring, dispute resolution |
| **Motivation** | Safe, trusted platform; regulatory defensibility; clean data |
| **Tools Needed** | Verification dashboard, analytics, user management, moderation tools |

---

## 6. Business Goals

These goals define what DocDock as a **product and platform** must achieve to be considered successful from a business perspective.

| ID | Goal | Rationale |
|---|---|---|
| BG-01 | **Demonstrate market viability** of on-demand home healthcare via a live, functional platform | Validate that patient demand converts to actual bookings |
| BG-02 | **Build a trusted doctor supply network** through rigorous admin verification | Supply-side trust is the core differentiator vs. directories |
| BG-03 | **Achieve end-to-end transaction completion** — booking to prescription to review | Full workflow completion = retention and repeat usage |
| BG-04 | **Establish a portfolio-grade technical benchmark** suitable for engineering showcasing | Primary objective for current build phase |
| BG-05 | **Architect for scale** from day one — geo queries, sockets, queues — no major refactoring needed to grow | Protect against technical debt as user base grows |
| BG-06 | **Enable a monetization foundation** via Razorpay payment integration | Platform takes a transaction fee; doctor earns consultation fee |

---

## 7. Product Goals

These goals define what the **product itself** must achieve — the user-facing and engineering outcomes.

### 7.1 User Experience Goals

| ID | Goal | Target |
|---|---|---|
| PG-01 | Patient can find an available doctor and book in under 2 minutes | Measured via session timing |
| PG-02 | Patient sees live doctor location within 1 second of doctor location update | Socket.io latency target |
| PG-03 | Doctor receives and can act on a booking request within 30 seconds of patient submission | Notification + accept/reject flow |
| PG-04 | Prescription PDF is generated and accessible within 3 seconds of doctor submission | Server-side generation target |
| PG-05 | Admin can verify or reject a doctor profile in under 5 minutes | Verification UI target |

### 7.2 Platform Quality Goals

| ID | Goal | Target |
|---|---|---|
| PG-06 | API response time at P95 | < 2 seconds |
| PG-07 | System uptime | ≥ 99% |
| PG-08 | Test coverage (unit + integration) | ≥ 70% |
| PG-09 | Zero unverified doctors visible to patients | Enforced via admin approval gate |
| PG-10 | Secure authentication across all user types | JWT + refresh token rotation + bcrypt |

### 7.3 Architecture Goals

| ID | Goal |
|---|---|
| PG-11 | Modular backend — each domain (auth, doctor, appointment, tracking) is independently structured |
| PG-12 | Real-time layer (Socket.io) decoupled from REST API layer |
| PG-13 | Async job queue (BullMQ + Redis) for notifications — no synchronous email/SMS blocking API responses |
| PG-14 | Geo queries use MongoDB 2dsphere index — performant at scale without external GIS services |
| PG-15 | Fully documented API (Swagger/OpenAPI) before Sprint 6 completion |

---

## 8. Scope

### 8.1 Platform Scope

| Layer | In Scope |
|---|---|
| **Platform Type** | Responsive web application (mobile-first design) |
| **User Roles** | Patient, Doctor, Admin |
| **Consultation Mode** | In-person home visit |
| **Booking Modes** | Instant on-demand + pre-scheduled |
| **Geography (Phase 1)** | Indian cities; INR currency; Indian phone numbers |

### 8.2 Feature Scope

| Domain | Features In Scope |
|---|---|
| **Authentication** | Registration, login, logout, JWT access + refresh tokens, bcrypt password hashing, role-based access control |
| **Doctor Onboarding** | Profile creation, credential submission, Cloudinary photo upload, admin approval gate |
| **Discovery** | MongoDB 2dsphere geo query, radius filter, specialty filter, availability filter, map display (React Leaflet) |
| **Availability** | Real-time availability toggle, live location sharing while available |
| **Appointments** | Create, view, accept, reject, update status (pending → accepted → on_way → in_progress → completed) |
| **Payments** | Razorpay integration, payment before confirmation, digital receipt |
| **Real-Time** | Socket.io — live doctor location streaming, in-app patient–doctor chat |
| **Prescriptions** | Structured prescription entry by doctor, PDF generation, patient download |
| **Reviews** | Post-consultation star rating + text review, doctor aggregate rating |
| **Notifications** | In-app alerts; email notifications via Nodemailer for key lifecycle events |
| **Admin** | Doctor verification dashboard, user management, basic platform analytics |

### 8.3 Technical Scope

| Concern | Technology | Scope |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind + React Leaflet | Complete UI — Patient, Doctor, Admin portals |
| Backend | Node.js + Express.js | RESTful API + Socket.io server |
| Database | MongoDB Atlas | All persistent data; 2dsphere geo indexing |
| Cache | Redis (Upstash) | Session store, Socket.io adapter, BullMQ backend |
| Job Queue | BullMQ | Async notification dispatch |
| Auth | JWT + bcrypt | All user types |
| Storage | Cloudinary | Doctor profile photos, prescription assets |
| Payments | Razorpay | Appointment payment flow |
| Deployment | Vercel + Railway/Render + MongoDB Atlas | Production deployment |
| CI/CD | GitHub Actions | Automated test + lint gates on PR merge |

---

## 9. Out of Scope

The following are explicitly excluded from the current build. Each is documented with the rationale and target phase for potential inclusion.

| Feature | Reason Excluded | Target Phase |
|---|---|---|
| **Native Mobile Apps** (iOS/Android) | Web-first strategy; React Native in Phase 2 | Phase 2 |
| **Video / Audio Consultations** | Separate WebRTC infrastructure; out of home-visit scope | Phase 2 |
| **SMS Notifications** | Twilio cost + regulatory (DLT) overhead; email sufficient for Phase 1 | Phase 2 |
| **Push Notifications** | Requires FCM + native app or service worker; deferred | Phase 2 |
| **Multi-language Support** | i18n overhead; English-first for portfolio scope | Phase 2 |
| **Lab Test Booking** | Requires third-party diagnostic lab partnerships | Phase 3 |
| **Pharmacy Integration** | Supply chain + regulatory complexity | Phase 3 |
| **Insurance / Claim Processing** | TPA integrations; high regulatory burden | Phase 3 |
| **AI Doctor Recommendation** | ML infrastructure; insufficient data at launch | Phase 3 |
| **Doctor Subscription / SaaS Billing** | Business model complexity; not needed at portfolio stage | Phase 3 |
| **ABDM / Health ID Integration** | Government API compliance and approval required | Phase 3 |
| **Multi-clinic / Hospital Accounts** | Organizational account model; enterprise feature | Phase 4 |
| **B2B Corporate Health Plans** | Enterprise sales motion; post-product-market fit | Phase 4 |
| **Analytics for Doctors** (earnings, trends) | Doctor-facing BI; Phase 1 admin analytics sufficient | Phase 3 |

---

## 10. Assumptions

The following assumptions underpin the design, prioritization, and architecture decisions in this document. If any assumption is invalidated, the impacted areas are noted.

| ID | Assumption | If Wrong, Impact |
|---|---|---|
| A-01 | Patients have a modern browser and stable internet connection (4G+) | Real-time tracking and map features may not work on slow connections; progressive loading needed |
| A-02 | Doctors carry a smartphone with GPS capability while on home visits | Live tracking is infeasible without GPS; fallback to manual status updates |
| A-03 | Doctors are willing to share live location during active appointments | Feature adoption risk; may require in-app consent flow emphasis |
| A-04 | All consultation fees are paid digitally via Razorpay (no cash) | Cash-preference doctors may resist platform; hybrid model may be needed |
| A-05 | Admin verification is a human-driven, manual process (not automated) | Verification SLA may bottleneck doctor supply growth at scale |
| A-06 | OpenStreetMap + React Leaflet provides sufficient map accuracy for urban India | May need Google Maps API for areas with poor OSM coverage (Tier-2/3 cities) |
| A-07 | MongoDB Atlas free/shared tier is sufficient for development and early portfolio demonstration | Performance degradation under real load; paid tier required for production scale |
| A-08 | Razorpay sandbox is used for portfolio demonstration; production key requires business entity | Live payment processing requires company registration; portfolio uses test mode |
| A-09 | English is the primary language for all users in Phase 1 | Excludes non-English literate users; limits reach to urban, educated demographics |
| A-10 | DPDP Act (India) compliance will be addressed at a reasonable-effort level appropriate for a portfolio project | Legal risk if deployed commercially without formal compliance audit |

---

## 11. Constraints

Constraints are fixed boundaries that cannot be changed within the current project scope — unlike risks or assumptions, these are known limitations that the team must design around.

### 11.1 Technical Constraints

| ID | Constraint | Design Response |
|---|---|---|
| TC-01 | **Single-server backend deployment** (Railway/Render free tier) | Architect for stateless API; Socket.io with Redis adapter for future horizontal scaling |
| TC-02 | **MongoDB Atlas free tier** — 512MB storage, shared compute | Efficient schema design; no unnecessary blob storage in MongoDB; use Cloudinary for media |
| TC-03 | **No native push notifications** — web app only | Email notifications as primary async channel; in-app notifications via Socket.io |
| TC-04 | **Razorpay test mode only** for portfolio demonstration | Document clearly in README; live mode requires business registration |
| TC-05 | **React Leaflet / OpenStreetMap** only — no Google Maps API (cost) | OSM tile quality limitation in some geographies; acceptable for portfolio scope |

### 11.2 Resource Constraints

| ID | Constraint | Design Response |
|---|---|---|
| RC-01 | **Solo or small team development** | Prioritize P0 features strictly; defer P2 to post-core build |
| RC-02 | **3-month build timeline** (6 × 2-week sprints) | Sprint plan must be realistic; no scope creep mid-sprint |
| RC-03 | **Zero external budget** — all free tiers | Architecture choices constrained to free/open-source tooling |

### 11.3 Regulatory Constraints

| ID | Constraint | Design Response |
|---|---|---|
| REG-01 | **Doctor verification is mandatory** — no unverified practitioner may appear to patients | Admin approval gate hard-enforced at API level; no frontend workaround possible |
| REG-02 | **Patient health data is sensitive** — passwords must be hashed, health records encrypted | bcrypt for passwords; sensitive fields encrypted at rest (Mongoose field-level encryption) |
| REG-03 | **Digital prescriptions** — legally, only a registered doctor (MCI/NMC number) may issue a prescription | Doctor license number captured and admin-verified before prescription features are unlocked |

### 11.4 Scope Constraints

| ID | Constraint |
|---|---|
| SC-01 | Portfolio target — production-quality code and architecture, but not a commercially launched product |
| SC-02 | Home-visit model only — no clinic queue management, no in-clinic appointment systems |
| SC-03 | INR (Indian Rupee) only — no multi-currency support |
| SC-04 | Web platform only — no native mobile app in this phase |

---

## 12. Success Metrics

Success for DocDock is evaluated across four dimensions: user experience, platform reliability, code quality, and portfolio value.

### 12.1 User Experience Metrics

| Metric | Target | Measurement |
|---|---|---|
| Time from app open → booking confirmed | < 2 minutes | Client-side session timing |
| Nearby doctor search response time | < 1.5 seconds | API response time (P95) |
| Live tracking update latency | < 1 second | Socket.io event timestamp delta |
| Doctor accept/reject response (from notification) | < 30 seconds (UX target) | Event log timestamp diff |
| Prescription PDF generation & delivery | < 3 seconds | Server-side timing |
| Admin doctor verification time | < 5 minutes per profile | Admin session timing |

### 12.2 Platform Reliability Metrics

| Metric | Target |
|---|---|
| System uptime | ≥ 99% |
| API 5xx error rate | < 0.5% |
| Appointment completion rate (accepted → completed) | ≥ 85% |
| Payment success rate | ≥ 98% |
| Unverified doctors appearing on patient map | 0 (hard constraint) |
| Doctor verification SLA | < 24 hours |

### 12.3 Code Quality Metrics

| Metric | Target |
|---|---|
| Unit + integration test coverage | ≥ 70% |
| Critical OWASP Top 10 vulnerabilities | 0 |
| Lighthouse Performance Score (frontend) | ≥ 85 |
| Lighthouse Accessibility Score | ≥ 90 |
| API documentation coverage (Swagger) | 100% of public endpoints |
| Open P0/P1 bugs at Sprint 6 completion | 0 |

### 12.4 Portfolio Value Metrics

These metrics define success from an engineering portfolio demonstration perspective.

| Metric | Target |
|---|---|
| Live production deployment with public URL | ✅ Required |
| All 15 project artifacts produced | ✅ Required |
| Real-time features (tracking + chat) demonstrable live | ✅ Required |
| Full booking flow demonstrable end-to-end | ✅ Required |
| Codebase publicly available on GitHub with README | ✅ Required |
| CI/CD pipeline active with automated test gates | ✅ Required |

### 12.5 Definition of Done (Project Level)

> DocDock version 1.0 is considered **complete** when:
>
> 1. A patient can register, find a nearby verified doctor, book and pay for an appointment, track the doctor in real time, receive a digital prescription, and submit a review — entirely within the application, without any manual intervention outside the app.
>
> 2. A doctor can register, be verified by admin, toggle availability, receive booking requests, accept or reject them, generate prescriptions, and view their appointment history — from a dedicated dashboard.
>
> 3. An admin can review pending doctor profiles, approve or reject them with a reason, and view platform-wide activity from an analytics dashboard.
>
> 4. The system handles all of the above with ≥ 99% uptime, API P95 latency < 2 seconds, and zero critical security vulnerabilities.


---

