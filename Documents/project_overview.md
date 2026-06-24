# DocDock — Project Overview
### *"Knock-Knock, your doctor is here."*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Problem](#2-business-problem)
3. [Proposed Solution](#3-proposed-solution)
4. [Key Stakeholders](#4-key-stakeholders)
5. [User Journey Overview](#5-user-journey-overview)
6. [Major Features](#6-major-features)
7. [System Scope](#7-system-scope)
8. [Project Objectives](#8-project-objectives)
9. [Success Metrics](#9-success-metrics)

---

## 1. Executive Summary

**DocDock** is a Doctor-on-Demand web platform that connects patients with verified, nearby doctors for home consultations — on-demand or scheduled. Inspired by the simplicity and trust of ride-hailing platforms like Uber, DocDock eliminates the friction of traditional healthcare access by bringing the consultation to the patient's doorstep.

Patients open DocDock, see available doctors nearby on a live map, book in seconds, and track their doctor's arrival in real time. Doctors get a streamlined dashboard to manage availability, appointments, prescriptions, and earnings. Admins maintain platform integrity through a verification system that ensures only licensed practitioners are listed.

DocDock is being built as a **portfolio-grade, production-ready full-stack application** using a modern MERN-based stack (Next.js, Node.js, Express, MongoDB), targeting the standard of quality expected from funded startup engineering teams.

---

## 2. Business Problem

### 2.1 The Healthcare Access Gap

India has approximately **1 doctor per 834 patients** against the WHO-recommended 1:1000 ratio — yet patients routinely struggle to access a doctor quickly, especially for non-emergency but urgent situations: a child's high fever at 11 PM, an elderly patient who cannot travel, or a working professional who cannot afford a 2-hour clinic wait.

### 2.2 Core Pain Points

| Persona | Problem |
|---|---|
| **Patient** | No way to know which nearby doctors are available *right now* |
| **Patient** | Physically traveling to a clinic when the condition warrants bed rest |
| **Patient** | Opaque booking systems with no real-time status or tracking |
| **Doctor** | No digital tool to manage availability and on-demand requests |
| **Doctor** | Awkward paper-based prescription and appointment processes |
| **Platform** | No safety layer — patients cannot verify doctor credentials |

### 2.3 Gaps in Existing Solutions

| Platform | What They Do | What They Miss |
|---|---|---|
| **Practo** | Doctor discovery, appointment booking | No real-time availability; no home-visit tracking |
| **Apollo 24/7** | Video consults, pharmacy | Not proximity-first; heavy, subscription-gated |
| **Tata 1mg** | Medicine delivery + consults | Complex UX; no on-demand home visit model |
| **UrbanClap / Urban Company** | On-demand home services | Not healthcare-specific; no clinical workflows |

**The gap:** No existing platform combines *proximity-aware discovery*, *real-time availability*, *live tracking*, and *complete clinical workflow* (prescriptions, chat, payments) in a single, lightweight web app.

---

## 3. Proposed Solution

### 3.1 What is DocDock?

DocDock is an **on-demand home healthcare platform** — think Uber, but for doctors. The platform provides:

- A **geo-aware discovery layer** — patients see only verified, currently available doctors within their chosen radius
- An **on-demand booking engine** — instant or scheduled appointments, confirmed in under 2 minutes
- A **real-time tracking interface** — patients watch their doctor travel to them on a live map, exactly like tracking a cab
- A **complete clinical workflow** — in-app chat, digital prescriptions, and post-visit review
- A **trust & safety infrastructure** — admin-verified doctor profiles, secure auth, and encrypted records

### 3.2 The DocDock Difference

```
Traditional Healthcare          DocDock
─────────────────────           ─────────────────────────────────
Search online or call around    Open app → see available doctors
Call clinic, check availability Availability shown live on map
Drive to clinic, wait           Doctor comes to you
Receive paper prescription      Digital prescription, downloadable PDF
No feedback mechanism           Rate and review after consultation
```

### 3.3 Technology Approach

DocDock is built on a production-grade MERN-adjacent stack:

| Concern | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas (Geospatial indexing) |
| Real-Time | Socket.io (tracking + chat) |
| Authentication | JWT + bcrypt |
| Payments | Razorpay |
| Storage | Cloudinary |
| Deployment | Vercel + Railway/Render + MongoDB Atlas |

---

## 4. Key Stakeholders

### 4.1 Internal Stakeholders

| Role | Responsibility | Primary Concern |
|---|---|---|
| **Product Owner** | Feature prioritization, roadmap decisions | Business value, delivery timelines |
| **Development Team** | Design, build, test, deploy | Technical feasibility, code quality |
| **QA Team** | Test coverage, release sign-off | System reliability, edge case coverage |

### 4.2 External Stakeholders (End Users)

#### Patients
- **Profile:** Urban adults aged 20–60 seeking convenient healthcare access
- **Motivation:** Speed, proximity, trust, and the ability to receive care at home
- **Critical Need:** Certainty that the doctor is real, available, and on their way
- **Success State:** Consultation completed at home, prescription in hand, within 1 hour of opening the app

#### Doctors
- **Profile:** Independent practitioners, GP clinics, or specialist doctors offering home visits
- **Motivation:** Additional patient reach, digitized scheduling, reduced admin overhead
- **Critical Need:** Control over availability, a clean appointment queue, and tools to manage prescriptions
- **Success State:** Streamlined daily workflow; more consultations with less manual coordination

#### Admins
- **Profile:** Platform operators responsible for trust and quality control
- **Motivation:** Platform integrity, regulatory compliance, user safety
- **Critical Need:** Fast, reliable tools to verify doctor credentials and monitor platform health
- **Success State:** Zero unverified doctors on the platform; early detection of anomalous behavior

---

## 5. User Journey Overview

### 5.1 Patient Journey

```
1. DISCOVER
   └─ Opens DocDock → Grants location access
   └─ Sees verified, available doctors on an interactive map
   └─ Filters by specialty, distance, rating

2. BOOK
   └─ Views doctor profile (credentials, reviews, fee)
   └─ Selects Instant Booking or Scheduled Slot
   └─ Completes payment via Razorpay

3. WAIT & TRACK
   └─ Doctor accepts → Patient receives confirmation notification
   └─ Doctor location streams live on patient's map
   └─ Chat available for any pre-visit communication

4. CONSULT
   └─ Doctor arrives → Appointment moves to In Progress
   └─ Consultation conducted at patient's home

5. POST-VISIT
   └─ Doctor generates digital prescription
   └─ Patient receives PDF prescription in-app
   └─ Patient submits rating and review
   └─ Visit record stored in health history
```

### 5.2 Doctor Journey

```
1. ONBOARD
   └─ Registers with credentials (license number, specialization)
   └─ Admin verifies profile → Account activated
   └─ Sets service area and consultation fee

2. GO AVAILABLE
   └─ Toggles availability ON from dashboard
   └─ Location sharing begins — appears on patient map

3. RECEIVE & MANAGE
   └─ Incoming appointment request received (notification + in-app)
   └─ Reviews patient details → Accepts or Rejects
   └─ Navigation to patient address begins

4. CONSULT & CLOSE
   └─ Marks arrival → Appointment moves to In Progress
   └─ Chat available during visit
   └─ Generates digital prescription post-consultation
   └─ Marks appointment Complete → availability auto-resets
```

### 5.3 Admin Journey

```
1. VERIFY DOCTORS
   └─ Reviews pending doctor registration requests
   └─ Validates license number and credentials
   └─ Approves or rejects with reason

2. MONITOR PLATFORM
   └─ Dashboard shows active appointments, flagged accounts
   └─ Reviews reported doctors or suspicious activity
   └─ Analytics: DAU, bookings, revenue, doctor availability heatmap

3. MANAGE USERS
   └─ Can suspend or deactivate accounts
   └─ Resolves escalated disputes between patients and doctors
```

---

## 6. Major Features

### 6.1 Core Feature Set

| # | Feature | Description | Priority |
|---|---|---|---|
| F-01 | **Patient Auth** | Registration, login, JWT session management | P0 |
| F-02 | **Doctor Auth** | Registration with credential upload, login | P0 |
| F-03 | **Admin Verification** | Review and approve/reject doctor profiles | P0 |
| F-04 | **Geo-based Discovery** | Find available doctors within custom radius using MongoDB 2dsphere | P0 |
| F-05 | **Real-time Availability** | Doctors toggle availability; map updates live | P0 |
| F-06 | **Appointment Booking** | Instant or scheduled; full lifecycle management | P0 |
| F-07 | **Razorpay Payment** | Secure payment before appointment confirmation | P0 |
| F-08 | **Live Doctor Tracking** | Socket.io-powered real-time location stream on Leaflet map | P1 |
| F-09 | **In-App Chat** | Bidirectional patient–doctor messaging via Socket.io | P1 |
| F-10 | **Digital Prescription** | Doctor generates structured prescription; PDF download for patient | P1 |
| F-11 | **Ratings & Reviews** | Post-visit star rating and text review system | P1 |
| F-12 | **Notification System** | Email/SMS alerts for booking events, doctor arrival, prescription ready | P2 |
| F-13 | **Admin Analytics** | Platform health dashboard — bookings, revenue, active users | P2 |

### 6.2 Feature Dependency Map

```
[Auth (F-01, F-02)]
        ↓
[Admin Verification (F-03)]
        ↓
[Geo Discovery (F-04) + Availability (F-05)]
        ↓
[Appointment Booking (F-06) + Payment (F-07)]
        ↓
[Live Tracking (F-08)] + [Chat (F-09)]
        ↓
[Prescription (F-10)] + [Review (F-11)]
        ↓
[Notifications (F-12)] + [Analytics (F-13)]
```

---

## 7. System Scope

### 7.1 In Scope

| Area | Details |
|---|---|
| **Platform Type** | Web application (responsive, mobile-first) |
| **User Roles** | Patient, Doctor, Admin |
| **Consultation Type** | Home visit (in-person) |
| **Geography** | India — initial cities; nationwide-ready architecture |
| **Booking Modes** | Instant on-demand + scheduled |
| **Payment** | Razorpay (INR), digital receipts |
| **Prescription** | Digital only — PDF generation and download |
| **Maps** | OpenStreetMap + React Leaflet |
| **Notifications** | In-app, email; SMS (Phase 2) |

### 7.2 Out of Scope (Current Version)

| Item | Reason / Phase |
|---|---|
| Native iOS / Android apps | Phase 2 — web-first strategy |
| Video / audio telemedicine | Phase 2 — separate infrastructure |
| Insurance & claim processing | Phase 3 — regulatory complexity |
| Lab test or pharmacy integration | Phase 3 |
| Multi-language support | Phase 2 |
| AI-based doctor recommendation | Phase 3 |
| Doctor SaaS billing (subscription) | Phase 3 |

### 7.3 System Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                         DocDock Platform                         │
│                                                                  │
│   ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐     │
│   │  Patient UI │   │  Doctor UI   │   │    Admin Panel    │     │
│   └──────┬──────┘   └──────┬───────┘   └────────┬──────────┘     │
│          └─────────────────┴────────────────────┘                │
│                             │ API Layer                          │
│                    ┌────────▼────────┐                           │
│                    │  Express API    │                           │
│                    └────────┬────────┘                           │
│              ┌──────────────┼──────────────┐                     │
│         MongoDB        Socket.io          Redis                  │
│         Atlas          (Real-time)        (Cache)                │
└──────────────────────────────────────────────────────────────────┘
         │                  │                    │
    Cloudinary          Razorpay           Email/SMS
    (External)          (External)         (External)
```

---

## 8. Project Objectives

### 8.1 Product Objectives

| ID | Objective | Definition of Done |
|---|---|---|
| OBJ-01 | Deliver a fully functional on-demand booking system | Patient can book, pay, and receive confirmation end-to-end |
| OBJ-02 | Implement a reliable real-time tracking experience | Doctor location visible on patient map within 1s of update |
| OBJ-03 | Build a trusted doctor onboarding pipeline | No doctor appears on the platform without admin approval |
| OBJ-04 | Complete the clinical workflow | Appointment → Chat → Prescription → Review — all operational |
| OBJ-05 | Achieve production-grade code quality | Test coverage ≥ 70%; zero critical security vulnerabilities |

### 8.2 Technical Objectives

| ID | Objective |
|---|---|
| T-01 | API response time < 2 seconds at P95 under 1,000 concurrent users |
| T-02 | Zero data loss on server crash via atomic MongoDB transactions |
| T-03 | Secure authentication — JWT with refresh token rotation, bcrypt password hashing |
| T-04 | CI/CD pipeline with automated test gates before every deployment |
| T-05 | Fully documented REST API (Swagger/OpenAPI) |

### 8.3 Portfolio Objectives

| ID | Objective |
|---|---|
| P-01 | Demonstrate full-stack architecture decision-making (MERN + Socket.io + Redis) |
| P-02 | Showcase real-world patterns: geo queries, real-time systems, async job queues |
| P-03 | Production deployment on live URLs with monitoring |
| P-04 | Codebase follows enterprise conventions: modular, documented, testable |

---

## 9. Success Metrics

### 9.1 User Experience Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Time from app open to booking confirmed | < 2 minutes | Client-side timing logs |
| Doctor search result load time | < 1.5 seconds | API response time monitoring |
| Live tracking update latency | < 1 second | Socket.io event timestamp diff |
| Prescription PDF generation time | < 3 seconds | Server-side timing |

### 9.2 Platform Health Metrics

| Metric | Target |
|---|---|
| System Uptime | ≥ 99% |
| API Error Rate (5xx) | < 0.5% |
| Doctor Verification Turnaround | < 24 hours |
| Appointment Completion Rate | ≥ 85% of accepted appointments |
| Payment Success Rate | ≥ 98% |

### 9.3 Quality Metrics

| Metric | Target |
|---|---|
| Unit + Integration Test Coverage | ≥ 70% |
| Critical Security Vulnerabilities (OWASP Top 10) | 0 |
| Lighthouse Performance Score (Frontend) | ≥ 85 |
| Lighthouse Accessibility Score | ≥ 90 |
| Open High-Priority Bugs at Launch | 0 |

