# DocDock — Stakeholder Analysis

### *"Knock-Knock, your doctor is here."*

---

## Table of Contents

1. [Stakeholder Identification](#1-stakeholder-identification)
2. [Stakeholder Classification](#2-stakeholder-classification)
3. [Stakeholder Responsibilities](#3-stakeholder-responsibilities)
4. [Stakeholder Expectations](#4-stakeholder-expectations)
5. [Influence vs Interest Matrix](#5-influence-vs-interest-matrix)
6. [Communication Strategy](#6-communication-strategy)
7. [Risks from Stakeholder Misalignment](#7-risks-from-stakeholder-misalignment)

---

## 1. Stakeholder Identification

A stakeholder is any individual, group, or organization that affects, is affected by, or has a legitimate interest in the DocDock platform — its development, operation, or outcomes.

### 1.1 Complete Stakeholder Register

| ID | Stakeholder | Type | Involvement |
|---|---|---|---|
| STK-01 | **Patients** | External — Primary User | Direct platform user; books appointments, receives care |
| STK-02 | **Doctors** | External — Primary User & Service Provider | Direct platform user; delivers care, manages schedule |
| STK-03 | **Admins** | Internal — Platform Operator | Verifies doctors, monitors platform health, manages users |
| STK-04 | **Product Owner** | Internal — Decision Maker | Owns the product vision, roadmap, and priority decisions |
| STK-05 | **Development Team** | Internal — Builders | Designs, builds, tests, and deploys the platform |
| STK-06 | **Investors / Evaluators** | External — Portfolio Audience | Evaluates technical quality and business potential |
| STK-07 | **Regulatory Bodies** | External — Compliance Authority | Governs healthcare practice, data protection, payments |

---

## 2. Stakeholder Classification

### 2.1 Classification Framework

Stakeholders are classified across two axes:

- **Position:** Internal (part of the DocDock team) vs. External (outside the organization)
- **Role:** Primary (direct platform user), Secondary (indirect interest), or Tertiary (compliance/oversight)

| Stakeholder | Internal / External | Primary / Secondary / Tertiary | Category |
|---|---|---|---|
| Patients | External | Primary User | End Consumer |
| Doctors | External | Primary User + Service Provider | Supply-Side Partner |
| Admins | Internal | Primary Operator | Platform Governance |
| Product Owner | Internal | Primary Decision Maker | Strategic Leadership |
| Development Team | Internal | Primary Builder | Engineering Execution |
| Investors / Evaluators | External | Secondary | Capital & Credibility |
| Regulatory Bodies | External | Tertiary | Compliance & Oversight |

### 2.2 Power Classification

| Stakeholder | Power Type | Basis of Power |
|---|---|---|
| Product Owner | **Formal Authority** | Controls roadmap and build priorities |
| Development Team | **Expert Power** | Technical execution capability; gatekeepers of feasibility |
| Patients | **Market Power** | Adoption determines platform viability |
| Doctors | **Supply Power** | Without verified doctors, the platform has no service to offer |
| Admins | **Operational Power** | Control the trust gate — no doctor goes live without admin approval |
| Investors / Evaluators | **Resource Power** | Funding, career opportunity, and public credibility |
| Regulatory Bodies | **Coercive Power** | Can mandate compliance changes or prohibit operation |

---

## 3. Stakeholder Responsibilities

### STK-01 — Patients

| Responsibility | Description |
|---|---|
| Accurate Registration | Provide accurate personal and contact information during registration |
| Honest Reviews | Submit fair, factual ratings and reviews after consultations |
| Timely Responsiveness | Be available and responsive when a booked doctor is en route |
| Payment | Complete Razorpay payment at time of booking |
| Location Access | Grant browser location permission for geo-based discovery to function |
| Appropriate Use | Use the platform for legitimate medical consultations only |

---

### STK-02 — Doctors

| Responsibility | Description |
|---|---|
| Credential Submission | Provide valid MCI/NMC license number and registration documents during onboarding |
| Availability Accuracy | Toggle availability truthfully — go offline when unavailable to avoid patient disappointment |
| Timely Response | Accept or reject appointment requests within a reasonable window (target: 5 minutes) |
| Location Sharing | Share live GPS location during active home-visit appointments |
| Prescription Integrity | Issue prescriptions only for conditions actually consulted upon |
| Professional Conduct | Maintain ethical, professional behavior with patients on and off the platform |
| Profile Accuracy | Keep specialization, fee, and contact details current |

---

### STK-03 — Admins

| Responsibility | Description |
|---|---|
| Doctor Verification | Review and verify or reject doctor registration requests within 24 hours |
| Credential Validation | Cross-check MCI/NMC license numbers against official registries |
| Platform Monitoring | Actively monitor the admin analytics dashboard for anomalies |
| Dispute Resolution | Handle escalated complaints between patients and doctors |
| Account Management | Suspend or deactivate accounts that violate platform policies |
| Data Governance | Ensure patient and doctor data is handled per platform privacy policy |
| Policy Enforcement | Apply platform rules consistently and without bias |

---

### STK-04 — Product Owner

| Responsibility | Description |
|---|---|
| Vision Ownership | Define and communicate the product vision; ensure every sprint serves that vision |
| Backlog Management | Maintain a prioritized, groomed product backlog |
| Scope Control | Make authoritative scope decisions; prevent scope creep mid-sprint |
| Stakeholder Liaison | Bridge end-user needs and engineering realities |
| Acceptance Criteria | Define clear, testable acceptance criteria for every feature |
| Roadmap Decisions | Approve Phase 2/3 feature inclusions based on Phase 1 outcomes |
| Trade-off Resolution | Make explicit decisions when quality, scope, and timeline conflict |

---

### STK-05 — Development Team

| Responsibility | Description |
|---|---|
| Technical Architecture | Design scalable, modular system architecture aligned with the tech stack |
| Sprint Delivery | Deliver agreed sprint scope on time with acceptable quality |
| Code Quality | Follow agreed standards: linting, naming conventions, modular structure |
| Testing | Achieve ≥ 70% unit + integration test coverage |
| Documentation | Maintain Swagger API docs; comment complex logic; keep README current |
| Security | Implement JWT auth, bcrypt, input validation, rate limiting, HTTPS |
| CI/CD | Set up GitHub Actions pipeline with automated test and lint gates |
| Incident Response | Respond to critical bugs and deployment failures promptly |

---

### STK-06 — Investors / Evaluators

| Responsibility | Description |
|---|---|
| Evaluation | Assess technical quality, architecture decisions, and code standards objectively |
| Feedback | Provide timely, constructive feedback during portfolio reviews |
| Due Diligence | For actual investors: conduct fair technical and business due diligence |
| Engagement | Engage with live demo and documentation honestly |

---

### STK-07 — Regulatory Bodies

| Body | Jurisdiction | Responsibility Toward DocDock |
|---|---|---|
| **NMC (National Medical Commission)** | Medical practice, doctor licensing | Standard against which doctor credentials are verified |
| **MeitY (IT Ministry)** | IT Act 2000, digital services | Platform must comply with IT Act provisions |
| **MoHFW (Ministry of Health)** | Telemedicine guidelines | DocDock home visits must comply with Telemedicine Practice Guidelines 2020 |
| **PDPB / DPDP Act** | Personal data protection | Patient health data handling, consent, and breach notification |
| **RBI / Razorpay** | Digital payments | Razorpay handles PCI-DSS compliance; platform must not store raw card data |

---

## 4. Stakeholder Expectations

What each stakeholder expects from DocDock — these expectations directly drive requirements.

### STK-01 — Patient Expectations

| Expectation | Priority | Mapped Feature |
|---|---|---|
| Find a real, verified doctor nearby | Critical | Admin verification + geo search |
| Know the doctor is available right now | Critical | Real-time availability toggle |
| Book and confirm in under 2 minutes | Critical | Appointment booking flow |
| Track the doctor coming to my home | High | Live tracking (Socket.io + Leaflet) |
| Safe, secure payment experience | High | Razorpay integration |
| Digital prescription I can keep | High | PDF prescription generation |
| Communicate with doctor before/during visit | Medium | In-app chat |
| Read and leave honest reviews | Medium | Ratings & reviews system |
| My personal and health data is private | Critical | Auth, encryption, privacy policy |

### STK-02 — Doctor Expectations

| Expectation | Priority | Mapped Feature |
|---|---|---|
| Simple, fast onboarding | High | Doctor registration + Cloudinary upload |
| Control over when I receive patients | Critical | Availability toggle |
| Clear view of incoming appointment requests | Critical | Doctor dashboard — appointment queue |
| Accept or reject with one tap | High | Appointment status management |
| Digital prescription workflow | High | Prescription creation + PDF |
| Transparent earnings per consultation | Medium | Payment record in dashboard |
| Patient can reach me if needed | Medium | In-app chat |
| Build a reputation on the platform | Medium | Ratings & reviews |
| My data and patient data is safe | Critical | Auth + data security |

### STK-03 — Admin Expectations

| Expectation | Priority | Mapped Feature |
|---|---|---|
| Clear queue of unverified doctors | Critical | Admin verification dashboard |
| Enough information to verify credentials | Critical | Doctor profile with license, photo, documents |
| Ability to approve or reject with a reason | Critical | Verify/reject actions with notes |
| Monitor platform health at a glance | High | Analytics dashboard |
| Ability to act on bad actors quickly | High | User suspension / deactivation |
| Audit trail of verification decisions | Medium | Admin action logs |

### STK-04 — Product Owner Expectations

| Expectation | Priority |
|---|---|
| All P0 features delivered in Sprints 1–4 | Critical |
| Clear sprint progress visibility | High |
| No unannounced scope changes | High |
| Production deployment by Sprint 6 | Critical |
| Portfolio-ready codebase at handover | Critical |
| 15 documentation artifacts complete | High |

### STK-05 — Development Team Expectations

| Expectation | Priority |
|---|---|
| Clear, unambiguous requirements per sprint | Critical |
| Stable tech stack — no mid-project pivots | High |
| Product Owner available for quick clarifications | High |
| No retroactive scope additions to closed sprints | High |
| Recognition of technical constraints in planning | High |
| Adequate time for testing and refactoring | Medium |

### STK-06 — Investor / Evaluator Expectations

| Expectation | Priority |
|---|---|
| Live deployment accessible via public URL | Critical |
| Production-level code quality and architecture | Critical |
| Real-time features demonstrable live | High |
| Full documentation suite | High |
| Clear technical decision rationale | Medium |
| Scalability path clearly articulated | Medium |

### STK-07 — Regulatory Body Expectations

| Body | Expectation |
|---|---|
| NMC | Doctors on platform hold valid, current MCI/NMC registration |
| DPDP Act | Patient health data collected with consent; stored securely; breach notification procedures in place |
| MoHFW | Home visit consultations aligned with Telemedicine Practice Guidelines 2020 |
| Razorpay / RBI | No raw card data stored on DocDock servers; Razorpay handles PCI-DSS |

---

## 5. Influence vs Interest Matrix

### 5.1 Matrix Axes

- **Influence (Power):** Ability to impact project decisions, execution, or outcomes
- **Interest:** Degree of stake in the project's success or failure

### 5.2 Matrix Placement

```
HIGH INFLUENCE
        │
        │   Regulatory Bodies          Product Owner
        │   (High Inf / Med Int)       (High Inf / High Int)
        │                                       ★
        │                              Development Team
        │                              (High Inf / High Int)
        │                                       ★
        │
        │          Investors /         Admins
        │          Evaluators          (Med Inf / High Int)
        │          (Med Inf /
        │          Med Int)
        │
        │                     Doctors              Patients
        │                     (Med-Low Inf /       (Low Inf /
        │                      High Int)            High Int)
        │
LOW INFLUENCE
        └────────────────────────────────────────────────────────
                LOW INTEREST                        HIGH INTEREST
```

### 5.3 Quadrant Definitions & Management Strategy

| Quadrant | Stakeholders | Strategy |
|---|---|---|
| **High Influence / High Interest** *(Manage Closely)* | Product Owner, Development Team | Continuous collaboration; daily/weekly syncs; involve in every decision |
| **High Influence / Medium Interest** *(Keep Satisfied)* | Regulatory Bodies | Proactive compliance adherence; documented governance decisions |
| **Medium Influence / High Interest** *(Keep Informed)* | Doctors, Admins, Investors/Evaluators | Regular updates; milestone demos; feedback loops |
| **Low Influence / High Interest** *(Keep Informed)* | Patients | UX testing, feedback surveys, transparent communication |

### 5.4 Detailed Matrix Table

| Stakeholder | Influence (1–5) | Interest (1–5) | Quadrant | Engagement Level |
|---|---|---|---|---|
| Product Owner | 5 | 5 | Manage Closely | Daily |
| Development Team | 5 | 5 | Manage Closely | Daily |
| Regulatory Bodies | 5 | 3 | Keep Satisfied | As-needed compliance |
| Admins | 4 | 5 | Keep Informed | Weekly |
| Doctors | 3 | 5 | Keep Informed | Sprint demos + feedback |
| Investors / Evaluators | 3 | 3 | Monitor | Milestone reviews |
| Patients | 2 | 5 | Keep Informed | UX testing + surveys |

---

## 6. Communication Strategy

### 6.1 Communication Matrix

| Stakeholder | What to Communicate | Channel | Frequency | Owner |
|---|---|---|---|---|
| **Product Owner** | Sprint progress, blockers, scope changes, key decisions | Standup + Sprint Review | Daily + Bi-weekly | Dev Lead |
| **Development Team** | Requirements, acceptance criteria, priority changes, design decisions | Sprint Planning + Slack/GitHub | Per sprint + as-needed | Product Owner |
| **Admins** | New platform features, policy changes, verification workflow updates | Internal docs + walkthrough session | Per major release | Product Owner |
| **Doctors** | Onboarding instructions, platform updates, availability best practices | In-app notification + email | At onboarding + releases | Product Owner |
| **Patients** | Feature updates, booking guidance, support resources | In-app notifications + help center | At releases + events | Product Owner |
| **Investors / Evaluators** | Milestone completion, live demo access, architecture walkthroughs, documentation | GitHub README + demo URL + email | At project milestones | Product Owner |
| **Regulatory Bodies** | Compliance posture, data handling policies, doctor verification process | Privacy policy + compliance docs | At launch + policy changes | Legal/Product |

### 6.2 Escalation Path

```
Issue Identified (Any Stakeholder)
            ↓
    Development Team
  (Technical Issues)
            ↓
       Product Owner
  (Scope / Priority Issues)
            ↓
  Investor / Evaluator
 (Business / Portfolio Issues)
            ↓
   Regulatory / Legal Counsel
    (Compliance Issues)
```

### 6.3 Feedback Loops

| Stakeholder | Feedback Mechanism | Cadence |
|---|---|---|
| Patients | In-app review system; UX survey post-booking | Continuous + quarterly |
| Doctors | Dashboard satisfaction survey; admin escalation channel | Post-onboarding + monthly |
| Admins | Retrospective with Product Owner on verification workflow | Per sprint |
| Development Team | Sprint retrospective | Per sprint (bi-weekly) |
| Investors / Evaluators | Portfolio review session + live demo | At project completion |

---

## 7. Risks from Stakeholder Misalignment

### 7.1 Risk Register

| ID | Risk | Stakeholders Involved | Likelihood | Impact | Severity |
|---|---|---|---|---|---|
| R-01 | **Doctor supply shortage at launch** | Doctors, Admins | High | Critical | 🔴 High |
| R-02 | **Admin verification bottleneck** | Admins, Doctors, Patients | Medium | High | 🟠 Medium-High |
| R-03 | **Doctor availability inconsistency** | Doctors, Patients | High | High | 🔴 High |
| R-04 | **Patient trust deficit** | Patients, Admins, Regulatory | Low | Critical | 🟠 Medium-High |
| R-05 | **Scope creep from Product Owner** | Product Owner, Dev Team | Medium | High | 🟠 Medium-High |
| R-06 | **Developer estimation errors** | Dev Team, Product Owner | Medium | Medium | 🟡 Medium |
| R-07 | **Regulatory non-compliance** | Regulatory Bodies, Product Owner | Low | Critical | 🟠 Medium-High |
| R-08 | **Investor / evaluator misaligned expectations** | Investors, Product Owner | Low | Medium | 🟡 Low-Medium |
| R-09 | **Patient data breach** | Patients, Regulatory, Dev Team | Low | Critical | 🟠 Medium-High |
| R-10 | **Doctor rejects platform after onboarding** | Doctors, Dev Team | Medium | Medium | 🟡 Medium |

---

### 7.2 Detailed Risk Analysis

#### R-01 — Doctor Supply Shortage at Launch
> **Risk:** At launch, too few verified doctors are available on the platform for patients to find a match, making the platform appear broken or useless.

| Attribute | Detail |
|---|---|
| **Root Cause** | Verification takes time; doctors may not onboard proactively |
| **Stakeholders** | Doctors (low motivation to self-register), Admins (slow verification) |
| **Impact** | Patient opens app, sees no doctors nearby → abandons platform |
| **Mitigation** | Pre-seed doctor base before patient launch; streamline verification to < 24hr; use seeded demo data for portfolio |
| **Owner** | Product Owner + Admin |

---

#### R-02 — Admin Verification Bottleneck
> **Risk:** Manual, human-driven verification cannot keep pace with doctor registration volume, causing doctors to wait days or weeks for approval.

| Attribute | Detail |
|---|---|
| **Root Cause** | Verification is entirely manual; no SLA enforcement mechanism |
| **Stakeholders** | Admins (overloaded), Doctors (frustrated), Patients (low supply) |
| **Impact** | Doctor churn; supply shortage; platform trust damage |
| **Mitigation** | Set 24-hour verification SLA; build admin notification for pending queue; future: semi-automated NMC API lookup |
| **Owner** | Admin + Product Owner |

---

#### R-03 — Doctor Availability Inconsistency
> **Risk:** Doctors mark themselves as available but do not respond to requests, or go offline without toggling unavailability — leaving patients with a confirmed booking that goes unmet.

| Attribute | Detail |
|---|---|
| **Root Cause** | Doctors treating availability toggle casually; no enforcement mechanism |
| **Stakeholders** | Doctors, Patients |
| **Impact** | Patient left waiting → poor NPS; potentially dangerous if patient needed urgent care |
| **Mitigation** | Auto-timeout availability after X hours; no-response penalty (temporary suspension); booking cancellation with refund if doctor doesn't respond within 5 minutes |
| **Owner** | Dev Team + Product Owner |

---

#### R-04 — Patient Trust Deficit
> **Risk:** Patients are unwilling to allow an unverified stranger into their home, even if the platform shows the doctor as "verified."

| Attribute | Detail |
|---|---|
| **Root Cause** | Home safety is a unique barrier not present in clinic bookings |
| **Stakeholders** | Patients, Admins (quality of verification), Regulatory Bodies |
| **Impact** | Low conversion from search to booking; platform fails on its core value proposition |
| **Mitigation** | Show verified badge prominently; display license number; show ratings and review count; consider live photo ID verification in Phase 2 |
| **Owner** | Product Owner + Admin |

---

#### R-05 — Scope Creep from Product Owner
> **Risk:** Product Owner continuously adds features mid-sprint, destabilizing the development plan and delaying core delivery.

| Attribute | Detail |
|---|---|
| **Root Cause** | Excitement about new ideas; unclear sprint closure protocols |
| **Stakeholders** | Product Owner (requestor), Development Team (impacted) |
| **Impact** | Sprints overrun; P0 features delayed; team morale degraded |
| **Mitigation** | Enforce sprint freeze after planning; new requests go into backlog, not active sprint; Product Owner signs off on sprint scope formally |
| **Owner** | Product Owner + Dev Lead |

---

#### R-06 — Developer Estimation Errors
> **Risk:** Development team underestimates complexity of real-time tracking, geo queries, or Socket.io integration — causing sprint overruns.

| Attribute | Detail |
|---|---|
| **Root Cause** | New technology (Socket.io, MongoDB 2dsphere) with learning curve |
| **Stakeholders** | Development Team, Product Owner |
| **Impact** | Features deferred; timeline slips; portfolio deadline risk |
| **Mitigation** | Build POC for geo + Socket.io in Week 2 before sprint commitments; add 20% buffer to Socket.io sprint estimates; defer P2 features when under pressure |
| **Owner** | Dev Lead |

---

#### R-07 — Regulatory Non-Compliance
> **Risk:** Platform violates Telemedicine Practice Guidelines 2020 or DPDP Act provisions — specifically around prescription issuance and patient data handling.

| Attribute | Detail |
|---|---|
| **Root Cause** | Regulatory requirements not embedded in design from the start |
| **Stakeholders** | Regulatory Bodies (NMC, MoHFW, MeitY), Product Owner, Dev Team |
| **Impact** | Forced shutdown, legal action, or mandatory rework; reputation damage |
| **Mitigation** | Capture and verify MCI/NMC number before prescription unlocked; encryption for health records; DPDP-compliant consent on registration; privacy policy published at launch |
| **Owner** | Product Owner + Dev Team |

---

#### R-08 — Investor / Evaluator Misaligned Expectations
> **Risk:** Portfolio evaluators (employers, investors) expect a commercially live product when the project is portfolio-grade — or vice versa.

| Attribute | Detail |
|---|---|
| **Root Cause** | Unclear communication of project scope and intent |
| **Stakeholders** | Investors / Evaluators, Product Owner |
| **Impact** | Unfair evaluation; missed opportunity |
| **Mitigation** | README clearly states portfolio-grade scope; Razorpay test mode documented; live demo shows full flow with seeded data |
| **Owner** | Product Owner |

---

#### R-09 — Patient Data Breach
> **Risk:** Patient health records, personal information, or appointment history is exposed due to a security vulnerability.

| Attribute | Detail |
|---|---|
| **Root Cause** | Missing auth middleware, unsanitized inputs, exposed environment variables |
| **Stakeholders** | Patients (directly harmed), Regulatory Bodies (DPDP Act violation), Dev Team (responsible) |
| **Impact** | Legal liability, complete trust destruction, mandatory incident reporting |
| **Mitigation** | JWT on all protected routes; bcrypt passwords; input validation (Joi/Zod); helmet.js; rate limiting; no sensitive data in client-side state; env vars via .env and secrets manager |
| **Owner** | Dev Team |

---

#### R-10 — Doctor Platform Abandonment Post-Onboarding
> **Risk:** Doctors register, get verified, but never actively use the platform — leaving it empty of available supply.

| Attribute | Detail |
|---|---|
| **Root Cause** | Onboarding friction too high; value proposition unclear to doctors; no early patients to serve |
| **Stakeholders** | Doctors, Product Owner, Patients |
| **Impact** | Marketplace chicken-and-egg problem; patients see no doctors; doctors see no patients |
| **Mitigation** | Streamlined onboarding (< 10 min); clear doctor value prop (earnings, digital tools); seed platform with demo data for portfolio; Phase 2 push notifications to re-engage inactive doctors |
| **Owner** | Product Owner |

---

### 7.3 Risk Heatmap Summary

```
              │  LOW IMPACT  │  MED IMPACT  │  HIGH IMPACT  │  CRITICAL
──────────────┼──────────────┼──────────────┼───────────────┼───────────────
HIGH          │              │              │ R-03          │ R-01
LIKELIHOOD    │              │              │               │
──────────────┼──────────────┼──────────────┼───────────────┼───────────────
MEDIUM        │              │ R-06, R-10   │ R-02, R-05    │
LIKELIHOOD    │              │              │               │
──────────────┼──────────────┼──────────────┼───────────────┼───────────────
LOW           │              │ R-08         │               │ R-04, R-07
LIKELIHOOD    │              │              │               │ R-09
──────────────┴──────────────┴──────────────┴───────────────┴───────────────

🔴 Critical Priority: R-01, R-03
🟠 High Priority:     R-02, R-04, R-05, R-07, R-09
🟡 Medium Priority:   R-06, R-08, R-10
```

---

## Appendix — Stakeholder Summary Card

| Stakeholder | Influence | Interest | Quadrant | Engagement | Primary Risk |
|---|---|---|---|---|---|
| Product Owner | 5/5 | 5/5 | Manage Closely | Daily | Scope creep (R-05) |
| Development Team | 5/5 | 5/5 | Manage Closely | Daily | Estimation errors (R-06) |
| Admins | 4/5 | 5/5 | Keep Informed | Weekly | Verification bottleneck (R-02) |
| Regulatory Bodies | 5/5 | 3/5 | Keep Satisfied | As-needed | Non-compliance (R-07) |
| Doctors | 3/5 | 5/5 | Keep Informed | Sprint demos | Platform abandonment (R-10) |
| Investors / Evaluators | 3/5 | 3/5 | Monitor | Milestones | Misaligned expectations (R-08) |
| Patients | 2/5 | 5/5 | Keep Informed | UX testing | Trust deficit (R-04) |



---