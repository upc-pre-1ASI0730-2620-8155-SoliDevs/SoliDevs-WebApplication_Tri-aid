# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
