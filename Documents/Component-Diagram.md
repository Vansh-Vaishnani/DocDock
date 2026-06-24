# DocDock — Component Diagram Documentation

**Tagline:** "Knock-Knock, your doctor is here."
**Document Type:** System Component Architecture
**Audience:** Engineering, DevOps, Technical Reviewers
**Status:** Draft v1.0

> **Scope note:** Redis is not part of the original technology stack but is included below as a **recommended supporting component** for Socket.io horizontal scaling (pub/sub adapter), live-availability caching, and session state — per the requested component list. If the team prefers to exclude it, simply remove the Redis node and its connections; all other interactions remain valid.

---

## 1. Purpose

This document presents **component diagrams** describing the structural architecture of DocDock — how the Frontend, Backend, MongoDB, Redis, Socket.io, Cloudinary, Razorpay, and Notification Services are composed and connected. All diagrams use Mermaid `graph` syntax and will render automatically in GitHub, GitLab, VS Code (with the Mermaid extension), Notion, Obsidian, and any Mermaid-compatible markdown viewer.

---

## 2. System-Wide Component Diagram

```mermaid
graph TB
    subgraph Client["Frontend - Next.js 14 / React / Tailwind CSS"]
        WEB["Web Application<br/>Patient / Doctor / Admin Portals"]
        MAP["React Leaflet<br/>Map Component"]
        SOCKETCLIENT["Socket.io Client"]
    end

    subgraph Backend["Backend - Node.js + Express.js"]
        API["REST API Layer<br/>Express.js Controllers/Routes"]
        SOCKETSERVER["Socket.io Server<br/>Real-time Gateway"]
        NOTIFSVC["Notification Service<br/>Dispatcher"]
    end

    subgraph Data["Data and Cache Layer"]
        MONGO[("MongoDB Atlas")]
        REDIS[("Redis<br/>Cache / Pub-Sub / Sessions")]
    end

    subgraph External["External Service Providers"]
        CLOUD["Cloudinary<br/>Media Storage"]
        RAZOR["Razorpay<br/>Payment Gateway"]
        NOTIFPROVIDER["Notification Providers<br/>Push / SMS / Email"]
    end

    WEB -->|HTTPS REST calls| API
    MAP --- WEB
    SOCKETCLIENT -->|WebSocket connection| SOCKETSERVER
    WEB --- SOCKETCLIENT

    API -->|CRUD operations| MONGO
    API -->|Cache reads/writes| REDIS
    API -->|Signed upload requests| CLOUD
    API -->|Order creation / signature verification| RAZOR
    API -->|Trigger events| NOTIFSVC

    SOCKETSERVER -->|Persist messages / location logs| MONGO
    SOCKETSERVER -->|Pub/Sub adapter multi-instance sync| REDIS
    SOCKETSERVER -->|Trigger real-time events| NOTIFSVC

    NOTIFSVC -->|Dispatch notifications| NOTIFPROVIDER

    RAZOR -.->|Webhook callback| API
    CLOUD -.->|Secure asset URLs| API

    classDef client fill:#E0F2FE,stroke:#0284C7,color:#0C4A6E
    classDef backend fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef data fill:#FEF3C7,stroke:#D97706,color:#78350F
    classDef external fill:#FCE7F3,stroke:#DB2777,color:#831843

    class WEB,MAP,SOCKETCLIENT client
    class API,SOCKETSERVER,NOTIFSVC backend
    class MONGO,REDIS data
    class CLOUD,RAZOR,NOTIFPROVIDER external
```

This top-level view shows how the Frontend connects to the Backend, and how the Backend integrates with MongoDB, Redis, Cloudinary, Razorpay, and Notification Providers.

---

## 3. Backend Internal Component Diagram

```mermaid
graph TB
    subgraph Backend["Backend - Node.js + Express.js"]
        GATEWAY["API Gateway / Router"]
        AUTHCOMP["Auth Component<br/>JWT + bcrypt"]
        BOOKINGCOMP["Booking Component"]
        GEOCOMP["Geo-Search Component"]
        VERIFYCOMP["Doctor Verification Component"]
        PRESCCOMP["Prescription Component"]
        RATINGCOMP["Rating Component"]
        PAYCOMP["Payment Component"]
        SOCKETSERVER["Socket.io Server Component"]
        NOTIFSVC["Notification Component"]
    end

    subgraph Data["Data and Cache Layer"]
        MONGO[("MongoDB Atlas")]
        REDIS[("Redis")]
    end

    subgraph External["External Providers"]
        CLOUD["Cloudinary"]
        RAZOR["Razorpay"]
        NOTIFPROVIDER["Notification Providers"]
    end

    GATEWAY --> AUTHCOMP
    GATEWAY --> BOOKINGCOMP
    GATEWAY --> GEOCOMP
    GATEWAY --> VERIFYCOMP
    GATEWAY --> PRESCCOMP
    GATEWAY --> RATINGCOMP
    GATEWAY --> PAYCOMP

    AUTHCOMP --> MONGO
    AUTHCOMP -.-> REDIS
    BOOKINGCOMP --> MONGO
    GEOCOMP --> MONGO
    GEOCOMP -.->|cached availability| REDIS
    VERIFYCOMP --> MONGO
    VERIFYCOMP --> CLOUD
    PRESCCOMP --> MONGO
    PRESCCOMP --> CLOUD
    RATINGCOMP --> MONGO
    PAYCOMP --> MONGO
    PAYCOMP --> RAZOR

    BOOKINGCOMP --> SOCKETSERVER
    PAYCOMP --> NOTIFSVC
    BOOKINGCOMP --> NOTIFSVC
    SOCKETSERVER -.->|pub/sub adapter| REDIS
    SOCKETSERVER --> NOTIFSVC
    NOTIFSVC --> NOTIFPROVIDER

    classDef backend fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef data fill:#FEF3C7,stroke:#D97706,color:#78350F
    classDef external fill:#FCE7F3,stroke:#DB2777,color:#831843

    class GATEWAY,AUTHCOMP,BOOKINGCOMP,GEOCOMP,VERIFYCOMP,PRESCCOMP,RATINGCOMP,PAYCOMP,SOCKETSERVER,NOTIFSVC backend
    class MONGO,REDIS data
    class CLOUD,RAZOR,NOTIFPROVIDER external
```

This view decomposes the Backend layer into its internal components (Auth, Booking, Geo-Search, Verification, Prescription, Rating, Payment, Socket.io Server, Notification) and shows how each connects to MongoDB, Redis, and the relevant external providers.

---

## 4. Real-Time Subsystem Component Diagram

```mermaid
graph LR
    subgraph Client["Frontend"]
        PATIENTAPP["Patient Client"]
        DOCTORAPP["Doctor Client"]
    end

    subgraph RealTime["Real-Time Layer"]
        SOCKETSERVER["Socket.io Server"]
    end

    subgraph Cache["Cache Layer"]
        REDIS[("Redis<br/>Pub/Sub Adapter")]
    end

    subgraph Persistence["Persistence Layer"]
        MONGO[("MongoDB Atlas")]
    end

    subgraph Notify["Notification Layer"]
        NOTIFSVC["Notification Component"]
        NOTIFPROVIDER["Push / SMS / Email Providers"]
    end

    DOCTORAPP -->|location updates, chat messages| SOCKETSERVER
    SOCKETSERVER -->|broadcast updates| PATIENTAPP
    PATIENTAPP -->|chat messages| SOCKETSERVER
    SOCKETSERVER -->|broadcast updates| DOCTORAPP

    SOCKETSERVER <-->|cross-instance sync| REDIS
    SOCKETSERVER -->|persist chat / location logs| MONGO
    SOCKETSERVER --> NOTIFSVC
    NOTIFSVC --> NOTIFPROVIDER

    classDef client fill:#E0F2FE,stroke:#0284C7,color:#0C4A6E
    classDef realtime fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef cache fill:#FEF3C7,stroke:#D97706,color:#78350F
    classDef persist fill:#FDE68A,stroke:#B45309,color:#78350F
    classDef notify fill:#FCE7F3,stroke:#DB2777,color:#831843

    class PATIENTAPP,DOCTORAPP client
    class SOCKETSERVER realtime
    class REDIS cache
    class MONGO persist
    class NOTIFSVC,NOTIFPROVIDER notify
```

This view isolates the real-time path: Patient and Doctor clients connect to the Socket.io Server, which synchronizes across instances via Redis, persists data to MongoDB, and triggers the Notification Component for downstream alerts.

---

## 5. Component Responsibility Reference

| Component | Layer | Responsibility |
|---|---|---|
| Web Application | Frontend | Renders Patient/Doctor/Admin portals; initiates REST and WebSocket connections |
| React Leaflet Map | Frontend | Renders geo-search results and live tracking maps |
| Socket.io Client | Frontend | Maintains persistent WebSocket connection for real-time events |
| API Gateway / Router | Backend | Routes and validates all incoming REST requests |
| Auth Component | Backend | JWT issuance/verification, bcrypt password hashing, RBAC |
| Booking Component | Backend | Manages appointment lifecycle and state transitions |
| Geo-Search Component | Backend | Executes geospatial queries for nearby verified doctors |
| Doctor Verification Component | Backend | Manages admin approval workflow for doctor onboarding |
| Prescription Component | Backend | Generates and stores digital prescriptions |
| Rating Component | Backend | Captures and aggregates doctor ratings/reviews |
| Payment Component | Backend | Creates Razorpay orders, verifies payment webhooks |
| Socket.io Server | Backend | Real-time gateway for chat, location, and status broadcast events |
| Notification Component | Backend | Central dispatcher fanning out events to external notification providers |
| MongoDB Atlas | Data | System of record for all persistent application data |
| Redis | Data/Cache | Caching, session state, and Socket.io pub/sub adapter across instances |
| Cloudinary | External | Stores/serves images, verification documents, prescription PDFs |
| Razorpay | External | Processes payments; sends webhook confirmation on payment capture |
| Notification Providers | External | Delivers push notifications, SMS, and email on behalf of the platform |
