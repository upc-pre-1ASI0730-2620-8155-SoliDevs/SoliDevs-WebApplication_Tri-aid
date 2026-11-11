# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **IAM Bounded Context:**
  - `User` entity, `IamApi` gateway, `IamService` and the reactive `iamStore` wired to the shared session.
  - Credential validation on login, show/hide password toggle and sign out through the IAM service.
  - Self-service institution registration with a 3-step wizard (plan, account, card), plan preselection from the landing page and duplicate institution and username checks.
  - Role-based access: subscription and staff account management restricted to administrators.
  - Staff account management view and self-service profile with view and edit modes.
  - Access-suspended screen for institutions with an overdue subscription.
- **Subscription Bounded Context:**
  - `Plan` and `Subscription` entities, `SubscriptionApi` gateway, `SubscriptionService` with a simulated payment gateway and the reactive `subscriptionStore`.
  - Subscription view with plan catalog, checkout and payment history.
  - 14-day card-required trial with automatic charge at the end of the trial.
  - Staff account limits per plan with seat usage indicators.
  - Grace period banner for pending subscriptions.
  - Plans and subscriptions endpoints and seed data.
- **Shared:**
  - Access guard that combines the IAM session with the subscription state on every navigation.
  - Tenant-scoped `BaseEndpoint` that isolates clinical data per institution.
- **Patient Registration:**
  - Temporary portal credentials on patient creation and collision-safe episode ids.
- **Internationalization:**
  - Localized plan catalog with fallback to raw data.

### Changed
- Code comments translated to English and normalized to JSDoc across all modules.
- Register view redesigned with the standard auth shell and plan cards aligned with the landing page pricing section.

### Fixed
- Profile edits keep the stored institution, role and shift.
- Non-admin staff see a contact-admin notice instead of the payment link.
- Renewal date advances after a successful payment retry.
- Selected plan slug resolved correctly during trial onboarding.
- Missing i18n labels for the institutional plan price and the payment summary.

## [1.0.0] - 2026-10-06

### Added
- **Patient Registration Bounded Context:**
  - `Patient` and `Episode` entities and `PatientRegisteredEvent`.
  - Patient list, registration form with autofill by document number, and patient file with a clinical workflow stepper.
  - Persistence of patients and episodes through `json-server`.
- **Vital Signs Capture Bounded Context:**
  - Device management view, device linking to episodes and automatic release when the referral is completed.
  - Simulated automatic readings and manual entry, with `VitalsConfirmedEvent` published on confirmation.
- **Triage Classification Bounded Context:**
  - `Classification` entity, `ClassificationAssembler` and `Nt158Engine` to suggest the priority level from the vital signs.
  - Classification view with confirmation or adjustment of the suggested level, and persistence through `json-server`.
- **Specialty Assignment Bounded Context:**
  - `Referral` and `Voucher` entities, assemblers and `SpecialtyRules`.
  - Coded symptom catalog with autocomplete, referral voucher and specialty queues.
- **Alerting Bounded Context:**
  - `Alert` entity, `AlertingService` and clinical rules for out-of-range vital signs.
  - Alert center with filtering, sorting, acknowledgement and escalation, and a notification bell with GSAP animations.
- **Panel and Reports:**
  - Triage dashboard with stats, episode flow status and specialty queues.
  - Shift reports with care log, alert log and triage metrics.
- **Shared:**
  - Layout with responsive sidebar and hamburger drawer, design tokens and animated toast notifications.
  - `BaseApi` and `BaseEndpoint` on top of Axios.
  - Triage level catalog moved to the shared kernel.
- **Internationalization:**
  - `vue-i18n` with English and Spanish catalogs under `src/locales` and a language switch.
- **UI and Configuration:**
  - PrimeVue with the Material preset, PrimeIcons and confirmation dialog service.
  - Firebase Hosting configuration and Firebase Realtime Database as the production backend.
