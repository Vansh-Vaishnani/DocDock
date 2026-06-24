# Non-Functional Requirements (NFR) Documentation

---

## 1. Purpose

This document defines the Non-Functional Requirements (NFRs) for DocDock — the quality attributes, constraints, and operational standards the system must satisfy in addition to its functional features. NFRs govern *how well* the system performs rather than *what* it does, and are critical given DocDock's handling of sensitive health data (PHI), real-time geo-location, live tracking, payments, and three distinct user roles (Patients, Doctors, Admins).

Each requirement below follows a consistent structure:
- **NFR ID** — unique identifier for traceability
- **Description** — the requirement statement
- **Acceptance Criteria** — measurable conditions that define "done"
- **Measurement Method** — how the requirement is verified, tested, or monitored

---

## 2. Performance

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-PERF-01** | API response time for standard CRUD operations (patient/doctor profile, appointment fetch) must be fast under normal load. | 95th percentile (P95) response time ≤ 300ms; P99 ≤ 600ms for non-search endpoints under expected concurrent load (≤500 concurrent users). | Load testing via k6/Artillery against staging; APM monitoring (e.g., New Relic/Datadog) in production with P95/P99 dashboards. |
| **NFR-PERF-02** | Nearby doctor search using geo-location must return results quickly to support real-time discovery. | Search query returns results within 1.5 seconds for a 5–10km radius query against a dataset of 10,000+ doctor records. | MongoDB geospatial query benchmarking (`$geoNear` / `$near` with 2dsphere index) using synthetic datasets; production query timing logs. |
| **NFR-PERF-03** | Real-time live doctor location tracking must update with minimal latency. | Location updates propagate from doctor's device to patient's map view within 2 seconds (P95) via Socket.io. | Socket.io event timestamp diffing (emit-to-receive latency) measured in staging and production via custom logging middleware. |
| **NFR-PERF-04** | Chat messages between patient and doctor must be delivered with low latency. | Message delivery (sender emit → receiver render) completes within 1 second (P95) under normal network conditions. | Socket.io round-trip timestamp logging; synthetic chat load testing with 100 concurrent chat sessions. |
| **NFR-PERF-05** | The platform must handle concurrent appointment booking without significant performance degradation. | System sustains 200 concurrent booking transactions/minute with no more than 5% increase in average response time versus baseline. | Load testing (k6) simulating booking bursts; database write-latency monitoring on the Appointments collection. |
| **NFR-PERF-06** | Frontend pages must load within acceptable web performance thresholds. | Largest Contentful Paint (LCP) ≤ 2.5s, Time to Interactive (TTI) ≤ 3.5s on 4G network simulation for key pages (Home, Search, Booking). | Google Lighthouse CI integrated into deployment pipeline; Vercel Analytics / Web Vitals reporting. |
| **NFR-PERF-07** | Razorpay payment processing must complete within an acceptable transaction window. | Payment initiation-to-confirmation round trip completes within 5 seconds (P95), excluding bank/UPI processing time outside platform control. | Transaction timestamp logging (initiated_at → confirmed_at) in payment service; Razorpay webhook latency audit. |

---

## 3. Availability

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-AVAIL-01** | The platform must maintain high uptime for core patient-facing services (search, booking, chat). | System uptime ≥ 99.5% measured monthly (excludes scheduled maintenance windows communicated 24h in advance). | Uptime monitoring via UptimeRobot/Better Stack with synthetic health-check pings every 60 seconds; monthly SLA report. |
| **NFR-AVAIL-02** | Real-time services (Socket.io for chat/tracking) must remain available with automatic reconnection on transient failure. | Client reconnects within 5 seconds of connection drop in 95% of cases; no more than 1% of sessions experience unrecovered disconnects per day. | Socket.io reconnection event logging; client-side telemetry on disconnect/reconnect cycles. |
| **NFR-AVAIL-03** | Scheduled maintenance must not disrupt active in-progress consultations or live tracking sessions. | Zero active sessions (chat/tracking/payment-in-progress) are forcibly terminated during planned deployments; deployments use rolling/zero-downtime strategy. | Deployment runbook audit; blue-green or rolling deployment verification on Railway/Render; pre/post-deploy active-session count comparison. |
| **NFR-AVAIL-04** | Database (MongoDB Atlas) must be configured for high availability. | MongoDB Atlas cluster runs as a minimum 3-node replica set across availability zones with automatic failover. | MongoDB Atlas cluster configuration audit; documented failover drill performed quarterly. |
| **NFR-AVAIL-05** | Critical third-party dependency outages (Razorpay, Cloudinary) must degrade gracefully rather than crash the platform. | If Razorpay/Cloudinary is unavailable, the affected feature (payment/upload) shows a clear error state while all other platform features remain functional. | Chaos/fault-injection testing (mocking third-party API failures); manual QA simulation of dependency timeout/500 errors. |

---

## 4. Reliability

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-REL-01** | Appointment booking transactions must be atomic and consistent — no double-bookings or lost bookings. | Concurrent booking requests for the same doctor/time-slot result in exactly one confirmed booking; no orphaned or duplicate records under race conditions. | Automated concurrency tests (parallel booking requests against same slot) using MongoDB transactions; database integrity audit scripts. |
| **NFR-REL-02** | Payment transactions must be reliably reconciled between Razorpay and the application database. | 100% of successful Razorpay payments are reflected in the application's transaction records within 60 seconds via webhook; reconciliation job flags mismatches daily. | Razorpay webhook delivery logs cross-checked against internal Payment collection; automated daily reconciliation script with alerting. |
| **NFR-REL-03** | The system must not lose chat messages or prescription data due to service interruption. | Messages and prescriptions are persisted to MongoDB before acknowledgment to sender; no data loss confirmed under simulated mid-transmission failure. | Fault-injection testing (kill connection mid-write); message delivery acknowledgment (ACK) audit logs. |
| **NFR-REL-04** | Error rates across core APIs must remain below an acceptable threshold. | Application error rate (5xx responses) ≤ 0.5% of total requests measured weekly. | APM error-rate dashboards (Datadog/New Relic/Sentry); automated alerting when threshold exceeded. |
| **NFR-REL-05** | Background jobs (notification dispatch, reminder emails/SMS) must retry on failure without duplicate sends. | Failed notification jobs retry up to 3 times with exponential backoff; idempotency keys prevent duplicate delivery. | Job queue monitoring (e.g., BullMQ dashboard) reviewing retry counts and dead-letter queue size. |

---

## 5. Security

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-SEC-01** | All user passwords must be securely hashed and never stored or transmitted in plaintext. | Passwords hashed using bcrypt with a minimum cost factor of 12; no plaintext password appears in logs, database, or API responses. | Code review of authentication module; static analysis (e.g., grep audit for plaintext password logging); database field inspection. |
| **NFR-SEC-02** | All authenticated API endpoints must validate JWT tokens and enforce role-based access control (Patient/Doctor/Admin). | 100% of protected routes reject requests with missing, expired, or tampered JWTs (HTTP 401); role-mismatched requests return HTTP 403. | Automated API security test suite (Postman/Jest) covering each role × endpoint matrix; periodic penetration testing. |
| **NFR-SEC-03** | All data in transit must be encrypted. | TLS 1.2+ enforced on all client-server and server-database connections; HTTP requests auto-redirect to HTTPS. | SSL Labs scan (target grade A or higher); Vercel/Railway HTTPS enforcement configuration audit. |
| **NFR-SEC-04** | Sensitive data at rest (PHI, payment metadata) must be encrypted in the database. | MongoDB Atlas encryption-at-rest enabled; field-level encryption applied to highly sensitive fields (e.g., medical history notes, prescription details). | MongoDB Atlas configuration audit; field-level encryption verification in schema. |
| **NFR-SEC-05** | The platform must protect against common web vulnerabilities (OWASP Top 10). | No critical or high-severity findings in OWASP-based security scan (SQLi/NoSQLi injection, XSS, CSRF, broken auth, etc.). | Automated SAST/DAST scanning (e.g., OWASP ZAP, Snyk) integrated into CI/CD; annual third-party penetration test. |
| **NFR-SEC-06** | Doctor verification documents (licenses, certifications) uploaded via Cloudinary must be access-restricted. | Verification documents are stored as private Cloudinary assets accessible only via signed, time-limited URLs to authorized Admin roles. | Cloudinary access-control configuration audit; attempted unauthorized access test (direct URL access without signature). |
| **NFR-SEC-07** | Razorpay payment integration must never expose API secrets client-side. | Razorpay secret key exists only in backend environment variables; only the public key is exposed to frontend; secrets excluded from version control. | Source code and bundle audit (grep for secret patterns in client bundle); `.gitignore`/secret-scanning tool (e.g., GitGuardian) in CI. |
| **NFR-SEC-08** | Rate limiting must be enforced on authentication and search endpoints to prevent abuse/brute-force. | Login endpoint limited to 5 attempts per IP per 15 minutes; search endpoint capped at 60 requests/minute per user. | Rate-limiter configuration testing (e.g., `express-rate-limit`); automated abuse-simulation test hitting limits and verifying HTTP 429 responses. |
| **NFR-SEC-09** | Session and token expiry must be enforced to limit exposure from compromised credentials. | JWT access tokens expire within 15–60 minutes; refresh tokens expire within 7 days and are revocable. | Token expiry configuration review; test for rejected requests using expired tokens. |

---

## 6. Scalability

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-SCAL-01** | The backend must scale horizontally to handle growth in concurrent users without architectural rework. | Node.js/Express services are stateless (session state externalized to MongoDB/Redis), enabling horizontal scaling across multiple instances on Railway/Render. | Architecture review confirming statelessness; load test with multiple service instances behind a load balancer. |
| **NFR-SCAL-02** | Real-time Socket.io infrastructure must support horizontal scaling across multiple server instances. | Socket.io configured with a Redis adapter to support pub/sub across instances; messages/tracking events reach correct clients regardless of which instance they connect to. | Multi-instance integration test (2+ Node instances with Redis adapter) verifying cross-instance event delivery. |
| **NFR-SCAL-03** | The database must scale to support growing volumes of doctors, patients, and appointment records. | MongoDB Atlas cluster supports vertical tier upgrades and sharding readiness; geospatial and frequently-queried fields are indexed. | MongoDB Atlas performance advisor review; index audit on Doctors (geo), Appointments, and Users collections. |
| **NFR-SCAL-04** | The system must support increased load during peak demand periods (e.g., flu season, regional outbreaks) without manual intervention. | Auto-scaling configured on hosting platform (Railway/Render) to add instances when CPU/memory exceeds 70% utilization for 5+ minutes. | Auto-scaling configuration audit; simulated traffic spike test observing scale-out behavior. |
| **NFR-SCAL-05** | Media storage (profile photos, documents, prescriptions) via Cloudinary must scale independently of application servers. | All media assets are offloaded to Cloudinary CDN; application servers store only asset URLs/references, not binary data. | Architecture review confirming no binary storage in application database or filesystem. |

---

## 7. Maintainability

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-MAIN-01** | Codebase must follow consistent style and structure across frontend and backend. | ESLint + Prettier configured and enforced via pre-commit hooks and CI; zero lint errors permitted on merge to main branch. | CI pipeline lint-check step; pre-commit hook (Husky) verification. |
| **NFR-MAIN-02** | The system must be modular, separating concerns across patient, doctor, and admin domains. | Backend organized by domain modules (auth, doctors, patients, appointments, payments, chat, notifications) with clear API boundaries; no cross-module direct database access. | Architecture/code review against modular boundary checklist. |
| **NFR-MAIN-03** | Codebase must include adequate automated test coverage to support safe refactoring. | Minimum 70% unit test coverage on backend business logic (services/controllers); critical paths (booking, payment, auth) covered by integration tests. | Coverage reports via Jest/Istanbul integrated into CI; coverage threshold gate blocking merges below target. |
| **NFR-MAIN-04** | Environment configuration must be externalized and documented for all deployment targets. | All secrets/config (DB URIs, API keys, JWT secrets) managed via environment variables with a documented `.env.example`; no hardcoded config in source. | Codebase audit for hardcoded values; `.env.example` completeness review. |
| **NFR-MAIN-05** | API must be documented to support onboarding and third-party integration. | All REST endpoints documented (e.g., via Swagger/OpenAPI or Postman collection) including request/response schemas and auth requirements. | Documentation completeness review; automated OpenAPI spec validation in CI. |
| **NFR-MAIN-06** | Database schema changes must be version-controlled and migration-safe. | Schema/index changes tracked via migration scripts or documented change log; no untracked manual production database edits. | Migration script repository review; deployment process audit. |

---

## 8. Usability

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-USE-01** | The patient booking flow must be completable with minimal steps. | A first-time patient can search, select a doctor, and complete a booking in 5 steps or fewer, without external help. | Usability testing with 5–8 representative users; task-completion time and step-count measurement. |
| **NFR-USE-02** | The platform must provide clear, real-time feedback during booking, payment, and tracking actions. | All asynchronous actions (search, booking, payment, tracking updates) display loading states, success confirmations, or clear error messages within 1 second of state change. | UI/UX review checklist; manual QA pass across all async flows. |
| **NFR-USE-03** | The interface must be responsive and usable across mobile and desktop devices. | All core flows (search, booking, chat, tracking) are fully functional and visually correct on viewport widths from 360px to 1920px. | Cross-device testing (BrowserStack or manual device matrix); responsive design QA checklist. |
| **NFR-USE-04** | Error messages must be actionable and avoid technical jargon for non-technical users (patients). | 100% of user-facing error messages reviewed are in plain language and suggest a next step (e.g., "Payment failed — please check your card details and try again"). | Content/UX review of all error message strings; usability testing feedback. |
| **NFR-USE-05** | Doctors must be able to manage availability and appointments with minimal training. | A doctor can update availability status and view/manage upcoming appointments without consulting documentation, validated via moderated usability test. | Moderated usability testing session with 3–5 doctor-persona testers; task success rate ≥ 90%. |

---

## 9. Accessibility

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-ACC-01** | The web application must conform to WCAG 2.1 Level AA standards. | Automated accessibility scan reports zero critical violations; color contrast ratios meet ≥ 4.5:1 for normal text. | Automated scanning via axe-core/Lighthouse Accessibility audit integrated into CI; manual screen-reader spot checks. |
| **NFR-ACC-02** | All interactive elements must be keyboard-navigable. | 100% of interactive elements (buttons, forms, map controls, chat input) are reachable and operable via keyboard (Tab/Enter/Escape) without a mouse. | Manual keyboard-only navigation testing across core flows. |
| **NFR-ACC-03** | Forms (registration, booking, profile) must have properly associated labels and ARIA attributes for assistive technology. | All form inputs have associated `<label>` elements or `aria-label`; form validation errors are announced via `aria-live` regions. | Automated axe-core audit; manual testing with screen readers (NVDA/VoiceOver). |
| **NFR-ACC-04** | Map-based doctor search must provide a non-map-dependent alternative for visually impaired users. | A list-view alternative to the React Leaflet map is available and fully functional, presenting the same search results and booking actions. | Manual accessibility QA verifying list-view parity with map-view functionality. |

---

## 10. Compliance

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-COMP-01** | The platform must comply with applicable Indian digital health and telemedicine guidelines for doctor-patient interactions. | Doctor onboarding workflow requires valid medical registration number verification consistent with Telemedicine Practice Guidelines (India); consultation/prescription flows align with documented telemedicine practice standards. | Legal/compliance review checklist; Admin verification workflow audit against regulatory documentation. |
| **NFR-COMP-02** | Digital prescriptions generated by the platform must include legally required elements. | Each digital prescription includes doctor's name, registration number, patient details, date, diagnosis/medication, and digital signature/verification marker. | Prescription template review against telemedicine prescription guideline checklist; sample prescription audit. |
| **NFR-COMP-03** | Payment processing must comply with applicable financial regulations (RBI/PCI-DSS via Razorpay). | No raw card data is handled or stored by DocDock servers; all card-data handling is delegated to Razorpay's PCI-DSS compliant infrastructure. | Architecture review confirming no card-data storage; Razorpay integration documentation compliance check. |
| **NFR-COMP-04** | User consent must be explicitly captured for data collection and processing. | Registration flow includes explicit consent checkboxes for Terms of Service and Privacy Policy, with timestamped consent records stored. | Database audit of consent records; UI flow review confirming consent cannot be bypassed. |
| **NFR-COMP-05** | Platform must maintain audit trails for sensitive actions (prescription issuance, admin verification decisions, payment events). | All sensitive actions are logged with actor ID, timestamp, action type, and outcome, retained for a minimum of 12 months. | Audit log schema review; sample audit trail retrieval test for each sensitive action type. |

---

## 11. Data Privacy

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-PRIV-01** | Personally Identifiable Information (PII) and health data must be accessible only to authorized roles on a need-to-know basis. | Patients can only access their own records; doctors can only access records of patients they have an active/past appointment with; admins access records only for verification/support purposes with logged justification. | Role-based access control test matrix; access-log audit sampling. |
| **NFR-PRIV-02** | Patients must be able to access, export, and request deletion of their personal data. | A data export/download function and a data-deletion request workflow are available in account settings, fulfilled within a documented SLA (e.g., 30 days). | Functional test of export/deletion workflows; SLA compliance tracking log. |
| **NFR-PRIV-03** | Live location data (doctor tracking) must be shared only with the relevant patient during an active, confirmed appointment window. | Doctor location is visible to a patient only between appointment confirmation and completion/cancellation; location sharing automatically terminates after appointment closure. | Automated test verifying location stream access is denied outside the active appointment window. |
| **NFR-PRIV-04** | Chat conversation data must be retained and purged according to a defined data retention policy. | Chat logs are retained for a defined period (e.g., 90 days post-appointment) after which they are automatically purged or archived per policy. | Scheduled data-retention job audit; verification of automated purge execution logs. |
| **NFR-PRIV-05** | Third-party processors (Cloudinary, Razorpay) must be contractually and technically bound to data protection standards consistent with applicable privacy regulations. | Data Processing Agreements (DPAs) or equivalent terms are reviewed and accepted for Cloudinary and Razorpay; only minimum necessary data is shared with each processor. | Vendor DPA documentation review; data-flow mapping audit confirming minimal data exposure to third parties. |

---

## 12. Disaster Recovery

| NFR ID | Description | Acceptance Criteria | Measurement Method |
|--------|-------------|----------------------|----------------------|
| **NFR-DR-01** | The system must define and meet a Recovery Time Objective (RTO) for full service restoration after a major outage. | RTO ≤ 4 hours for full platform restoration following a critical infrastructure failure. | Disaster recovery drill conducted at least semi-annually; drill timing logs compared against RTO target. |
| **NFR-DR-02** | The system must define and meet a Recovery Point Objective (RPO) limiting acceptable data loss. | RPO ≤ 15 minutes, achieved via MongoDB Atlas continuous backups / point-in-time recovery. | MongoDB Atlas backup configuration audit; restoration test measuring data-loss window against RPO target. |
| **NFR-DR-03** | Database backups must be automated, encrypted, and regularly tested for restorability. | Daily automated backups via MongoDB Atlas, encrypted at rest, with a successful test restoration performed at least quarterly. | Backup job logs review; quarterly restoration drill with documented success/failure outcome. |
| **NFR-DR-04** | The platform must have a documented incident response and disaster recovery runbook. | A runbook exists covering outage detection, escalation contacts, rollback procedures, and communication templates; reviewed/updated at least every 6 months. | Runbook document review and version history audit; tabletop incident-response exercise. |
| **NFR-DR-05** | Critical configuration and infrastructure must be reproducible from version-controlled definitions (Infrastructure as Code where applicable). | Deployment configurations (Vercel/Railway/Render settings, environment variable templates) are documented and version-controlled, enabling environment recreation without tribal knowledge. | Repository audit confirming IaC/config presence; disaster-simulation test recreating staging environment from version-controlled definitions. |
| **NFR-DR-06** | Payment and appointment data integrity must be verifiable and recoverable independently in case of partial data corruption. | Reconciliation scripts can detect and flag inconsistencies between Razorpay transaction records and internal Payment/Appointment collections within 24 hours of corruption. | Simulated data-corruption test (synthetic mismatch injection in staging) verifying reconciliation script detection. |

---

## 13. Summary Traceability Matrix

| Category | NFR Count | ID Prefix |
|----------|-----------|------------|
| Performance | 7 | NFR-PERF |
| Availability | 5 | NFR-AVAIL |
| Reliability | 5 | NFR-REL |
| Security | 9 | NFR-SEC |
| Scalability | 5 | NFR-SCAL |
| Maintainability | 6 | NFR-MAIN |
| Usability | 5 | NFR-USE |
| Accessibility | 4 | NFR-ACC |
| Compliance | 5 | NFR-COMP |
| Data Privacy | 5 | NFR-PRIV |
| Disaster Recovery | 6 | NFR-DR |
| **Total** | **62** | — |

---

