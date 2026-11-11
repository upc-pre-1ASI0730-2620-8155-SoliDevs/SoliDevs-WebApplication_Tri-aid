# Tri-Aid Web Application (`SoliDevs-WebApplication_Tri-aid`)

## Overview
Tri-Aid is a Vue 3 + Vite web application that supports the triage process in hospital and clinic emergency rooms. Triage staff register patients, capture vital signs from linked measurement devices, receive a suggested priority level, confirm or adjust it, and refer each patient to a medical specialty, with alerts when a vital sign is out of range.

The code is organized with a domain-driven design (DDD) style: each business capability lives in its own bounded context, with domain, application, infrastructure and presentation layers.

Deployed application: https://triaid-solidevs.web.app

## Goals
- Support the triage workflow end to end: registration, vital signs, classification, referral and alerts.
- Keep each bounded context isolated, with domain concepts explicit (`entity`, `event`, `resource`, `assembler`, `service`, `store`).
- Isolate clinical data per institution and control access by session, role and subscription state.

## Tech Stack
- Vue 3
- Vite
- Vue Router
- Vue I18n
- PrimeVue (Material preset) + PrimeIcons + PrimeFlex
- Axios
- GSAP for interface animations
- `json-server` as fake backend in development
- Firebase Hosting and Firebase Realtime Database in production

## Project Structure (DDD-Oriented)
```text
src/
  iam/                          # IAM bounded context
    domain/model/               # User entity
    application/                # iamStore (signed-in user and session)
    infrastructure/             # IamApi, IamService
    presentation/views/         # Login, register, password recovery, profile, users

  patient-registration/         # Patient Registration bounded context
    domain/model/               # Patient and Episode entities
    domain/events/              # PatientRegisteredEvent
    application/                # Patient store and document types
    infrastructure/             # PatientRegistrationApi
    presentation/views/         # Patient list, registration form, patient file

  vital-signs-capture/          # Vital Signs Capture bounded context
    domain/model/               # DeviceLink, DeviceType, reading source and status
    domain/events/              # VitalsConfirmedEvent
    application/                # Vitals store and device store
    infrastructure/             # VitalSignsApi
    presentation/               # Devices view, vitals panel and routes

  triage-classification/        # Triage Classification bounded context
    domain/model/               # Classification entity
    domain/services/            # Nt158Engine (suggested priority)
    infrastructure/             # TriageApi, assembler, resource, service
    presentation/               # Classification view, priority badge, triage guide and routes

  specialty-assignment/         # Specialty Assignment bounded context
    domain/model/               # Referral, Voucher, Specialty
    domain/services/            # SpecialtyRules
    infrastructure/             # SpecialtyAssignmentApi, assemblers, resources, service
    presentation/               # Assignment view, symptom autocomplete, voucher dialog and routes

  alerting/                     # Alerting bounded context
    domain/model/               # Alert entity
    domain/services/            # Safe vital sign ranges
    application/                # Alert store for the notification bell
    infrastructure/             # AlertingApi, AlertingService
    presentation/               # Alert center view and notification bell

  subscription/                 # Subscription bounded context
    domain/model/               # Plan and Subscription entities
    application/                # subscriptionStore
    infrastructure/             # SubscriptionApi, SubscriptionService
    presentation/               # Subscription view and routes

  panel/                        # Triage dashboard (presentation only)
  reports/                      # Shift reports (presentation only)

  shared/                       # Shared cross-context concerns
    domain/shared-kernel/       # Triage level catalog
    application/                # i18n, access guard, event bus, session, toasts
    infrastructure/             # BaseApi, BaseEndpoint
    presentation/               # Sidebar, auth shell, language switch, toasts, styles

  locales/                      # en.json and es.json
  router/                       # Route table and access guard installation
```

## Bounded Contexts

### IAM
- Signs staff in and out, validates credentials and restores the session.
- Registers a new institution together with its administrator account.
- Restricts staff account management and subscription management to administrators.

### Patient Registration
- Registers patients by document number and opens a care episode for each visit.
- Persists patients and episodes, and generates temporary portal credentials for the patient.

### Vital Signs Capture
- Links measurement devices to an episode and records readings (simulated automatic readings or manual entry).
- Publishes `VitalsConfirmedEvent` through the shared event bus when the vital signs are confirmed.

### Triage Classification
- Suggests a priority level with `Nt158Engine` from the confirmed vital signs.
- Lets the staff confirm the suggestion or override it with a justification.

### Specialty Assignment
- Refers the classified patient to a specialty, supported by a coded symptom catalog.
- Issues the referral voucher and shows the queue per specialty.

### Alerting
- Generates alerts when a vital sign is outside its safe range.
- Shows them in the alert center and in the notification bell, where staff can acknowledge or escalate them.

### Subscription
- Manages the plan catalog, the trial period, checkout with a simulated payment gateway and the payment history.
- Enforces the staff account limit of each plan.

### Shared
- `BaseApi` centralizes the Axios configuration; `BaseEndpoint` centralizes CRUD calls and tenant scoping.
- The access guard combines the IAM session with the subscription state.
- The shared kernel holds the triage level catalog used by several contexts.
