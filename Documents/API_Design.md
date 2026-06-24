# DocDock — API Design Documentation

> **Project:** DocDock — Doctor-on-Demand Healthcare Platform
> **Version:** v1.0.0
> **Base URL:** `https://api.docdock.in/api/v1`
> **Protocol:** HTTPS only
> **Standard:** REST — JSON over HTTP

---

## Table of Contents

1. [Conventions](#conventions)
2. [Authentication & Authorization](#authentication--authorization)
3. [Error Format](#error-format)
4. [Auth APIs](#1-auth-apis)
5. [Doctor APIs](#2-doctor-apis)
6. [Patient APIs](#3-patient-apis)
7. [Appointment APIs](#4-appointment-apis)
8. [Tracking APIs](#5-tracking-apis)
9. [Chat APIs](#6-chat-apis)
10. [Prescription APIs](#7-prescription-apis)
11. [Payment APIs](#8-payment-apis)
12. [Admin APIs](#9-admin-apis)
13. [WebSocket Events Reference](#10-websocket-events-reference)
14. [Rate Limiting](#11-rate-limiting)
15. [HTTP Status Code Reference](#12-http-status-code-reference)

---

## Conventions

### Request Headers

| Header            | Required  | Value                                      |
|-------------------|-----------|--------------------------------------------|
| `Content-Type`    | Yes       | `application/json`                         |
| `Authorization`   | Varies    | `Bearer <access_token>`                    |
| `X-Request-ID`    | Optional  | UUID v4 — for distributed tracing          |
| `Accept-Language` | Optional  | `en-IN` (default)                          |

### Response Envelope

All responses follow a consistent envelope:

```json
{
  "success": true,
  "message": "Human-readable status message",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

`meta` is only included in paginated list responses.

### Pagination Query Parameters

| Parameter | Type    | Default | Description              |
|-----------|---------|---------|--------------------------|
| `page`    | Integer | `1`     | Page number              |
| `limit`   | Integer | `10`    | Items per page (max 50)  |
| `sort`    | String  | varies  | Field to sort by         |
| `order`   | String  | `desc`  | `asc` or `desc`          |

### ID Format

All resource IDs are MongoDB `ObjectId` strings (24-character hex).

### Date Format

All dates use **ISO 8601** format: `"2024-11-15T10:30:00.000Z"`

### Authorization Roles

| Role      | Abbreviation | Description                        |
|-----------|--------------|------------------------------------|
| Patient   | `P`          | Registered and verified patient    |
| Doctor    | `D`          | Verified doctor                    |
| Admin     | `A`          | Platform administrator             |
| Any Auth  | `*`          | Any authenticated user             |

---

## Authentication & Authorization

DocDock uses **JWT (JSON Web Tokens)** with a dual-token strategy:

| Token           | Expiry   | Storage              | Purpose                     |
|-----------------|----------|----------------------|-----------------------------|
| `access_token`  | 15 min   | Memory / HttpOnly cookie | API request authorization |
| `refresh_token` | 7 days   | HttpOnly cookie      | Obtain new access token     |

All protected routes require the `Authorization: Bearer <access_token>` header.

Role-based access is enforced at the middleware layer using the `role` claim embedded in the JWT payload:

```json
{
  "sub": "64f1a2b3c4d5e6f7a8b9c0d1",
  "role": "doctor",
  "iat": 1700000000,
  "exp": 1700000900
}
```

---

## Error Format

All errors return a consistent structure:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "details": [ ]
  }
}
```

### Validation Error Example

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "phone", "message": "Must follow E.164 format" }
    ]
  }
}
```

---

## 1. Auth APIs

**Base path:** `/auth`

---

### 1.1 Register User

**Route:** `POST /auth/register`
**Auth:** None

**Request Body:**

```json
{
  "fullName": "Arjun Sharma",
  "email": "arjun@example.com",
  "phone": "+919876543210",
  "password": "SecurePass@123",
  "role": "patient"
}
```

| Field      | Type   | Required | Validation                                  |
|------------|--------|----------|---------------------------------------------|
| `fullName` | String | Yes      | 2–100 characters                            |
| `email`    | String | Yes      | Valid email, unique                         |
| `phone`    | String | Yes      | E.164 format, unique                        |
| `password` | String | Yes      | Min 8 chars, 1 uppercase, 1 number, 1 symbol|
| `role`     | String | Yes      | Enum: `"patient"` \| `"doctor"`             |

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "arjun@example.com",
    "role": "patient",
    "isVerified": false
  }
}
```

**Error Responses:**

| Status | Code                  | Scenario                         |
|--------|-----------------------|----------------------------------|
| 400    | `VALIDATION_ERROR`    | Invalid field values             |
| 409    | `EMAIL_ALREADY_EXISTS`| Email already registered         |
| 409    | `PHONE_ALREADY_EXISTS`| Phone already registered         |

---

### 1.2 Verify Email

**Route:** `GET /auth/verify-email?token=<token>`
**Auth:** None

**Query Parameters:**

| Parameter | Type   | Required | Description                   |
|-----------|--------|----------|-------------------------------|
| `token`   | String | Yes      | Email verification token      |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "isVerified": true
  }
}
```

**Error Responses:**

| Status | Code                    | Scenario                    |
|--------|-------------------------|-----------------------------|
| 400    | `INVALID_TOKEN`         | Token malformed or expired  |
| 404    | `USER_NOT_FOUND`        | No user for this token      |

---

### 1.3 Login

**Route:** `POST /auth/login`
**Auth:** None

**Request Body:**

```json
{
  "email": "arjun@example.com",
  "password": "SecurePass@123"
}
```

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | String | Yes      |
| `password` | String | Yes      |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Arjun Sharma",
      "email": "arjun@example.com",
      "role": "patient",
      "avatar": "https://res.cloudinary.com/docdock/image/upload/v1/avatars/arjun.jpg",
      "isVerified": true
    }
  }
}
```

**Error Responses:**

| Status | Code                     | Scenario                        |
|--------|--------------------------|---------------------------------|
| 400    | `VALIDATION_ERROR`       | Missing required fields         |
| 401    | `INVALID_CREDENTIALS`    | Wrong email or password         |
| 403    | `EMAIL_NOT_VERIFIED`     | Account not verified            |
| 403    | `ACCOUNT_SUSPENDED`      | Account deactivated by admin    |

---

### 1.4 Refresh Access Token

**Route:** `POST /auth/refresh-token`
**Auth:** None (uses `refreshToken` in body)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Token refreshed.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

| Status | Code                  | Scenario                         |
|--------|-----------------------|----------------------------------|
| 401    | `INVALID_TOKEN`       | Refresh token invalid or expired |
| 401    | `TOKEN_REUSED`        | Token already used (rotation)    |

---

### 1.5 Logout

**Route:** `POST /auth/logout`
**Auth:** `*`

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### 1.6 Forgot Password

**Route:** `POST /auth/forgot-password`
**Auth:** None

**Request Body:**

```json
{
  "email": "arjun@example.com"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Password reset link sent to your email."
}
```

> Always returns 200 even if the email doesn't exist, to prevent email enumeration attacks.

---

### 1.7 Reset Password

**Route:** `POST /auth/reset-password`
**Auth:** None

**Request Body:**

```json
{
  "token": "c4d5e6f7a8b9c0d1e2f3a4b5",
  "newPassword": "NewSecurePass@456"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

**Error Responses:**

| Status | Code                  | Scenario                      |
|--------|-----------------------|-------------------------------|
| 400    | `INVALID_TOKEN`       | Token expired or already used |
| 400    | `VALIDATION_ERROR`    | Password does not meet policy |

---

### 1.8 Update FCM Token

**Route:** `PATCH /auth/fcm-token`
**Auth:** `*`

**Request Body:**

```json
{
  "fcmToken": "eExjP3kF9a:APA91bH..."
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "FCM token updated."
}
```

---

## 2. Doctor APIs

**Base path:** `/doctors`

---

### 2.1 Create Doctor Profile

**Route:** `POST /doctors/profile`
**Auth:** `D` — Doctor (newly registered, no profile yet)

**Request Body:** `multipart/form-data`

| Field                  | Type     | Required | Description                          |
|------------------------|----------|----------|--------------------------------------|
| `licenseNumber`        | String   | Yes      | Unique medical license number        |
| `specialization`       | String   | Yes      | e.g., "General Physician"            |
| `qualifications`       | String[] | Yes      | e.g., `["MBBS","MD"]`               |
| `experience`           | Integer  | Yes      | Years of experience                  |
| `bio`                  | String   | No       | Max 500 characters                   |
| `languages`            | String[] | No       | e.g., `["English","Telugu"]`         |
| `consultationFee`      | Number   | Yes      | In INR                               |
| `slotDuration`         | Integer  | No       | Minutes per slot (default: 30)       |
| `address.street`       | String   | Yes      |                                      |
| `address.city`         | String   | Yes      |                                      |
| `address.state`        | String   | Yes      |                                      |
| `address.pincode`      | String   | Yes      |                                      |
| `location.coordinates` | Number[] | Yes      | `[longitude, latitude]`              |
| `availabilitySchedule` | Object   | Yes      | Weekly schedule object               |
| `licenseDocument`      | File     | Yes      | PDF or image of license              |
| `profilePhoto`         | File     | No       | Doctor's profile photo               |

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Doctor profile created. Pending admin verification.",
  "data": {
    "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
    "verificationStatus": "pending",
    "specialization": "General Physician",
    "consultationFee": 500
  }
}
```

**Error Responses:**

| Status | Code                        | Scenario                              |
|--------|-----------------------------|---------------------------------------|
| 400    | `VALIDATION_ERROR`          | Missing or invalid fields             |
| 409    | `PROFILE_ALREADY_EXISTS`    | Doctor profile already created        |
| 409    | `LICENSE_ALREADY_REGISTERED`| License number already in system      |

---

### 2.2 Get Doctor Profile (Self)

**Route:** `GET /doctors/profile/me`
**Auth:** `D`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "fullName": "Dr. Priya Mehta",
    "avatar": "https://res.cloudinary.com/docdock/...",
    "specialization": "Cardiologist",
    "qualifications": ["MBBS", "MD", "DM"],
    "experience": 8,
    "bio": "Experienced cardiologist with focus on preventive care.",
    "languages": ["English", "Hindi", "Telugu"],
    "consultationFee": 800,
    "slotDuration": 30,
    "avgRating": 4.7,
    "totalReviews": 124,
    "isAvailable": true,
    "verificationStatus": "verified",
    "location": {
      "type": "Point",
      "coordinates": [78.4867, 17.3850]
    },
    "address": {
      "street": "Road No. 12, Banjara Hills",
      "city": "Hyderabad",
      "state": "Telangana",
      "pincode": "500034"
    },
    "availabilitySchedule": {
      "monday": { "start": "09:00", "end": "17:00", "isOff": false },
      "sunday": { "start": null, "end": null, "isOff": true }
    },
    "documents": {
      "licenseDocument": "https://res.cloudinary.com/docdock/...",
      "profilePhoto": "https://res.cloudinary.com/docdock/..."
    },
    "createdAt": "2024-09-01T08:00:00.000Z"
  }
}
```

---

### 2.3 Get Doctor Profile (Public)

**Route:** `GET /doctors/:doctorId`
**Auth:** `P`

**Path Parameters:**

| Parameter  | Type   | Description       |
|------------|--------|-------------------|
| `doctorId` | String | Doctor's ObjectId |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
    "fullName": "Dr. Priya Mehta",
    "avatar": "https://res.cloudinary.com/docdock/...",
    "specialization": "Cardiologist",
    "qualifications": ["MBBS", "MD", "DM"],
    "experience": 8,
    "bio": "Experienced cardiologist with focus on preventive care.",
    "languages": ["English", "Hindi", "Telugu"],
    "consultationFee": 800,
    "avgRating": 4.7,
    "totalReviews": 124,
    "isAvailable": true,
    "distanceKm": 3.2,
    "address": {
      "city": "Hyderabad",
      "state": "Telangana"
    }
  }
}
```

> Note: Full address and coordinates are not exposed in the public profile endpoint.

**Error Responses:**

| Status | Code              | Scenario              |
|--------|-------------------|-----------------------|
| 404    | `DOCTOR_NOT_FOUND`| Doctor ID not found   |

---

### 2.4 Update Doctor Profile

**Route:** `PATCH /doctors/profile/me`
**Auth:** `D`

**Request Body:** (all fields optional)

```json
{
  "bio": "Updated bio text.",
  "consultationFee": 900,
  "languages": ["English", "Telugu", "Tamil"],
  "availabilitySchedule": {
    "saturday": { "start": "10:00", "end": "14:00", "isOff": false }
  }
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
    "updatedAt": "2024-11-15T10:00:00.000Z"
  }
}
```

---

### 2.5 Update Doctor Availability (Toggle)

**Route:** `PATCH /doctors/availability`
**Auth:** `D`

**Request Body:**

```json
{
  "isAvailable": true,
  "location": {
    "coordinates": [78.4867, 17.3850]
  }
}
```

> Location coordinates must be sent when toggling to `isAvailable: true` to update the doctor's current position.

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Availability updated.",
  "data": {
    "isAvailable": true,
    "location": {
      "type": "Point",
      "coordinates": [78.4867, 17.3850]
    }
  }
}
```

---

### 2.6 Search Nearby Doctors

**Route:** `GET /doctors/nearby`
**Auth:** `P`

**Query Parameters:**

| Parameter        | Type    | Required | Description                          |
|------------------|---------|----------|--------------------------------------|
| `lat`            | Float   | Yes      | Patient's latitude                   |
| `lng`            | Float   | Yes      | Patient's longitude                  |
| `radius`         | Integer | No       | Search radius in km (default: 10)    |
| `specialization` | String  | No       | Filter by specialization             |
| `minRating`      | Float   | No       | Minimum average rating (e.g., `4.0`) |
| `maxFee`         | Integer | No       | Maximum consultation fee (INR)       |
| `page`           | Integer | No       | Default: 1                           |
| `limit`          | Integer | No       | Default: 10, max: 20                 |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
      "fullName": "Dr. Priya Mehta",
      "avatar": "https://res.cloudinary.com/docdock/...",
      "specialization": "Cardiologist",
      "experience": 8,
      "consultationFee": 800,
      "avgRating": 4.7,
      "totalReviews": 124,
      "isAvailable": true,
      "distanceKm": 3.2,
      "estimatedArrivalMinutes": 18,
      "languages": ["English", "Hindi", "Telugu"]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 7,
    "totalPages": 1
  }
}
```

**Error Responses:**

| Status | Code               | Scenario                           |
|--------|--------------------|------------------------------------|
| 400    | `VALIDATION_ERROR` | `lat` or `lng` missing or invalid  |

---

### 2.7 Get Doctor Reviews

**Route:** `GET /doctors/:doctorId/reviews`
**Auth:** `P`

**Query Parameters:** `page`, `limit`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "reviewId": "64f3c4d5e6f7a8b9c0d1e2f3",
      "rating": 5,
      "comment": "Very thorough and professional.",
      "subRatings": {
        "punctuality": 5,
        "bedside_manner": 5,
        "diagnosis_accuracy": 4,
        "prescription_clarity": 5
      },
      "patient": {
        "fullName": "Arjun S.",
        "avatar": "https://res.cloudinary.com/docdock/..."
      },
      "doctorReply": {
        "text": "Thank you for your kind words!",
        "repliedAt": "2024-11-10T12:00:00.000Z"
      },
      "createdAt": "2024-11-09T16:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 124,
    "totalPages": 13
  }
}
```

---

### 2.8 Doctor Reply to Review

**Route:** `POST /doctors/reviews/:reviewId/reply`
**Auth:** `D`

**Request Body:**

```json
{
  "text": "Thank you for your kind feedback!"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Reply posted.",
  "data": {
    "reviewId": "64f3c4d5e6f7a8b9c0d1e2f3",
    "doctorReply": {
      "text": "Thank you for your kind feedback!",
      "repliedAt": "2024-11-15T11:00:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Code                    | Scenario                              |
|--------|-------------------------|---------------------------------------|
| 403    | `FORBIDDEN`             | Review does not belong to this doctor |
| 409    | `REPLY_ALREADY_EXISTS`  | Doctor already replied to this review |

---

## 3. Patient APIs

**Base path:** `/patients`

---

### 3.1 Create Patient Profile

**Route:** `POST /patients/profile`
**Auth:** `P`

**Request Body:**

```json
{
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "bloodGroup": "O+",
  "address": {
    "street": "Flat 4B, Sai Residency",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500032"
  },
  "emergencyContact": {
    "name": "Sunita Sharma",
    "relationship": "Spouse",
    "phone": "+919876543211"
  },
  "medicalHistory": [
    { "condition": "Hypertension", "diagnosedYear": 2019, "isOngoing": true }
  ],
  "allergies": ["Penicillin"],
  "currentMedications": ["Amlodipine 5mg"]
}
```

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Patient profile created.",
  "data": {
    "patientId": "64f4d5e6f7a8b9c0d1e2f3a4",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1"
  }
}
```

**Error Responses:**

| Status | Code                     | Scenario                       |
|--------|--------------------------|--------------------------------|
| 400    | `VALIDATION_ERROR`       | Invalid field values           |
| 409    | `PROFILE_ALREADY_EXISTS` | Patient profile already exists |

---

### 3.2 Get Patient Profile (Self)

**Route:** `GET /patients/profile/me`
**Auth:** `P`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "patientId": "64f4d5e6f7a8b9c0d1e2f3a4",
    "fullName": "Arjun Sharma",
    "email": "arjun@example.com",
    "phone": "+919876543210",
    "avatar": "https://res.cloudinary.com/docdock/...",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "bloodGroup": "O+",
    "address": {
      "street": "Flat 4B, Sai Residency",
      "city": "Hyderabad",
      "state": "Telangana",
      "pincode": "500032"
    },
    "emergencyContact": {
      "name": "Sunita Sharma",
      "relationship": "Spouse",
      "phone": "+919876543211"
    },
    "medicalHistory": [
      { "condition": "Hypertension", "diagnosedYear": 2019, "isOngoing": true }
    ],
    "allergies": ["Penicillin"],
    "currentMedications": ["Amlodipine 5mg"],
    "createdAt": "2024-09-01T08:00:00.000Z"
  }
}
```

---

### 3.3 Update Patient Profile

**Route:** `PATCH /patients/profile/me`
**Auth:** `P`

**Request Body:** (all fields optional)

```json
{
  "bloodGroup": "A+",
  "allergies": ["Penicillin", "Sulfa drugs"],
  "currentMedications": ["Amlodipine 5mg", "Metformin 500mg"],
  "address": {
    "pincode": "500033"
  }
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Profile updated.",
  "data": {
    "patientId": "64f4d5e6f7a8b9c0d1e2f3a4",
    "updatedAt": "2024-11-15T10:00:00.000Z"
  }
}
```

---

### 3.4 Upload Avatar

**Route:** `POST /patients/profile/avatar`
**Auth:** `*` (any authenticated user)

**Request Body:** `multipart/form-data`

| Field    | Type | Required | Description            |
|----------|------|----------|------------------------|
| `avatar` | File | Yes      | Image: JPEG/PNG, max 5MB |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Avatar updated.",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/docdock/image/upload/v1/avatars/64f1a2b3.jpg"
  }
}
```

---

### 3.5 Get Patient Appointment History

**Route:** `GET /patients/appointments`
**Auth:** `P`

**Query Parameters:** `page`, `limit`, `status`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
      "doctor": {
        "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
        "fullName": "Dr. Priya Mehta",
        "specialization": "Cardiologist",
        "avatar": "https://res.cloudinary.com/docdock/..."
      },
      "scheduledAt": "2024-11-20T09:00:00.000Z",
      "status": "completed",
      "consultationFee": 800,
      "hasPrescription": true,
      "hasReview": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 4. Appointment APIs

**Base path:** `/appointments`

---

### 4.1 Book Appointment

**Route:** `POST /appointments`
**Auth:** `P`

**Request Body:**

```json
{
  "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
  "scheduledAt": "2024-11-20T09:00:00.000Z",
  "symptoms": "Chest pain and breathlessness for 2 days.",
  "visitAddress": {
    "street": "Flat 4B, Sai Residency",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500032",
    "coordinates": {
      "type": "Point",
      "coordinates": [78.4744, 17.4065]
    }
  },
  "notes": "Please bring a BP monitor."
}
```

| Field          | Type     | Required | Validation                          |
|----------------|----------|----------|-------------------------------------|
| `doctorId`     | String   | Yes      | Valid ObjectId, doctor must be verified |
| `scheduledAt`  | DateTime | Yes      | Must be future datetime             |
| `symptoms`     | String   | Yes      | Max 1000 characters                 |
| `visitAddress` | Object   | Yes      | Full address with coordinates       |
| `notes`        | String   | No       | Max 500 characters                  |

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Appointment created. Proceed to payment.",
  "data": {
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "status": "pending_payment",
    "doctor": {
      "fullName": "Dr. Priya Mehta",
      "specialization": "Cardiologist"
    },
    "scheduledAt": "2024-11-20T09:00:00.000Z",
    "consultationFee": 800,
    "platformFee": 80,
    "tax": 154,
    "totalAmount": 1034,
    "paymentDue": "2024-11-20T08:45:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                      | Scenario                                  |
|--------|---------------------------|-------------------------------------------|
| 400    | `VALIDATION_ERROR`        | Missing or invalid fields                 |
| 400    | `SLOT_IN_PAST`            | `scheduledAt` is in the past              |
| 404    | `DOCTOR_NOT_FOUND`        | Doctor ID does not exist                  |
| 409    | `DOCTOR_NOT_AVAILABLE`    | Doctor is unavailable or unverified       |
| 409    | `SLOT_ALREADY_BOOKED`     | Doctor already has appointment at that time |

---

### 4.2 Get Appointment Details

**Route:** `GET /appointments/:appointmentId`
**Auth:** `P` (own appointment), `D` (own appointment), `A`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "status": "doctor_en_route",
    "patient": {
      "patientId": "64f4d5e6f7a8b9c0d1e2f3a4",
      "fullName": "Arjun Sharma",
      "phone": "+919876543210",
      "bloodGroup": "O+",
      "allergies": ["Penicillin"]
    },
    "doctor": {
      "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
      "fullName": "Dr. Priya Mehta",
      "specialization": "Cardiologist",
      "phone": "+919988776655"
    },
    "scheduledAt": "2024-11-20T09:00:00.000Z",
    "visitAddress": {
      "street": "Flat 4B, Sai Residency",
      "city": "Hyderabad",
      "coordinates": {
        "type": "Point",
        "coordinates": [78.4744, 17.4065]
      }
    },
    "symptoms": "Chest pain and breathlessness.",
    "payment": {
      "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
      "status": "captured",
      "amount": 1034,
      "paidAt": "2024-11-15T10:05:00.000Z"
    },
    "prescriptionId": null,
    "statusHistory": [
      { "status": "pending_payment", "changedAt": "2024-11-15T10:00:00.000Z" },
      { "status": "payment_confirmed", "changedAt": "2024-11-15T10:05:00.000Z" },
      { "status": "doctor_en_route", "changedAt": "2024-11-20T08:30:00.000Z" }
    ],
    "createdAt": "2024-11-15T10:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                   | Scenario                            |
|--------|------------------------|-------------------------------------|
| 403    | `FORBIDDEN`            | Appointment does not belong to user |
| 404    | `APPOINTMENT_NOT_FOUND`| Appointment ID not found            |

---

### 4.3 Update Appointment Status

**Route:** `PATCH /appointments/:appointmentId/status`
**Auth:** `D`, `A`

**Request Body:**

```json
{
  "status": "doctor_arrived",
  "note": "Arrived at patient location."
}
```

**Valid Transitions by Role:**

| From                  | To                    | Allowed By |
|-----------------------|-----------------------|------------|
| `payment_confirmed`   | `doctor_en_route`     | `D`        |
| `doctor_en_route`     | `doctor_arrived`      | `D`        |
| `doctor_arrived`      | `in_consultation`     | `D`        |
| `in_consultation`     | `completed`           | `D`        |
| `payment_confirmed`   | `cancelled`           | `D`, `A`   |
| `doctor_en_route`     | `cancelled`           | `D`, `A`   |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Appointment status updated.",
  "data": {
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "status": "doctor_arrived",
    "updatedAt": "2024-11-20T09:10:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                      | Scenario                          |
|--------|---------------------------|-----------------------------------|
| 400    | `INVALID_STATUS_TRANSITION`| Transition is not permitted       |
| 403    | `FORBIDDEN`               | Role not allowed for this transition |
| 404    | `APPOINTMENT_NOT_FOUND`   | Appointment not found             |

---

### 4.4 Cancel Appointment

**Route:** `DELETE /appointments/:appointmentId`
**Auth:** `P`, `D`, `A`

**Request Body:**

```json
{
  "cancellationReason": "Doctor emergency — unable to attend."
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Appointment cancelled. Refund will be processed within 5–7 business days.",
  "data": {
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "status": "cancelled",
    "refundEligible": true,
    "refundAmount": 1034
  }
}
```

**Error Responses:**

| Status | Code                         | Scenario                             |
|--------|------------------------------|--------------------------------------|
| 400    | `CANNOT_CANCEL`              | Appointment is already completed     |
| 403    | `FORBIDDEN`                  | Not allowed to cancel this appointment|
| 404    | `APPOINTMENT_NOT_FOUND`      | Appointment not found                |

---

### 4.5 Submit Review

**Route:** `POST /appointments/:appointmentId/review`
**Auth:** `P`

**Request Body:**

```json
{
  "rating": 5,
  "comment": "Dr. Mehta was very thorough and arrived on time.",
  "subRatings": {
    "punctuality": 5,
    "bedside_manner": 5,
    "diagnosis_accuracy": 4,
    "prescription_clarity": 5
  }
}
```

| Field     | Type    | Required | Validation             |
|-----------|---------|----------|------------------------|
| `rating`  | Integer | Yes      | 1–5                    |
| `comment` | String  | No       | Max 1000 characters    |
| `subRatings` | Object | No    | Each field: Integer 1–5|

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Review submitted. Thank you for your feedback.",
  "data": {
    "reviewId": "64f3c4d5e6f7a8b9c0d1e2f3",
    "rating": 5,
    "doctorNewAvgRating": 4.7
  }
}
```

**Error Responses:**

| Status | Code                      | Scenario                                   |
|--------|---------------------------|--------------------------------------------|
| 400    | `APPOINTMENT_NOT_COMPLETED`| Appointment must be completed to review    |
| 409    | `REVIEW_ALREADY_EXISTS`   | Patient already reviewed this appointment  |

---

## 5. Tracking APIs

**Base path:** `/tracking`

> Live tracking in DocDock primarily operates over **WebSocket (Socket.io)**. These REST endpoints serve as the initial fetch and location update fallback.

---

### 5.1 Get Doctor's Current Location

**Route:** `GET /tracking/:appointmentId/location`
**Auth:** `P` (own appointment), `D` (own appointment)

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "doctorCurrentLocation": {
      "type": "Point",
      "coordinates": [78.4812, 17.3920],
      "updatedAt": "2024-11-20T08:55:00.000Z"
    },
    "patientLocation": {
      "type": "Point",
      "coordinates": [78.4744, 17.4065]
    },
    "distanceRemainingKm": 1.8,
    "estimatedArrivalMinutes": 8,
    "status": "doctor_en_route"
  }
}
```

**Error Responses:**

| Status | Code                   | Scenario                              |
|--------|------------------------|---------------------------------------|
| 400    | `TRACKING_NOT_ACTIVE`  | Appointment not in tracking state     |
| 403    | `FORBIDDEN`            | Not a party to this appointment       |
| 404    | `APPOINTMENT_NOT_FOUND`| Appointment not found                 |

---

### 5.2 Update Doctor Location (REST Fallback)

**Route:** `PATCH /tracking/:appointmentId/location`
**Auth:** `D`

> Prefer WebSocket event `doctor:location_update` for real-time updates. Use this endpoint only as a fallback.

**Request Body:**

```json
{
  "coordinates": [78.4812, 17.3920]
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Location updated.",
  "data": {
    "coordinates": [78.4812, 17.3920],
    "updatedAt": "2024-11-20T08:55:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                   | Scenario                               |
|--------|------------------------|----------------------------------------|
| 400    | `TRACKING_NOT_ACTIVE`  | Doctor is not en-route for appointment |
| 403    | `FORBIDDEN`            | Not the doctor for this appointment    |

---

## 6. Chat APIs

**Base path:** `/chat`

> DocDock chat is primarily **real-time via Socket.io**. The REST endpoints below support history retrieval and chat initialization. Refer to Section 10 for WebSocket events.

---

### 6.1 Get or Create Chat Room

**Route:** `POST /chat/room`
**Auth:** `P`, `D`

**Request Body:**

```json
{
  "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "roomId": "64f7a8b9c0d1e2f3a4b5c6d7",
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "participants": [
      { "userId": "64f1a2b3c4d5e6f7a8b9c0d1", "role": "patient", "fullName": "Arjun Sharma" },
      { "userId": "64f9b0c1d2e3f4a5b6c7d8e9", "role": "doctor",  "fullName": "Dr. Priya Mehta" }
    ],
    "isActive": true,
    "createdAt": "2024-11-15T10:05:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                   | Scenario                                 |
|--------|------------------------|------------------------------------------|
| 403    | `FORBIDDEN`            | User is not a party to this appointment  |
| 404    | `APPOINTMENT_NOT_FOUND`| Appointment not found                    |

---

### 6.2 Get Chat History

**Route:** `GET /chat/:roomId/messages`
**Auth:** `P`, `D`

**Query Parameters:** `page`, `limit`, `before` (ISO timestamp for cursor)

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "roomId": "64f7a8b9c0d1e2f3a4b5c6d7",
    "messages": [
      {
        "messageId": "64f8b9c0d1e2f3a4b5c6d7e8",
        "senderId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "senderRole": "patient",
        "type": "text",
        "content": "Doctor, I am having severe chest pain.",
        "isRead": true,
        "createdAt": "2024-11-20T08:45:00.000Z"
      },
      {
        "messageId": "64f9b0c1d2e3f4a5b6c7d8e9",
        "senderId": "64f9b0c1d2e3f4a5b6c7d8e9",
        "senderRole": "doctor",
        "type": "text",
        "content": "I am on my way. Please rest and avoid exertion.",
        "isRead": true,
        "createdAt": "2024-11-20T08:46:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### 6.3 Send Chat Message (REST Fallback)

**Route:** `POST /chat/:roomId/messages`
**Auth:** `P`, `D`

> Prefer WebSocket event `chat:send_message`. Use this endpoint only when WebSocket is unavailable.

**Request Body:**

```json
{
  "type": "text",
  "content": "I am on my way. ETA 10 minutes."
}
```

| Field     | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| `type`    | String | Yes      | Enum: `"text"` \| `"image"`     |
| `content` | String | Yes (text)| Message text, max 2000 chars   |
| `mediaUrl`| String | Yes (image)| Cloudinary URL of image       |

**Response — 201 Created:**

```json
{
  "success": true,
  "data": {
    "messageId": "64f9b0c1d2e3f4a5b6c7d8e9",
    "content": "I am on my way. ETA 10 minutes.",
    "createdAt": "2024-11-20T08:50:00.000Z"
  }
}
```

---

## 7. Prescription APIs

**Base path:** `/prescriptions`

---

### 7.1 Create Prescription

**Route:** `POST /prescriptions`
**Auth:** `D`

**Request Body:**

```json
{
  "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
  "diagnosis": "Hypertensive crisis with suspected angina.",
  "chiefComplaints": "Chest pain, breathlessness, elevated BP (160/100).",
  "medications": [
    {
      "name": "Amlodipine",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "After breakfast",
      "quantity": 30
    },
    {
      "name": "Aspirin",
      "dosage": "75mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "After food",
      "quantity": 30
    }
  ],
  "labTests": ["ECG", "Lipid profile", "HbA1c"],
  "advice": "Reduce salt intake. Avoid physical exertion. Monitor BP daily.",
  "followUpDate": "2024-12-15"
}
```

| Field             | Type     | Required | Validation                           |
|-------------------|----------|----------|--------------------------------------|
| `appointmentId`   | String   | Yes      | Must be in `in_consultation` status  |
| `diagnosis`       | String   | Yes      | Max 500 characters                   |
| `chiefComplaints` | String   | Yes      | Max 1000 characters                  |
| `medications`     | Array    | Yes      | Min 1 item                           |
| `labTests`        | String[] | No       |                                      |
| `advice`          | String   | No       | Max 2000 characters                  |
| `followUpDate`    | Date     | No       | Must be future date                  |

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Prescription created and sent to patient.",
  "data": {
    "prescriptionId": "64fac1d2e3f4a5b6c7d8e9f0",
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "prescriptionPdfUrl": "https://res.cloudinary.com/docdock/prescriptions/64fac1d2.pdf",
    "issuedAt": "2024-11-20T10:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                          | Scenario                                        |
|--------|-------------------------------|-------------------------------------------------|
| 400    | `APPOINTMENT_NOT_IN_PROGRESS` | Appointment must be in `in_consultation` state  |
| 403    | `FORBIDDEN`                   | Not the doctor for this appointment             |
| 409    | `PRESCRIPTION_ALREADY_EXISTS` | Prescription already issued for this appointment|

---

### 7.2 Get Prescription

**Route:** `GET /prescriptions/:prescriptionId`
**Auth:** `P` (own), `D` (own issued), `A`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "prescriptionId": "64fac1d2e3f4a5b6c7d8e9f0",
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "doctor": {
      "fullName": "Dr. Priya Mehta",
      "specialization": "Cardiologist",
      "licenseNumber": "MCI/TS/2016/00456",
      "qualifications": ["MBBS", "MD", "DM"]
    },
    "patient": {
      "fullName": "Arjun Sharma",
      "dateOfBirth": "1990-05-15",
      "gender": "male",
      "bloodGroup": "O+"
    },
    "diagnosis": "Hypertensive crisis with suspected angina.",
    "chiefComplaints": "Chest pain, breathlessness, elevated BP.",
    "medications": [
      {
        "name": "Amlodipine",
        "dosage": "5mg",
        "frequency": "Once daily",
        "duration": "30 days",
        "instructions": "After breakfast",
        "quantity": 30
      }
    ],
    "labTests": ["ECG", "Lipid profile", "HbA1c"],
    "advice": "Reduce salt intake. Avoid physical exertion.",
    "followUpDate": "2024-12-15",
    "prescriptionPdfUrl": "https://res.cloudinary.com/docdock/prescriptions/64fac1d2.pdf",
    "issuedAt": "2024-11-20T10:30:00.000Z"
  }
}
```

---

### 7.3 Get Patient Prescription History

**Route:** `GET /prescriptions/patient/me`
**Auth:** `P`

**Query Parameters:** `page`, `limit`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "prescriptionId": "64fac1d2e3f4a5b6c7d8e9f0",
      "doctor": {
        "fullName": "Dr. Priya Mehta",
        "specialization": "Cardiologist"
      },
      "diagnosis": "Hypertensive crisis with suspected angina.",
      "medicationCount": 2,
      "prescriptionPdfUrl": "https://res.cloudinary.com/docdock/prescriptions/64fac1d2.pdf",
      "issuedAt": "2024-11-20T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

---

## 8. Payment APIs

**Base path:** `/payments`

---

### 8.1 Create Razorpay Order

**Route:** `POST /payments/create-order`
**Auth:** `P`

**Request Body:**

```json
{
  "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5"
}
```

**Response — 201 Created:**

```json
{
  "success": true,
  "message": "Razorpay order created.",
  "data": {
    "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
    "razorpayOrderId": "order_OBG6oXO32biqNL",
    "amount": 103400,
    "currency": "INR",
    "keyId": "rzp_live_XXXXXXXXXXXX",
    "prefill": {
      "name": "Arjun Sharma",
      "email": "arjun@example.com",
      "contact": "+919876543210"
    },
    "notes": {
      "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5"
    }
  }
}
```

> `amount` is in **paise** (INR × 100) as required by Razorpay.

**Error Responses:**

| Status | Code                     | Scenario                               |
|--------|--------------------------|----------------------------------------|
| 400    | `PAYMENT_ALREADY_EXISTS` | Order already created for appointment  |
| 400    | `INVALID_STATUS`         | Appointment not in `pending_payment`   |
| 404    | `APPOINTMENT_NOT_FOUND`  | Appointment not found                  |

---

### 8.2 Verify Payment

**Route:** `POST /payments/verify`
**Auth:** `P`

> Called by the client after Razorpay checkout success to verify the HMAC signature and confirm payment.

**Request Body:**

```json
{
  "razorpayOrderId": "order_OBG6oXO32biqNL",
  "razorpayPaymentId": "pay_OBG6yXQ89bkrMZ",
  "razorpaySignature": "9ef4dabb9173d6f7c70c5c5b3a2e6b1e..."
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Payment verified. Appointment confirmed.",
  "data": {
    "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
    "status": "captured",
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "appointmentStatus": "payment_confirmed",
    "paidAt": "2024-11-15T10:05:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                       | Scenario                            |
|--------|----------------------------|-------------------------------------|
| 400    | `SIGNATURE_MISMATCH`       | HMAC verification failed            |
| 404    | `ORDER_NOT_FOUND`          | Razorpay order ID not found         |
| 409    | `PAYMENT_ALREADY_CAPTURED` | Payment already verified            |

---

### 8.3 Razorpay Webhook

**Route:** `POST /payments/webhook`
**Auth:** None (validated via `X-Razorpay-Signature` header)

> Internal endpoint consumed by Razorpay. Handles events: `payment.captured`, `payment.failed`, `refund.processed`.

**Headers:**

| Header                   | Description                        |
|--------------------------|------------------------------------|
| `X-Razorpay-Signature`   | HMAC-SHA256 of payload + secret    |

**Request Body:** Raw Razorpay webhook payload (JSON)

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Webhook processed."
}
```

---

### 8.4 Get Payment Details

**Route:** `GET /payments/:paymentId`
**Auth:** `P` (own payment), `A`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
    "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
    "razorpayOrderId": "order_OBG6oXO32biqNL",
    "razorpayPaymentId": "pay_OBG6yXQ89bkrMZ",
    "amount": 103400,
    "currency": "INR",
    "consultationFeeSnapshot": 80000,
    "platformFee": 8000,
    "tax": 15400,
    "status": "captured",
    "paymentMethod": "upi",
    "paidAt": "2024-11-15T10:05:00.000Z",
    "refundId": null,
    "refundStatus": null
  }
}
```

---

### 8.5 Request Refund

**Route:** `POST /payments/:paymentId/refund`
**Auth:** `A`

**Request Body:**

```json
{
  "reason": "Doctor failed to attend the appointment.",
  "refundAmount": 103400
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Refund initiated successfully.",
  "data": {
    "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
    "refundId": "rfnd_OBG8zYR90clsPH",
    "refundAmount": 103400,
    "refundStatus": "pending",
    "refundInitiatedAt": "2024-11-20T12:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code                      | Scenario                          |
|--------|---------------------------|-----------------------------------|
| 400    | `REFUND_NOT_ELIGIBLE`     | Payment status is not `captured`  |
| 409    | `REFUND_ALREADY_INITIATED`| Refund already in progress        |

---

### 8.6 Get Patient Payment History

**Route:** `GET /payments/patient/me`
**Auth:** `P`

**Query Parameters:** `page`, `limit`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
      "appointment": {
        "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
        "doctor": "Dr. Priya Mehta",
        "scheduledAt": "2024-11-20T09:00:00.000Z"
      },
      "amount": 103400,
      "status": "captured",
      "paidAt": "2024-11-15T10:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

---

## 9. Admin APIs

**Base path:** `/admin`

> All Admin API endpoints require `role: "admin"` in the JWT.

---

### 9.1 Get All Pending Doctor Verifications

**Route:** `GET /admin/doctors/pending`
**Auth:** `A`

**Query Parameters:** `page`, `limit`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
      "fullName": "Dr. Rajesh Iyer",
      "email": "rajesh@example.com",
      "phone": "+919900112233",
      "specialization": "Dermatologist",
      "licenseNumber": "MCI/AP/2018/00789",
      "experience": 6,
      "documents": {
        "licenseDocument": "https://res.cloudinary.com/docdock/...",
        "profilePhoto": "https://res.cloudinary.com/docdock/..."
      },
      "verificationStatus": "pending",
      "createdAt": "2024-11-14T09:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 9.2 Verify or Reject Doctor

**Route:** `PATCH /admin/doctors/:doctorId/verify`
**Auth:** `A`

**Request Body:**

```json
{
  "action": "approve",
  "note": "License verified against MCI database."
}
```

| Field    | Type   | Required | Validation                          |
|----------|--------|----------|-------------------------------------|
| `action` | String | Yes      | Enum: `"approve"` \| `"reject"`     |
| `note`   | String | No       | Required when `action === "reject"` |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Doctor approved successfully.",
  "data": {
    "doctorId": "64f2b3c4d5e6f7a8b9c0d1e2",
    "verificationStatus": "verified",
    "verifiedAt": "2024-11-15T11:00:00.000Z",
    "verifiedBy": "64fbd2e3f4a5b6c7d8e9f0a1"
  }
}
```

**Error Responses:**

| Status | Code                  | Scenario                              |
|--------|-----------------------|---------------------------------------|
| 400    | `VALIDATION_ERROR`    | Missing rejection note                |
| 404    | `DOCTOR_NOT_FOUND`    | Doctor ID not found                   |
| 409    | `ALREADY_VERIFIED`    | Doctor already verified               |

---

### 9.3 Get Dashboard Statistics

**Route:** `GET /admin/dashboard/stats`
**Auth:** `A`

**Query Parameters:**

| Parameter | Type   | Default | Description                        |
|-----------|--------|---------|------------------------------------|
| `period`  | String | `7d`    | `"24h"` \| `"7d"` \| `"30d"` \| `"all"` |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "period": "7d",
    "users": {
      "totalPatients": 1240,
      "totalDoctors": 85,
      "newPatientsThisPeriod": 42,
      "newDoctorsThisPeriod": 6
    },
    "appointments": {
      "total": 392,
      "completed": 310,
      "cancelled": 28,
      "pending": 54,
      "completionRate": "79.1%"
    },
    "revenue": {
      "totalRevenuePaise": 32040000,
      "totalRevenueINR": 320400,
      "platformFeePaise": 2912000,
      "platformFeeINR": 29120,
      "refundedPaise": 1034000,
      "refundedINR": 10340
    },
    "doctors": {
      "pendingVerification": 5,
      "verified": 78,
      "rejected": 2
    }
  }
}
```

---

### 9.4 Get All Users

**Route:** `GET /admin/users`
**Auth:** `A`

**Query Parameters:** `page`, `limit`, `role`, `search`, `isActive`

| Parameter  | Type    | Description                              |
|------------|---------|------------------------------------------|
| `role`     | String  | Filter by `"patient"` \| `"doctor"`      |
| `search`   | String  | Search by name, email, or phone          |
| `isActive` | Boolean | Filter by account status                 |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Arjun Sharma",
      "email": "arjun@example.com",
      "phone": "+919876543210",
      "role": "patient",
      "isVerified": true,
      "isActive": true,
      "lastLogin": "2024-11-14T08:30:00.000Z",
      "createdAt": "2024-09-01T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1240,
    "totalPages": 124
  }
}
```

---

### 9.5 Suspend or Activate User

**Route:** `PATCH /admin/users/:userId/status`
**Auth:** `A`

**Request Body:**

```json
{
  "action": "suspend",
  "reason": "Multiple reports of fraudulent activity."
}
```

| Field    | Type   | Required | Validation                            |
|----------|--------|----------|---------------------------------------|
| `action` | String | Yes      | Enum: `"suspend"` \| `"activate"`     |
| `reason` | String | No       | Required when `action === "suspend"`  |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "User account suspended.",
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "isActive": false,
    "updatedAt": "2024-11-15T12:00:00.000Z"
  }
}
```

---

### 9.6 Get All Appointments (Admin)

**Route:** `GET /admin/appointments`
**Auth:** `A`

**Query Parameters:** `page`, `limit`, `status`, `doctorId`, `patientId`, `from`, `to`

| Parameter   | Type     | Description                        |
|-------------|----------|------------------------------------|
| `status`    | String   | Filter by appointment status       |
| `doctorId`  | String   | Filter by doctor                   |
| `patientId` | String   | Filter by patient                  |
| `from`      | DateTime | Start date filter (ISO 8601)       |
| `to`        | DateTime | End date filter (ISO 8601)         |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "appointmentId": "64f5e6f7a8b9c0d1e2f3a4b5",
      "patient": { "fullName": "Arjun Sharma", "phone": "+919876543210" },
      "doctor": { "fullName": "Dr. Priya Mehta", "specialization": "Cardiologist" },
      "scheduledAt": "2024-11-20T09:00:00.000Z",
      "status": "completed",
      "totalAmount": 1034,
      "createdAt": "2024-11-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 392,
    "totalPages": 40
  }
}
```

---

### 9.7 Get All Payments (Admin)

**Route:** `GET /admin/payments`
**Auth:** `A`

**Query Parameters:** `page`, `limit`, `status`, `from`, `to`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "64f6f7a8b9c0d1e2f3a4b5c6",
      "patient": { "fullName": "Arjun Sharma" },
      "doctor": { "fullName": "Dr. Priya Mehta" },
      "razorpayOrderId": "order_OBG6oXO32biqNL",
      "amount": 103400,
      "status": "captured",
      "paidAt": "2024-11-15T10:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 392,
    "totalPages": 40
  }
}
```

---

### 9.8 Moderate Review

**Route:** `PATCH /admin/reviews/:reviewId/moderate`
**Auth:** `A`

**Request Body:**

```json
{
  "action": "hide",
  "reason": "Abusive language detected."
}
```

| Field    | Type   | Required | Validation                      |
|----------|--------|----------|---------------------------------|
| `action` | String | Yes      | Enum: `"hide"` \| `"restore"`   |
| `reason` | String | No       | Recommended when hiding         |

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Review hidden.",
  "data": {
    "reviewId": "64f3c4d5e6f7a8b9c0d1e2f3",
    "isVisible": false
  }
}
```

---

### 9.9 Get Notifications List (Admin)

**Route:** `GET /admin/notifications`
**Auth:** `A`

**Query Parameters:** `page`, `limit`, `userId`, `type`

**Response — 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "notificationId": "64fce3f4a5b6c7d8e9f0a1b2",
      "user": { "fullName": "Arjun Sharma", "role": "patient" },
      "type": "appointment_confirmed",
      "title": "Appointment Confirmed",
      "message": "Your appointment with Dr. Priya Mehta is confirmed.",
      "isRead": true,
      "createdAt": "2024-11-15T10:06:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 58,
    "totalPages": 6
  }
}
```

---

## 10. WebSocket Events Reference

**Connection URL:** `wss://api.docdock.in`
**Library:** Socket.io v4

**Authentication:** Pass the JWT access token as a query parameter on connection:
```
wss://api.docdock.in?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Connection Events

| Event               | Direction      | Description                        |
|---------------------|----------------|------------------------------------|
| `connect`           | Server → Client| Successfully connected             |
| `disconnect`        | Server → Client| Connection dropped                 |
| `connect_error`     | Server → Client| Auth or server error on connect    |

---

### Room Events

| Event               | Direction      | Payload                              | Description                    |
|---------------------|----------------|--------------------------------------|--------------------------------|
| `room:join`         | Client → Server| `{ roomId }`                         | Join a chat or tracking room   |
| `room:leave`        | Client → Server| `{ roomId }`                         | Leave a room                   |
| `room:joined`       | Server → Client| `{ roomId, participants }`           | Confirmation of joining        |

---

### Tracking Events

| Event                     | Direction       | Payload                                           | Description                       |
|---------------------------|-----------------|---------------------------------------------------|-----------------------------------|
| `doctor:location_update`  | Client → Server | `{ appointmentId, coordinates: [lng, lat] }`      | Doctor sends location update      |
| `tracking:location_changed`| Server → Client | `{ coordinates, distanceKm, etaMinutes, updatedAt }` | Broadcast to patient           |
| `tracking:doctor_arrived` | Server → Client | `{ appointmentId, arrivedAt }`                    | Doctor marks arrival              |

---

### Chat Events

| Event                  | Direction       | Payload                                           | Description                     |
|------------------------|-----------------|---------------------------------------------------|---------------------------------|
| `chat:send_message`    | Client → Server | `{ roomId, type, content, mediaUrl? }`            | Send a new message              |
| `chat:new_message`     | Server → Client | `{ messageId, senderId, senderRole, type, content, createdAt }` | Broadcast to room participants |
| `chat:message_read`    | Client → Server | `{ roomId, messageId }`                           | Mark message as read            |
| `chat:typing`          | Client → Server | `{ roomId }`                                      | User is typing                  |
| `chat:typing_indicator`| Server → Client | `{ userId, senderRole, isTyping }`                | Broadcast typing status         |

---

### Appointment Events

| Event                          | Direction       | Payload                                    | Description                       |
|--------------------------------|-----------------|--------------------------------------------|-----------------------------------|
| `appointment:status_changed`   | Server → Client | `{ appointmentId, status, changedAt }`     | Status update broadcast           |
| `appointment:cancelled`        | Server → Client | `{ appointmentId, cancelledBy, reason }`   | Cancellation broadcast            |
| `appointment:prescription_ready`| Server → Client| `{ appointmentId, prescriptionId, pdfUrl }`| Prescription issued notification  |

---

### Notification Events

| Event                  | Direction       | Payload                                              | Description             |
|------------------------|-----------------|------------------------------------------------------|-------------------------|
| `notification:new`     | Server → Client | `{ notificationId, type, title, message, data }`     | Real-time notification  |

---

## 11. Rate Limiting

| Endpoint Group            | Limit                     | Window     |
|---------------------------|---------------------------|------------|
| Auth (login, register)    | 10 requests               | 15 minutes |
| Forgot password           | 5 requests                | 1 hour     |
| Nearby doctor search      | 60 requests               | 1 minute   |
| Appointment booking       | 5 requests                | 1 minute   |
| Payment endpoints         | 20 requests               | 1 minute   |
| General API (all others)  | 100 requests              | 1 minute   |
| Admin endpoints           | 200 requests              | 1 minute   |

Rate limit headers returned on every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700000060
```

When the limit is exceeded:

**Response — 429 Too Many Requests:**

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfterSeconds": 43
  }
}
```

---

## 12. HTTP Status Code Reference

| Code | Meaning               | Usage in DocDock                                     |
|------|-----------------------|------------------------------------------------------|
| 200  | OK                    | Successful GET, PATCH, DELETE                        |
| 201  | Created               | Successful POST (resource created)                   |
| 204  | No Content            | Successful DELETE with no response body              |
| 400  | Bad Request           | Validation errors, business logic violations         |
| 401  | Unauthorized          | Missing, expired, or invalid JWT                     |
| 403  | Forbidden             | Authenticated but insufficient role/ownership        |
| 404  | Not Found             | Resource does not exist                              |
| 409  | Conflict              | Duplicate resource, invalid state transition         |
| 422  | Unprocessable Entity  | Semantically invalid request (e.g., past date)       |
| 429  | Too Many Requests     | Rate limit exceeded                                  |
| 500  | Internal Server Error | Unhandled server exception                           |
| 502  | Bad Gateway           | Upstream service failure (Razorpay, Cloudinary)      |
| 503  | Service Unavailable   | Scheduled maintenance or overload                    |

---

*DocDock API Design Documentation — v1.0.0 | Professional Software Engineering Standard*
