# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.6.0] - 2026-11-27

### Fixed
- Escalating an incident moves the patient's referral to Trauma Shock (also when a triage referral already existed), raises one incident per patient listing every altered vital sign and the triage priority, is offered once per patient and plays the closing tick animation.
- The closed filter hides escalated cards as well as resolved ones, and an episode keeps a single open incident.
- Referrals created before tenancy (no institution) stay visible in the panel, patients and reports; referral resources send the episode id as the API expects.
- The out-of-range notice shows the blood pressure as one value instead of a raw label per reading.

## [3.7.0] - 2026-11-28

### Fixed
- Approving the triage suggestion stays approved when leaving and re-entering the view; the suggestion is only recalculated when the vital signs change the level.
- The patient file shows the confirmed level; before, it read the classification answer as a list and always saw none.

### Changed
- Status chips on the panel, patients, reports and the patient file show a skeleton until classifications and referrals have loaded instead of flashing intermediate states; the panel loads its sources in parallel.

## [3.9.0] - 2026-11-28

### Fixed
- Each institution only sees its own patients, episodes, classifications, referrals and incidents, and its queue positions.
- The subscription page shows the trial renewal date instead of "Invalid Date".
- The staff voucher shows the episode code; readings cannot be confirmed with empty values.
- The referral view queue uses the same tiles as the panel.

## [3.8.0] - 2026-11-28

### Added
- The issued portal code dialog plays a GSAP sequence (badge pop, cascading copy, code flipping in tile by tile), shows the admission QR that the staff scanner resolves, and has a copy button.
- The patient portal shows a message with a retry button when the overview cannot be loaded, and returns to the sign-in when the session expired.

### Changed
- The specialty waiting queue on the panel is an even grid of tiles; the suggestion button and tag no longer carry the sparkle icon.
- The plan step of the staff registration centers its single button, and the institutional plan lists incident reports and audit instead of multi-site management.

### Fixed
- Spanish copy: the devices hint, the profile role and shift, the staff form options and the triage reason when no urgency criterion applies.
- The patient portal works while a staff session is open in the same browser: the staff token no longer replaces the patient token.
- The patient file always offers a new access code and tells the staff to regenerate it when the patient reports it no longer works.

## [3.5.0] - 2026-11-26

### Added
- **Patient portal:** sign-in, my status, my turn and my voucher views with a tabbed layout, session guard, Spanish/English copy and a 45-second live queue poll.
- **Voucher QR:** the referral voucher renders a real scannable QR carrying the sealed token, with PNG download for the patient and the staff.
- **Voucher scanner:** the admission desk scans the voucher with the camera or an uploaded image and opens the patient file directly.
- **Staff sign-in:** the staff logs in against the API and every request carries the real JWT.
- Reports: NT-158 level distribution chart, each report source loaded independently.

### Changed
- Personal is laid out as a searchable list like Pacientes, with localized role and shift chips.
- Monitor-paper grid background across the staff shell and the patient portal; issued-code dialog animated with the shared modal motion.
- Incidents endpoint moved to `/incidents` to follow the renamed bounded context.

### Fixed
- Registration and dialog rendering (single root under the router transition), referral lookup through the episode endpoint, panel counts derived from live referrals, and responsive spacing on Pacientes and the episodes list.

## [3.1.0] - 2026-11-21

### Added
- Registration shows a "waking up the server" notice when the API takes long to answer.

### Fixed
- The trial subscription is created with its renewal date and grace period.

## [3.2.0] - 2026-11-21

### Added
- Patient list marks each patient as classified or referred from the persisted classifications and referrals.
- Reports: referral status in the care log, UTC-safe cycle time and translated severity in the alert log.

## [3.3.0] - 2026-11-21

### Fixed
- Acknowledge failures on escalated incidents are reported to the user.

## [3.4.0] - 2026-11-22

### Changed
- **Breaking — Bounded context rename (Alerting → Incidents):** aligned with the `feature/incident-refactor` branch of the TriAid Platform API.
  - Folder `src/alerting` → `src/incidents`; `Alert` → `Incident`, `AlertingApi` → `IncidentsApi`, `AlertingService` → `IncidentsService`, `alertStore` → `incidentStore`, `pushAlerts` → `pushIncidents`.
  - Route `/alerting` → `/incidents`; endpoint path `VITE_ALERTS_ENDPOINT_PATH` → `VITE_INCIDENTS_ENDPOINT_PATH="/incidents"`.
  - UI vocabulary: i18n keys `alerting.*` → `incidents.*`, `nav.alerts` → `nav.incidents`, `reports.mAlerts`/`alertLog`/`noAlerts` → `mIncidents`/`incidentLog`/`noIncidents`; every visible text now reads "Incidencias" / "Incidents" (nav, bell, center, reports, login, suspended, plan features).
  - View and store variables renamed (`activeAlerts` → `activeIncidents`, `displayAlerts` → `displayIncidents`, `acknowledgeAlert` → `acknowledgeIncident`, `playAlertSound` → `playIncidentSound`, `alerts` → `incidents` in reports).

## [3.0.0] - 2026-11-12

### Added
- **Full-Stack Integration (AV2):**
  - Complete clinical workflow against the TriAid Platform REST API: patient registration, triage episode opening, vital signs confirmation, NT-158 classification with approval, automatic alert generation, escalation to Trauma Shock, referral and voucher issuance, verified end to end.
  - Deployed the connected web application to Firebase Hosting, consuming the deployed TriAid Platform API.
  - Alert center fed by persisted alerts, with direct acknowledgment and escalation confirmation to the Trauma Shock critical care room.

### Changed
- **Breaking — Backend Swap (ADR-010):**
  - Replaced the Firebase Realtime Database production backend and the `json-server` mock with the TriAid Platform REST API as the single source of truth.
  - Environment split: `.env.development` targets the local API (`http://localhost:5090/api/v1`) and `.env.production` targets the deployed API.
  - Realtime Database response normalization now applies only to Realtime Database sources, keeping API resources intact.

### Fixed
- Persisted vital signs are loaded from the episode record and kept in the episode resource payload between confirmation and classification.
- A missing classification for an episode is treated as an empty state instead of failing the classification view.
- Classification approval state is preserved between the approve and confirm steps, so alerts are generated exactly once.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [2.4.0] - 2026-11-11

### Added
- **Patient Registration over the REST API:**
  - Application layer: `PatientAssembler` and `TriageEpisodeAssembler` for the API resource records, with UTC arrival time handling.
  - Infrastructure layer: `PatientApi` gateway endpoints for patients, temporary profiles, contacts, triage episodes, `start-triage` and `referred` state transitions.
  - Patient and episode loading, registration, and episode state synchronization through the API, with API validation errors surfaced on the registration form and the registration awaited before opening the patient file.

### Changed
- **UX:**
  - Alert acknowledgment runs directly without a confirmation dialog; escalation keeps its confirmation.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- **Mock Persistence:**
  - Removed the `json-server` update methods from the patient registration API gateway.

### Security
- Nothing yet.

## [2.3.0] - 2026-11-11

### Added
- **Documentation:**
  - `CHANGELOG.md` with release 1.0.0.
  - Architecture Decision Records (`docs/adrs.md`) covering ADR-001 through ADR-010: DDD layered architecture with bounded contexts, Vue 3 + Vite as core framework, reactive stores for state management, PrimeVue/design tokens/GSAP for the UI layer, centralized HTTP client with tenant scoping, assembler and resource pattern, route protection by session, role and subscription, internationalization with `vue-i18n`, domain services, shared kernel and domain events, and the fake backend and Firebase environments.

### Changed
- Nothing yet.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [2.2.0] - 2026-11-10

### Added
- **Self-Service Institution Registration:**
  - Three-step registration wizard reordered to plan first, then account, then card, with plan preselection from the landing page and duplicate institution and username checks.
  - Numeric-only card input with blur formatting and toast field names.
  - Temporary portal credentials on patient creation and collision-safe episode ids.
- **Shared:**
  - Tenant-scoped `BaseEndpoint` that isolates clinical data per institution.

### Changed
- **Internationalization:**
  - Localized plan catalog with fallback to raw data, plus restored payment summary and welcome toast keys.
- **Register View:**
  - Plan cards aligned with the landing pricing section, refined wizard layout, price sizing and validation spacing.

### Fixed
- Profile edits merge over the stored record to keep the institution, role and shift.
- Missing i18n labels for the institutional plan price and the payment summary.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [2.1.0] - 2026-10-28

### Added
- **IAM Bounded Context:**
  - Domain layer: `User` entity with role, shift and institution.
  - Application layer: reactive `iamStore` wired to the shared session and the `IamService` authentication workflows.
  - Infrastructure layer: `IamApi` gateway with credential validation on login, error feedback, show/hide password toggle and sign out through the IAM service.
  - Presentation layer: staff account management restricted to administrators and self-service profile with view and edit modes.
- **Subscription:**
  - Subscription scoped to the signed-in user's institution.
  - Grace period banner for pending subscriptions and an access-suspended screen for institutions with an overdue subscription.
- **Shared:**
  - Access guard that combines the IAM session with the subscription state on every navigation.
  - Role-based access: subscription and staff account management restricted to administrators.

### Changed
- Nothing yet.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [2.0.0] - 2026-10-06

### Added
- **Stage Release for TB1:**
  - Complete web application with seven bounded contexts on mock persistence: Patient Registration, Vital Signs Capture, Triage Classification, Specialty Assignment, Alerting, Panel and Reports, and Shared.
  - Internationalized interface (English and Spanish), PrimeVue Material UI, animated feedback and a responsive shell.
  - Firebase Hosting configuration with Realtime Database as the production backend.
- Full feature detail is documented in versions 1.1.0 through 1.8.0.

### Changed
- Nothing yet.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.8.0] - 2026-10-07

### Changed
- **Code Quality:**
  - Cleaned up comments across all modules and documented views with JSDoc in preparation for the TB1 stage review.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Added
- Nothing yet.

### Security
- Nothing yet.

## [1.7.0] - 2026-10-06

### Added
- **Patient Registration Domain Layer:**
  - Added `Patient` and `Episode` aggregates with domain invariants to the patient registration bounded context.

### Changed
- **Shared Kernel Extraction:**
  - Moved the triage level concept to the shared kernel, breaking the domain-to-domain coupling between patient registration and triage classification.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.6.0] - 2026-10-06

### Added
- **Alerting:**
  - Notification bell loads persisted alerts from the data source and maps them into the alert center with `pushAlerts`.
- **Triage Classification:**
  - Priority pill uses the classification level color.

### Changed
- **Data:**
  - Synchronized the `db.json` seed and ignored the local `.firebase` directory.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.5.0] - 2026-10-05

### Added
- **Alerting:**
  - GSAP animations, escalation to Trauma Shock and clinical alert rules for out-of-range vital signs.
- **Triage Classification:**
  - Out-of-range vital alert generation on classification confirmation.
- **Specialty Assignment:**
  - Suggest validation fix and referral completion closure.
- **Vital Signs Capture:**
  - Device link/unlink fixes and automatic device release when the referral is completed.
- **Configuration:**
  - Firebase Hosting configuration and Realtime Database production environment.

### Changed
- **Layout:**
  - Responsive shell with hamburger drawer.
- **Patient Registration:**
  - Vitals panel badges, list meta and registration header UI polish.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.4.0] - 2026-10-05

### Added
- **Alerting:**
  - Consolidated the alerting bounded context module in `develop`.
- **Tooling:**
  - Added `extensions.json` with Vue Volar recommendations for the team workspace.

### Changed
- Nothing yet.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.3.0] - 2026-10-05

### Added
- **Triage Classification Bounded Context:**
  - `Classification` entity, `ClassificationAssembler` and `Nt158Engine` to suggest the priority level from the confirmed vital signs.
  - Classification view with confirmation or adjustment of the suggested level, and persistence through `json-server`.
- **Specialty Assignment Bounded Context:**
  - `Referral` and `Voucher` entities, assemblers and `SpecialtyRules` for symptom-based assignment.
  - Coded symptom catalog with autocomplete, referral voucher and specialty queues.
- **Vital Signs Capture Bounded Context:**
  - Device management view, device linking to episodes and automatic release when the referral is completed.
  - Simulated automatic readings and manual entry, with `VitalsConfirmedEvent` published on confirmation.
- **Panel and Reports:**
  - Triage dashboard with stats, episode flow status and specialty queues.
  - Shift reports with care log, alert log and triage metrics.
- **Patient File:**
  - Device link selector with free-inventory listing, device status and power-on state, and tab-aware link form behavior.

### Changed
- **Devices:**
  - Removed the redundant template catalog covered by the manual link form.

### Fixed
- Missing reactive references in the patient file link flow (`linkErr`, `showForm`) that left the link selector non-functional.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.2.0] - 2026-10-01

### Changed
- **Internationalization:**
  - Moved locale catalogs to `src/locales` for a cleaner shared structure.

### Fixed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Added
- Nothing yet.

### Security
- Nothing yet.

## [1.1.0] - 2026-10-01

### Added
- **Authentication:**
  - Login with password recovery, i18n keys and language switching.
- **Patient Registration Bounded Context:**
  - In-memory store with document types and the patient list, registration form and patient file with vital signs capture.
  - Patient autofill by document number with animated toast notifications and a vital-sign confirmation toast.
- **Routing:**
  - Patient routes and placeholder modules for the remaining bounded contexts.

### Changed
- Nothing yet.

### Fixed
- Removed the duplicate confirmation toast on vital sign confirmation.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Security
- Nothing yet.

## [1.0.0] - 2026-09-30

### Added
- **Project Foundation:**
  - Initial commit with the Vue 3 + Vite project structure and dependency setup.
  - PrimeVue integrated with the Material theme in `main.js`, plus PrimeIcons.
  - Sidebar component (`sidebar.vue`) with the navigation menu and the main layout in `app.vue`.
- **Configuration:**
  - Dependency updates in `package.json` and lockfile.
  - PrimeUI license badge hidden with layout style fixes.
