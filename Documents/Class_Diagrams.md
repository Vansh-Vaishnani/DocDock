# DocDock — Class Diagram Specification

**Document ID:** DOCDOCK-CLS-v1.0  
**Project Name:** DocDock  
**Tagline:** *"Knock-Knock, your doctor is here."*  
**Document Type:** Class Diagram Specification  
**Version:** 1.0.0  
**Status:** Draft  
**Prepared By:** Engineering Team  
**Last Updated:** June 2025  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Notation Guide](#2-notation-guide)
3. [Master Class Diagram — Full System](#3-master-class-diagram--full-system)
4. [Module 1 — User Domain](#4-module-1--user-domain)
5. [Module 2 — Appointment Domain](#5-module-2--appointment-domain)
6. [Module 3 — Clinical Domain](#6-module-3--clinical-domain)
7. [Module 4 — Financial Domain](#7-module-4--financial-domain)
8. [Module 5 — Communication Domain](#8-module-5--communication-domain)
9. [Class Specifications](#9-class-specifications)
10. [Relationship Summary](#10-relationship-summary)
11. [MongoDB Schema Mapping](#11-mongodb-schema-mapping)

---

## 1. Introduction

This document specifies the object-oriented class model for the DocDock platform. Each class represents a domain entity that maps to a MongoDB collection, an Express.js Mongoose model, and a set of service-layer methods. The diagrams capture attributes with types and visibility, methods with signatures, and all inter-class relationships including inheritance, composition, aggregation, and association.

The class model is structured across five cohesive domains:

- **User Domain** — identity, authentication, and role-specific profiles
- **Appointment Domain** — booking lifecycle and status management
- **Clinical Domain** — prescriptions, medications, and medical history
- **Financial Domain** — payments, refunds, and earnings
- **Communication Domain** — chat messages and notifications

These diagrams are the primary reference for:

- Mongoose schema definition and model design
- Service layer and repository pattern implementation
- API contract design and DTO mapping
- Database indexing strategy

---

## 2. Notation Guide

| Symbol | Meaning |
|---|---|
| `+` | Public visibility |
| `-` | Private visibility |
| `#` | Protected visibility |
| `~` | Package / internal visibility |
| `<<abstract>>` | Abstract class — cannot be instantiated |
| `<<interface>>` | Interface definition |
| `<<enumeration>>` | Enumerated type |
| `<\|--` | Inheritance (generalisation) |
| `*--` | Composition (strong ownership) |
| `o--` | Aggregation (weak ownership) |
| `-->` | Association (directed) |
| `..>` | Dependency (uses) |
| `"1"`, `"0..*"` | Multiplicity on relationship ends |

---

## 3. Master Class Diagram — Full System

The master diagram presents all classes and their relationships at a structural level, providing a bird's-eye view of the entire domain model before each module is detailed individually.

```mermaid
classDiagram
    direction TB

    %% ── Inheritance Hierarchy ──
    class BaseEntity {
        <<abstract>>
        +String _id
        +Date createdAt
        +Date updatedAt
        +Boolean isDeleted
        +save() Promise~void~
        +delete() Promise~void~
        +toJSON() Object
    }

    class User {
        <<abstract>>
        +String name
        +String email
        +String mobile
        +String passwordHash
        +String role
        +String status
        +Date lastLogin
        +Int loginAttempts
        +Date lockUntil
        +String refreshTokenHash
        +Date refreshTokenExpiry
        +comparePassword(plain) Promise~Boolean~
        +generateAccessToken() String
        +generateRefreshToken() String
        +revokeRefreshToken() Promise~void~
        +incrementLoginAttempts() Promise~void~
        +resetLoginAttempts() Promise~void~
    }

    class Patient {
        +Date dateOfBirth
        +String gender
        +String profilePhotoUrl
        +Address[] savedAddresses
        +MedicalHistory medicalHistory
        +getNearbyDoctors(lat, lng, radius) Promise~Doctor[]~
        +bookAppointment(doctorId, address) Promise~Appointment~
        +getAppointmentHistory() Promise~Appointment[]~
        +getPrescriptions() Promise~Prescription[]~
        +submitReview(appointmentId, rating, comment) Promise~Review~
        +getNotifications() Promise~Notification[]~
    }

    class Doctor {
        +String specialisation
        +String registrationNumber
        +Int experienceYears
        +Float consultationFee
        +String profilePhotoUrl
        +String degreeDocUrl
        +String govIdDocUrl
        +Boolean isAvailable
        +GeoLocation location
        +Float averageRating
        +Int reviewCount
        +Float totalEarnings
        +Float pendingPayout
        +String bio
        +String[] languagesSpoken
        +toggleAvailability() Promise~void~
        +updateLocation(lat, lng) Promise~void~
        +acceptAppointment(appointmentId) Promise~Appointment~
        +declineAppointment(appointmentId, reason) Promise~void~
        +getActiveAppointment() Promise~Appointment~
        +getEarnings() Promise~EarningsSummary~
        +updateAvailabilitySchedule(schedule) Promise~void~
    }

    class Admin {
        +String adminLevel
        +String[] permissions
        +verifyDoctor(doctorId, decision, note) Promise~void~
        +suspendUser(userId, reason) Promise~void~
        +reinstateUser(userId) Promise~void~
        +moderateReview(reviewId, action) Promise~void~
        +overrideAppointment(appointmentId, action) Promise~void~
        +getPlatformMetrics() Promise~PlatformMetrics~
        +updatePlatformConfig(config) Promise~void~
    }

    class Appointment {
        +String _id
        +String patientId
        +String doctorId
        +Address consultationAddress
        +GeoLocation consultationCoordinates
        +String status
        +Float fee
        +String razorOrderId
        +String razorPaymentId
        +Date scheduledAt
        +Date acceptedAt
        +Date arrivedAt
        +Date consultationStartedAt
        +Date completedAt
        +Date cancelledAt
        +String cancelReason
        +GeoLocation doctorLastLocation
        +Date locationUpdatedAt
        +Date paymentTimeoutAt
        +Date createdAt
        +confirm() Promise~void~
        +accept(doctorId) Promise~void~
        +decline(doctorId, reason) Promise~void~
        +markEnRoute() Promise~void~
        +markArrived(currentLat, currentLng) Promise~void~
        +startConsultation() Promise~void~
        +complete() Promise~void~
        +cancel(reason, initiator) Promise~void~
        +updateDoctorLocation(lat, lng) Promise~void~
        +isWithinGeoFence(lat, lng, radiusMetres) Boolean
        +getStatusHistory() StatusEvent[]
    }

    class Prescription {
        +String _id
        +String appointmentId
        +String doctorId
        +String patientId
        +String diagnosis
        +Medication[] medications
        +String additionalNotes
        +String followUpInstructions
        +Date followUpDate
        +String prescriptionPdfUrl
        +String qrCodeUrl
        +String verificationCode
        +Boolean isVerified
        +Date issuedAt
        +generate(data) Promise~Prescription~
        +generatePDF() Promise~String~
        +generateQRCode() Promise~String~
        +getVerificationStatus() Object
        +downloadUrl(requestingUserId) Promise~String~
    }

    class Medication {
        +String name
        +String dosage
        +String frequency
        +String duration
        +String route
        +String specialInstructions
    }

    class Review {
        +String _id
        +String appointmentId
        +String doctorId
        +String patientId
        +Int rating
        +String comment
        +String status
        +String moderationNote
        +String moderatedBy
        +Date moderatedAt
        +Date createdAt
        +submit() Promise~Review~
        +moderate(adminId, action, note) Promise~void~
        +updateDoctorAggregateRating() Promise~void~
    }

    class Payment {
        +String _id
        +String appointmentId
        +String patientId
        +String doctorId
        +String razorOrderId
        +String razorPaymentId
        +Float amount
        +String currency
        +String status
        +String paymentMethod
        +Date paidAt
        +String refundId
        +Float refundAmount
        +String refundStatus
        +Date refundInitiatedAt
        +Date refundProcessedAt
        +createOrder(appointmentId, amount) Promise~RazorOrder~
        +verifySignature(orderId, paymentId, signature) Boolean
        +capture() Promise~void~
        +initiateRefund(amount, reason) Promise~String~
        +getReceipt() Promise~Receipt~
        +calculateRefundAmount(policy) Float
    }

    class Notification {
        +String _id
        +String recipientId
        +String recipientRole
        +String type
        +String title
        +String body
        +Object data
        +Boolean isRead
        +String channel
        +Date readAt
        +Date createdAt
        +markAsRead() Promise~void~
        +markAllRead(userId) Promise~void~
        +send() Promise~void~
    }

    class Message {
        +String _id
        +String appointmentId
        +String senderId
        +String senderRole
        +String content
        +String messageType
        +String mediaUrl
        +String mediaType
        +Long fileSizeBytes
        +String status
        +Date deliveredAt
        +Date readAt
        +Date createdAt
        +send() Promise~Message~
        +markDelivered() Promise~void~
        +markRead() Promise~void~
    }

    class AuditLog {
        +String _id
        +String actorId
        +String actorRole
        +String action
        +String resourceType
        +String resourceId
        +Object previousValue
        +Object newValue
        +String ipAddress
        +String userAgent
        +Date timestamp
        +create(entry) Promise~AuditLog~
        +findByResource(type, id) Promise~AuditLog[]~
        +findByActor(actorId) Promise~AuditLog[]~
    }

    class PlatformConfig {
        +String _id
        +Int defaultSearchRadiusMetres
        +Int geoFenceRadiusMetres
        +Int appointmentTimeoutMinutes
        +Int doctorAcceptanceTimeoutSeconds
        +Float platformCommissionPercent
        +Int fullRefundWindowMinutes
        +Int partialRefundPercent
        +Boolean maintenanceMode
        +String maintenanceMessage
        +Date updatedAt
        +String updatedBy
        +getInstance() Promise~PlatformConfig~
        +update(fields, adminId) Promise~void~
    }

    %% ── Inheritance ──
    BaseEntity <|-- User
    BaseEntity <|-- Appointment
    BaseEntity <|-- Prescription
    BaseEntity <|-- Review
    BaseEntity <|-- Payment
    BaseEntity <|-- Notification
    BaseEntity <|-- Message
    BaseEntity <|-- AuditLog
    User <|-- Patient
    User <|-- Doctor
    User <|-- Admin

    %% ── Composition ──
    Prescription *-- "1..*" Medication

    %% ── Associations ──
    Patient "1" --> "0..*" Appointment : books
    Doctor "1" --> "0..*" Appointment : fulfils
    Appointment "1" --> "0..1" Prescription : generates
    Appointment "1" --> "0..1" Review : receives
    Appointment "1" --> "1" Payment : requires
    Appointment "1" --> "0..*" Message : contains
    Patient "1" --> "0..*" Notification : receives
    Doctor "1" --> "0..*" Notification : receives
    Admin "1" --> "0..*" AuditLog : generates
```

---

## 4. Module 1 — User Domain

### 4.1 Description

The User domain implements a class hierarchy with `BaseEntity` as the root persistence class and `User` as the abstract identity class. `Patient`, `Doctor`, and `Admin` inherit from `User`, each extending it with role-specific attributes and methods. This structure maps to MongoDB's single-collection inheritance pattern using a discriminator `role` field.

### 4.2 Class Diagram

```mermaid
classDiagram
    direction TB

    class BaseEntity {
        <<abstract>>
        +String _id
        +Date createdAt
        +Date updatedAt
        +Boolean isDeleted
        +save() Promise~void~
        +delete() Promise~void~
        +toJSON() Object
    }

    class UserStatus {
        <<enumeration>>
        UNVERIFIED
        VERIFIED
        PENDING_VERIFICATION
        RESUBMISSION_REQUIRED
        SUSPENDED
        REJECTED
        DEACTIVATED
    }

    class UserRole {
        <<enumeration>>
        PATIENT
        DOCTOR
        ADMIN
    }

    class User {
        <<abstract>>
        +String name
        +String email
        +String mobile
        -String passwordHash
        +UserRole role
        +UserStatus status
        +Date lastLogin
        -Int loginAttempts
        -Date lockUntil
        -String refreshTokenHash
        -Date refreshTokenExpiry
        +comparePassword(plain String) Promise~Boolean~
        +generateAccessToken() String
        +generateRefreshToken() String
        +revokeRefreshToken() Promise~void~
        +incrementLoginAttempts() Promise~void~
        +resetLoginAttempts() Promise~void~
        +isAccountLocked() Boolean
        +updateProfile(fields Object) Promise~void~
        +changePassword(current String, newPass String) Promise~void~
    }

    class Address {
        +String label
        +String line1
        +String line2
        +String city
        +String state
        +String pincode
        +GeoLocation coordinates
        +Boolean isDefault
    }

    class GeoLocation {
        +String type
        +Float[] coordinates
        +toLatLng() Object
        +distanceTo(other GeoLocation) Float
    }

    class MedicalHistory {
        +String bloodGroup
        +String[] allergies
        +String[] chronicConditions
        +String[] currentMedications
        +String[] surgicalHistory
        +String emergencyContactName
        +String emergencyContactPhone
    }

    class NotificationPreferences {
        +Boolean emailEnabled
        +Boolean pushEnabled
        +Boolean inAppEnabled
        +Boolean appointmentAlerts
        +Boolean chatAlerts
        +Boolean marketingEmails
    }

    class Patient {
        +Date dateOfBirth
        +String gender
        +String profilePhotoUrl
        +Address[] savedAddresses
        +MedicalHistory medicalHistory
        +NotificationPreferences notificationPrefs
        +getNearbyDoctors(lat Float, lng Float, radius Int, filters Object) Promise~Doctor[]~
        +bookAppointment(doctorId String, addressId String) Promise~Appointment~
        +getAppointmentHistory(filters Object) Promise~Appointment[]~
        +getPrescriptions() Promise~Prescription[]~
        +submitReview(appointmentId String, rating Int, comment String) Promise~Review~
        +getNotifications(page Int) Promise~Notification[]~
        +addSavedAddress(address Address) Promise~void~
        +removeSavedAddress(addressId String) Promise~void~
        +updateMedicalHistory(data MedicalHistory) Promise~void~
        +updateNotificationPrefs(prefs NotificationPreferences) Promise~void~
    }

    class AvailabilitySchedule {
        +String dayOfWeek
        +String startTime
        +String endTime
        +Boolean isAvailable
    }

    class EarningsSummary {
        +Float totalEarnings
        +Float pendingPayout
        +Float totalPaid
        +Int completedConsultations
        +Float averagePerConsultation
        +Object[] monthlyBreakdown
    }

    class Doctor {
        +String specialisation
        +String registrationNumber
        +Int experienceYears
        +Float consultationFee
        +String profilePhotoUrl
        +String degreeDocUrl
        +String govIdDocUrl
        +String bio
        +String[] languagesSpoken
        +Boolean isAvailable
        +GeoLocation location
        +Float averageRating
        +Int reviewCount
        +Float totalEarnings
        +Float pendingPayout
        +AvailabilitySchedule[] schedule
        +NotificationPreferences notificationPrefs
        +String bankAccountNumber
        +String bankIfscCode
        +String bankAccountName
        +String verificationNote
        +Date verifiedAt
        +String verifiedBy
        +toggleAvailability() Promise~void~
        +updateLocation(lat Float, lng Float) Promise~void~
        +acceptAppointment(appointmentId String) Promise~Appointment~
        +declineAppointment(appointmentId String, reason String) Promise~void~
        +startConsultation(appointmentId String) Promise~void~
        +completeConsultation(appointmentId String) Promise~void~
        +getActiveAppointment() Promise~Appointment~
        +getEarnings(dateRange Object) Promise~EarningsSummary~
        +updateSchedule(schedule AvailabilitySchedule[]) Promise~void~
        +getReviews(page Int) Promise~Review[]~
    }

    class AdminPermission {
        <<enumeration>>
        VERIFY_DOCTORS
        MANAGE_USERS
        MODERATE_REVIEWS
        OVERRIDE_APPOINTMENTS
        MANAGE_PAYOUTS
        VIEW_ANALYTICS
        MANAGE_CONFIG
        SUPER_ADMIN
    }

    class Admin {
        +String adminLevel
        +AdminPermission[] permissions
        +verifyDoctor(doctorId String, decision String, note String) Promise~void~
        +rejectDoctor(doctorId String, reason String) Promise~void~
        +requestResubmission(doctorId String, fields String[]) Promise~void~
        +suspendUser(userId String, role String, reason String) Promise~void~
        +reinstateUser(userId String, role String) Promise~void~
        +moderateReview(reviewId String, action String, note String) Promise~void~
        +overrideAppointment(appointmentId String, action String) Promise~void~
        +initiatePayout(doctorId String) Promise~void~
        +getPlatformMetrics(dateRange Object) Promise~PlatformMetrics~
        +updatePlatformConfig(config Object) Promise~void~
        +getAuditLog(filters Object) Promise~AuditLog[]~
        +hasPermission(permission AdminPermission) Boolean
    }

    %% Inheritance
    BaseEntity <|-- User
    User <|-- Patient
    User <|-- Doctor
    User <|-- Admin

    %% Enumerations
    User --> UserRole
    User --> UserStatus
    Admin --> AdminPermission

    %% Composition
    Patient *-- "0..*" Address
    Patient *-- "1" MedicalHistory
    Patient *-- "1" NotificationPreferences
    Doctor *-- "1" GeoLocation
    Doctor *-- "0..*" AvailabilitySchedule
    Doctor *-- "1" NotificationPreferences
    Address *-- "1" GeoLocation
```

---

## 5. Module 2 — Appointment Domain

### 5.1 Description

The Appointment domain is the operational core of DocDock. The `Appointment` class manages the full booking lifecycle through a strict status state machine. The `AppointmentStatus` enumeration defines all valid states and their transitions are enforced at the method level.

### 5.2 Class Diagram

```mermaid
classDiagram
    direction TB

    class AppointmentStatus {
        <<enumeration>>
        PENDING_PAYMENT
        CONFIRMED
        EN_ROUTE
        ARRIVED
        IN_CONSULTATION
        COMPLETED
        CANCELLED
        EXPIRED
    }

    class CancellationInitiator {
        <<enumeration>>
        PATIENT
        DOCTOR
        ADMIN
        SYSTEM
    }

    class StatusEvent {
        +AppointmentStatus from
        +AppointmentStatus to
        +String triggeredBy
        +String triggeredByRole
        +String note
        +Date timestamp
    }

    class ConsultationAddress {
        +String label
        +String line1
        +String city
        +String state
        +String pincode
        +Float lat
        +Float lng
    }

    class Appointment {
        +String _id
        +String patientId
        +String doctorId
        +ConsultationAddress consultationAddress
        +AppointmentStatus status
        +Float fee
        +Float platformCommission
        +Float doctorEarnings
        +String razorOrderId
        +String razorPaymentId
        +StatusEvent[] statusHistory
        +GeoLocation doctorLastLocation
        +Date locationUpdatedAt
        +Date paymentTimeoutAt
        +Date acceptedAt
        +Date arrivedAt
        +Date consultationStartedAt
        +Date completedAt
        +Date cancelledAt
        +String cancelReason
        +CancellationInitiator cancelledBy
        +Date createdAt
        +Date updatedAt
        +confirm() Promise~void~
        +accept(doctorId String) Promise~void~
        +decline(doctorId String, reason String) Promise~void~
        +markEnRoute() Promise~void~
        +markArrived(lat Float, lng Float) Promise~void~
        +startConsultation() Promise~void~
        +complete() Promise~void~
        +cancel(reason String, initiator CancellationInitiator) Promise~void~
        +expire() Promise~void~
        +updateDoctorLocation(lat Float, lng Float) Promise~void~
        +isWithinGeoFence(lat Float, lng Float, radiusM Int) Boolean
        +canTransitionTo(status AppointmentStatus) Boolean
        +calculateRefundAmount() Float
        +getStatusHistory() StatusEvent[]
        +getDuration() Int
        +toPatientDTO() Object
        +toDoctorDTO() Object
    }

    class AppointmentService {
        <<interface>>
        +createAppointment(patientId, doctorId, addressId) Promise~Appointment~
        +getAppointmentById(id, requestingUserId) Promise~Appointment~
        +getNearbyDoctors(lat, lng, radius, filters) Promise~Doctor[]~
        +processAcceptance(appointmentId, doctorId) Promise~void~
        +processDecline(appointmentId, doctorId, reason) Promise~void~
        +processArrival(appointmentId, lat, lng) Promise~void~
        +checkAndExpireTimeouts() Promise~void~
        +getPatientAppointments(patientId, filters) Promise~Appointment[]~
        +getDoctorAppointments(doctorId, filters) Promise~Appointment[]~
    }

    class AppointmentRepository {
        +findById(id String) Promise~Appointment~
        +findByPatient(patientId String, filters Object) Promise~Appointment[]~
        +findByDoctor(doctorId String, filters Object) Promise~Appointment[]~
        +findPendingTimeouts() Promise~Appointment[]~
        +findActiveByDoctor(doctorId String) Promise~Appointment~
        +updateStatus(id String, status AppointmentStatus, meta Object) Promise~void~
        +updateDoctorLocation(id String, lat Float, lng Float) Promise~void~
        +countByStatus(status AppointmentStatus, dateRange Object) Promise~Int~
    }

    Appointment --> AppointmentStatus
    Appointment --> CancellationInitiator
    Appointment *-- "0..*" StatusEvent
    Appointment *-- "1" ConsultationAddress
    AppointmentService ..> Appointment
    AppointmentRepository ..> Appointment
    StatusEvent --> AppointmentStatus
```

---

## 6. Module 3 — Clinical Domain

### 6.1 Description

The Clinical domain encompasses `Prescription` and its composed `Medication` items, as well as the `Review` class which captures post-consultation patient feedback. The `Prescription` class handles PDF generation, QR code embedding, and verification — while `Review` manages the rating lifecycle and aggregate score maintenance.

### 6.2 Class Diagram

```mermaid
classDiagram
    direction TB

    class MedicationRoute {
        <<enumeration>>
        ORAL
        TOPICAL
        INTRAVENOUS
        INTRAMUSCULAR
        SUBCUTANEOUS
        INHALATION
        SUBLINGUAL
        NASAL
        OPHTHALMIC
        OTIC
    }

    class Medication {
        +String name
        +String genericName
        +String dosage
        +String frequency
        +String duration
        +MedicationRoute route
        +String specialInstructions
        +Boolean withFood
    }

    class Prescription {
        +String _id
        +String appointmentId
        +String doctorId
        +String patientId
        +String patientName
        +Date patientDateOfBirth
        +String patientBloodGroup
        +String diagnosis
        +String[] symptoms
        +Medication[] medications
        +String additionalNotes
        +String followUpInstructions
        +Date followUpDate
        +String prescriptionPdfUrl
        +String qrCodeUrl
        +String verificationCode
        +Boolean isVerified
        +Boolean isImmutable
        +Date issuedAt
        +generate(data PrescriptionData) Promise~Prescription~
        +generatePDF() Promise~String~
        +generateQRCode() Promise~String~
        +uploadToCloudinary(pdfBuffer Buffer) Promise~String~
        +freeze() void
        +verify(code String) Promise~VerificationResult~
        +getDownloadUrl(requestingUserId String) Promise~String~
        +getPublicVerificationData() VerificationResult
        +toPatientDTO() Object
        +toDoctorDTO() Object
    }

    class VerificationResult {
        +Boolean isValid
        +String prescriptionId
        +String doctorName
        +String doctorRegistrationNumber
        +String patientName
        +Date issuedAt
        +String diagnosis
        +String status
    }

    class PrescriptionData {
        +String diagnosis
        +String[] symptoms
        +Medication[] medications
        +String additionalNotes
        +String followUpInstructions
        +Date followUpDate
    }

    class ReviewStatus {
        <<enumeration>>
        PUBLISHED
        FLAGGED
        REMOVED
        ARCHIVED
    }

    class Review {
        +String _id
        +String appointmentId
        +String doctorId
        +String patientId
        +String patientName
        +String doctorName
        +Int rating
        +String comment
        +ReviewStatus status
        +String moderationNote
        +String moderatedBy
        +Date moderatedAt
        +Boolean isAnonymous
        +Date createdAt
        +Date updatedAt
        +submit() Promise~Review~
        +moderate(adminId String, action String, note String) Promise~void~
        +publish() Promise~void~
        +flag(reason String) Promise~void~
        +remove(adminId String, reason String) Promise~void~
        +updateDoctorAggregateRating() Promise~void~
        +toPublicDTO() Object
    }

    class ReviewService {
        <<interface>>
        +submitReview(patientId, appointmentId, rating, comment) Promise~Review~
        +getDoctorReviews(doctorId, page, filters) Promise~Review[]~
        +moderateReview(adminId, reviewId, action, note) Promise~void~
        +calculateAggregateRating(doctorId) Promise~Float~
        +hasReviewedAppointment(patientId, appointmentId) Promise~Boolean~
    }

    class PrescriptionService {
        <<interface>>
        +generatePrescription(doctorId, appointmentId, data) Promise~Prescription~
        +getPrescriptionById(id, userId) Promise~Prescription~
        +getDownloadUrl(prescriptionId, userId) Promise~String~
        +verifyPrescription(verificationCode) Promise~VerificationResult~
        +getPatientPrescriptions(patientId) Promise~Prescription[]~
    }

    Prescription *-- "1..*" Medication
    Prescription --> VerificationResult
    Prescription ..> PrescriptionData
    Medication --> MedicationRoute
    Review --> ReviewStatus
    ReviewService ..> Review
    PrescriptionService ..> Prescription
```

---

## 7. Module 4 — Financial Domain

### 7.1 Description

The Financial domain manages all monetary operations through the `Payment` class, including Razorpay order creation, HMAC signature verification, capture recording, refund initiation, and payout processing. The `Payout` class manages doctor earnings disbursement and the `Receipt` value object represents generated payment receipts.

### 7.2 Class Diagram

```mermaid
classDiagram
    direction TB

    class PaymentStatus {
        <<enumeration>>
        PENDING
        CAPTURED
        FAILED
        REFUND_PENDING
        REFUND_PROCESSED
        PARTIALLY_REFUNDED
    }

    class RefundStatus {
        <<enumeration>>
        NOT_APPLICABLE
        PENDING
        INITIATED
        PROCESSED
        FAILED
    }

    class PaymentMethod {
        <<enumeration>>
        UPI
        CREDIT_CARD
        DEBIT_CARD
        NET_BANKING
        WALLET
        EMI
    }

    class PayoutStatus {
        <<enumeration>>
        PENDING
        PROCESSING
        COMPLETED
        FAILED
    }

    class Payment {
        +String _id
        +String appointmentId
        +String patientId
        +String doctorId
        +String razorOrderId
        +String razorPaymentId
        +Float amount
        +String currency
        +PaymentStatus status
        +PaymentMethod paymentMethod
        +Float platformCommission
        +Float doctorEarnings
        +Date paidAt
        +String refundId
        +Float refundAmount
        +RefundStatus refundStatus
        +String refundReason
        +Date refundInitiatedAt
        +Date refundProcessedAt
        +Date createdAt
        +createRazorOrder(appointmentId String, amount Float) Promise~RazorOrder~
        +verifySignature(orderId String, paymentId String, signature String) Boolean
        +capture(razorPaymentId String, method PaymentMethod) Promise~void~
        +initiateRefund(amount Float, reason String) Promise~String~
        +processRefundWebhook(refundId String) Promise~void~
        +calculatePlatformCommission(commissionPct Float) Float
        +calculateDoctorEarnings() Float
        +getReceipt() Promise~Receipt~
        +calculateRefundAmount(policy RefundPolicy) Float
        +toPatientDTO() Object
    }

    class RazorOrder {
        +String id
        +Float amount
        +String currency
        +String status
        +String receipt
        +Object notes
    }

    class Receipt {
        +String receiptId
        +String appointmentId
        +String patientName
        +String doctorName
        +Float amount
        +String currency
        +String razorPaymentId
        +PaymentMethod paymentMethod
        +Date paidAt
        +String receiptUrl
    }

    class RefundPolicy {
        +Int fullRefundWindowMinutes
        +Int partialRefundPercent
        +Boolean noRefundAfterArrival
        +calculateRefund(appointment Appointment, amount Float) Float
    }

    class Payout {
        +String _id
        +String doctorId
        +Float grossAmount
        +Float platformCommission
        +Float netAmount
        +Int consultationCount
        +String[] appointmentIds
        +PayoutStatus status
        +String transferId
        +String bankReference
        +Date periodStart
        +Date periodEnd
        +Date initiatedAt
        +Date completedAt
        +String initiatedBy
        +String failureReason
        +initiate(adminId String) Promise~void~
        +markCompleted(transferId String) Promise~void~
        +markFailed(reason String) Promise~void~
        +calculateNetAmount() Float
    }

    class PaymentService {
        <<interface>>
        +createOrder(appointmentId String, patientId String) Promise~RazorOrder~
        +verifyAndCapture(appointmentId, razorPaymentId, orderId, signature) Promise~Payment~
        +initiateRefund(appointmentId String, reason String) Promise~String~
        +handleRefundWebhook(payload Object, signature String) Promise~void~
        +getPaymentByAppointment(appointmentId String) Promise~Payment~
        +generateReceipt(appointmentId String) Promise~Receipt~
        +processWeeklyPayouts() Promise~Payout[]~
        +getDoctorEarnings(doctorId String, dateRange Object) Promise~Object~
    }

    Payment --> PaymentStatus
    Payment --> RefundStatus
    Payment --> PaymentMethod
    Payment --> RazorOrder
    Payment --> Receipt
    Payment ..> RefundPolicy
    Payout --> PayoutStatus
    PaymentService ..> Payment
    PaymentService ..> Payout
    PaymentService ..> RefundPolicy
```

---

## 8. Module 5 — Communication Domain

### 8.1 Description

The Communication domain covers the `Message` class for real-time in-appointment chat and the `Notification` class for system-generated alerts across all channels (in-app, push, email). The `NotificationFactory` implements the factory pattern to construct the appropriate notification type based on the triggering event.

### 8.2 Class Diagram

```mermaid
classDiagram
    direction TB

    class MessageType {
        <<enumeration>>
        TEXT
        IMAGE
        FILE
        SYSTEM
    }

    class MessageStatus {
        <<enumeration>>
        SENT
        DELIVERED
        READ
        FAILED
    }

    class NotificationType {
        <<enumeration>>
        APPOINTMENT_CONFIRMED
        APPOINTMENT_CANCELLED
        DOCTOR_EN_ROUTE
        DOCTOR_ARRIVED
        CONSULTATION_STARTED
        CONSULTATION_COMPLETED
        PRESCRIPTION_ISSUED
        PAYMENT_RECEIVED
        PAYMENT_FAILED
        REFUND_INITIATED
        REFUND_PROCESSED
        REVIEW_REQUESTED
        DOCTOR_VERIFIED
        DOCTOR_REJECTED
        ACCOUNT_SUSPENDED
        NEW_CHAT_MESSAGE
        SYSTEM_ALERT
    }

    class NotificationChannel {
        <<enumeration>>
        IN_APP
        PUSH
        EMAIL
        SMS
    }

    class Message {
        +String _id
        +String appointmentId
        +String senderId
        +String senderRole
        +String senderName
        +String senderAvatarUrl
        +String content
        +MessageType messageType
        +String mediaUrl
        +String mediaPublicId
        +String mediaType
        +Long fileSizeBytes
        +String fileName
        +MessageStatus status
        +Date deliveredAt
        +Date readAt
        +Date createdAt
        +send() Promise~Message~
        +markDelivered() Promise~void~
        +markRead() Promise~void~
        +uploadMedia(file File) Promise~String~
        +toDTO() Object
        +isFromPatient() Boolean
        +isFromDoctor() Boolean
    }

    class ChatRoom {
        +String appointmentId
        +String patientId
        +String doctorId
        +Boolean isActive
        +Date activatedAt
        +Date closedAt
        +getMessage(page Int, limit Int) Promise~Message[]~
        +sendMessage(senderId String, content String, type MessageType) Promise~Message~
        +markAllRead(userId String) Promise~void~
        +close() Promise~void~
        +getUnreadCount(userId String) Promise~Int~
    }

    class Notification {
        +String _id
        +String recipientId
        +String recipientRole
        +NotificationType type
        +String title
        +String body
        +Object data
        +NotificationChannel channel
        +Boolean isRead
        +Date readAt
        +String deepLinkPath
        +Date createdAt
        +markAsRead() Promise~void~
        +send() Promise~void~
        +toDTO() Object
    }

    class NotificationFactory {
        <<abstract>>
        +createAppointmentConfirmed(patientId, doctorId, appointmentId) Notification[]
        +createDoctorEnRoute(patientId, appointmentId, eta) Notification[]
        +createDoctorArrived(patientId, appointmentId) Notification[]
        +createConsultationCompleted(patientId, doctorId, appointmentId) Notification[]
        +createPrescriptionIssued(patientId, appointmentId, prescriptionId) Notification[]
        +createPaymentReceived(patientId, appointmentId, amount) Notification[]
        +createRefundInitiated(patientId, amount, refundId) Notification[]
        +createDoctorVerified(doctorId) Notification[]
        +createReviewRequest(patientId, appointmentId) Notification[]
        +create(type NotificationType, recipientId, data Object) Notification
    }

    class NotificationService {
        <<interface>>
        +send(notification Notification) Promise~void~
        +sendBulk(notifications Notification[]) Promise~void~
        +sendInApp(notification Notification) Promise~void~
        +sendPush(notification Notification) Promise~void~
        +sendEmail(notification Notification) Promise~void~
        +markRead(notificationId String, userId String) Promise~void~
        +markAllRead(userId String) Promise~void~
        +getUnread(userId String, role String) Promise~Notification[]~
        +getAll(userId String, page Int) Promise~Notification[]~
    }

    class SocketEventEmitter {
        <<interface>>
        +emitToRoom(room String, event String, data Object) void
        +emitToUser(userId String, event String, data Object) void
        +emitToRole(role String, event String, data Object) void
        +joinRoom(socketId String, room String) void
        +leaveRoom(socketId String, room String) void
        +broadcastAvailabilityUpdate(doctorId String, isAvailable Boolean, location GeoLocation) void
        +broadcastLocationUpdate(appointmentId String, lat Float, lng Float) void
    }

    Message --> MessageType
    Message --> MessageStatus
    ChatRoom *-- "0..*" Message
    Notification --> NotificationType
    Notification --> NotificationChannel
    NotificationFactory ..> Notification
    NotificationService ..> Notification
    NotificationService ..> NotificationFactory
    NotificationService ..> SocketEventEmitter
```

---

## 9. Class Specifications

Detailed attribute and method reference for each primary class.

### 9.1 BaseEntity

| Member | Type | Visibility | Description |
|---|---|---|---|
| `_id` | `String` | `+` | MongoDB ObjectId as string |
| `createdAt` | `Date` | `+` | Auto-set on document creation (Mongoose timestamps) |
| `updatedAt` | `Date` | `+` | Auto-updated on every save |
| `isDeleted` | `Boolean` | `+` | Soft delete flag (default: false) |
| `save()` | `Promise<void>` | `+` | Persist document to MongoDB |
| `delete()` | `Promise<void>` | `+` | Soft-delete document (sets isDeleted: true) |
| `toJSON()` | `Object` | `+` | Serialise document, stripping private fields |

### 9.2 User (Abstract)

| Member | Type | Visibility | Description |
|---|---|---|---|
| `name` | `String` | `+` | Full legal name |
| `email` | `String` | `+` | Unique, indexed, lowercase |
| `mobile` | `String` | `+` | Unique, E.164 format |
| `passwordHash` | `String` | `-` | bcrypt hash, never serialised to JSON |
| `role` | `UserRole` | `+` | Discriminator field: patient / doctor / admin |
| `status` | `UserStatus` | `+` | Account lifecycle status |
| `lastLogin` | `Date` | `+` | Timestamp of most recent successful login |
| `loginAttempts` | `Int` | `-` | Consecutive failed login count |
| `lockUntil` | `Date` | `-` | Lockout expiry; null if not locked |
| `refreshTokenHash` | `String` | `-` | SHA-256 hash of current refresh token |
| `refreshTokenExpiry` | `Date` | `-` | Expiry of current refresh token |
| `comparePassword(plain)` | `Promise<Boolean>` | `+` | bcrypt.compare against stored hash |
| `generateAccessToken()` | `String` | `+` | Signs JWT; exp: 15 min |
| `generateRefreshToken()` | `String` | `+` | UUID v4; stores hash in DB |
| `revokeRefreshToken()` | `Promise<void>` | `+` | Nullifies token hash and expiry |
| `incrementLoginAttempts()` | `Promise<void>` | `+` | Increments counter; locks after 5 |
| `resetLoginAttempts()` | `Promise<void>` | `+` | Resets counter and lock on success |
| `isAccountLocked()` | `Boolean` | `+` | True if loginAttempts ≥ 5 and lockUntil > now |

### 9.3 Appointment

| Member | Type | Visibility | Description |
|---|---|---|---|
| `status` | `AppointmentStatus` | `+` | Current lifecycle status |
| `fee` | `Float` | `+` | Doctor's consultation fee at time of booking |
| `platformCommission` | `Float` | `+` | Calculated platform fee (fee × commissionPct) |
| `doctorEarnings` | `Float` | `+` | fee − platformCommission |
| `doctorLastLocation` | `GeoLocation` | `+` | Latest broadcasted doctor position |
| `paymentTimeoutAt` | `Date` | `+` | 10-minute booking payment deadline |
| `statusHistory` | `StatusEvent[]` | `+` | Immutable log of all status transitions |
| `canTransitionTo(status)` | `Boolean` | `+` | Validates state machine rules |
| `isWithinGeoFence(lat, lng, r)` | `Boolean` | `+` | Haversine check for arrival confirmation |
| `calculateRefundAmount()` | `Float` | `+` | Policy-based refund calculation |
| `getDuration()` | `Int` | `+` | Consultation duration in minutes |

### 9.4 Payment

| Member | Type | Visibility | Description |
|---|---|---|---|
| `razorOrderId` | `String` | `+` | Razorpay Order ID (prefix: `order_`) |
| `razorPaymentId` | `String` | `+` | Razorpay Payment ID (prefix: `pay_`) |
| `status` | `PaymentStatus` | `+` | Current payment lifecycle status |
| `platformCommission` | `Float` | `+` | Platform's cut from the transaction |
| `doctorEarnings` | `Float` | `+` | Amount owed to doctor post-commission |
| `refundId` | `String` | `+` | Razorpay Refund ID (prefix: `rfnd_`) |
| `verifySignature(oId, pId, sig)` | `Boolean` | `+` | HMAC-SHA256 via timingSafeEqual |
| `calculatePlatformCommission(pct)` | `Float` | `+` | amount × (pct / 100) |
| `calculateDoctorEarnings()` | `Float` | `+` | amount − platformCommission |

---

## 10. Relationship Summary

### 10.1 Inheritance Relationships

```mermaid
classDiagram
    direction TB

    class BaseEntity {
        <<abstract>>
    }
    class User {
        <<abstract>>
    }
    class Patient
    class Doctor
    class Admin

    BaseEntity <|-- User : extends
    BaseEntity <|-- Appointment : extends
    BaseEntity <|-- Prescription : extends
    BaseEntity <|-- Review : extends
    BaseEntity <|-- Payment : extends
    BaseEntity <|-- Notification : extends
    BaseEntity <|-- Message : extends
    BaseEntity <|-- AuditLog : extends
    User <|-- Patient : extends
    User <|-- Doctor : extends
    User <|-- Admin : extends
```

### 10.2 Association and Composition Map

| Relationship | From | To | Multiplicity | Type | Description |
|---|---|---|---|---|---|
| books | Patient | Appointment | 1 → 0..* | Association | Patient initiates appointments |
| fulfils | Doctor | Appointment | 1 → 0..* | Association | Doctor services appointments |
| generates | Appointment | Prescription | 1 → 0..1 | Association | One prescription per appointment |
| receives | Appointment | Review | 1 → 0..1 | Association | One review per appointment |
| requires | Appointment | Payment | 1 → 1 | Association | Every appointment has a payment |
| contains | Appointment | Message | 1 → 0..* | Aggregation | Chat history per appointment |
| composed of | Prescription | Medication | 1 → 1..* | Composition | Medications exist within prescription |
| hosted by | ChatRoom | Message | 1 → 0..* | Composition | Messages belong to a chat room |
| receives | Patient | Notification | 1 → 0..* | Association | Patient notification delivery |
| receives | Doctor | Notification | 1 → 0..* | Association | Doctor notification delivery |
| generates | Admin | AuditLog | 1 → 0..* | Association | All admin actions are logged |

### 10.3 Dependency Relationships

| From | To | Description |
|---|---|---|
| `AppointmentService` | `Appointment` | Service orchestrates appointment operations |
| `AppointmentService` | `Doctor` | Queries available doctors |
| `PaymentService` | `Payment` | Creates and captures payments |
| `PaymentService` | `Payout` | Manages doctor payout records |
| `ReviewService` | `Review` | Manages review lifecycle |
| `ReviewService` | `Doctor` | Updates aggregate rating |
| `PrescriptionService` | `Prescription` | Generates and serves prescriptions |
| `NotificationService` | `Notification` | Dispatches notifications |
| `NotificationFactory` | `Notification` | Constructs typed notifications |
| `NotificationService` | `SocketEventEmitter` | Real-time in-app delivery |

---

## 11. MongoDB Schema Mapping

Each class maps to a MongoDB collection with the following conventions.

| Class | Collection Name | Key Indexes | Notes |
|---|---|---|---|
| `Patient` | `users` | `email (unique)`, `mobile (unique)`, `role` | Shared collection with Doctor / Admin via discriminator |
| `Doctor` | `users` | `email (unique)`, `registrationNumber (unique)`, `location (2dsphere)`, `isAvailable`, `status` | 2dsphere index enables `$near` geo-queries |
| `Admin` | `users` | `email (unique)` | Role discriminator: `admin` |
| `Appointment` | `appointments` | `patientId`, `doctorId`, `status`, `paymentTimeoutAt (TTL)`, `createdAt` | TTL index on `paymentTimeoutAt` auto-expires stale bookings |
| `Prescription` | `prescriptions` | `appointmentId (unique)`, `patientId`, `verificationCode (unique)` | `isImmutable: true` enforced at schema level |
| `Review` | `reviews` | `appointmentId (unique)`, `doctorId`, `status` | Unique on appointmentId prevents duplicate reviews |
| `Payment` | `payments` | `appointmentId (unique)`, `razorOrderId`, `razorPaymentId`, `refundId` | All Razorpay IDs indexed for webhook lookup |
| `Payout` | `payouts` | `doctorId`, `status`, `periodStart` | Compound index for weekly batch queries |
| `Notification` | `notifications` | `recipientId`, `isRead`, `createdAt` | TTL index: auto-delete after 90 days |
| `Message` | `messages` | `appointmentId`, `createdAt` | Compound index for pagination queries |
| `AuditLog` | `auditlogs` | `actorId`, `resourceType`, `resourceId`, `timestamp` | Immutable — no update or delete operations |
| `PlatformConfig` | `configs` | `_id (singleton)` | Single document; fetched via `getInstance()` |

### Index Strategy Notes

- The `users.location` field on Doctor documents uses a **GeoJSON Point** type with a `2dsphere` index to support MongoDB's `$near` and `$geoWithin` operators for the nearby doctor search.
- `appointments.paymentTimeoutAt` carries a **TTL index** with `expireAfterSeconds: 0`, which MongoDB evaluates against the field value itself — appointments in `pending_payment` state are automatically expired by MongoDB if not converted to `confirmed` within the window.
- All Razorpay identifiers (`razorOrderId`, `razorPaymentId`, `refundId`) are individually indexed to enable O(1) lookup during webhook processing.
- `reviews.appointmentId` carries a **sparse unique index** to enforce the one-review-per-appointment constraint at the database layer, not just the application layer.

---

*End of DocDock Class Diagram Specification v1.0*  
*© 2025 DocDock. All rights reserved.*
