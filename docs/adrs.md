# Architecture Decision Records (ADRs)

## Overview
This document records the key architectural decisions of the Tri-Aid web application. Each record follows the Architecture Decision Record format (Status, Context, Decision, Consequences) to explain why the current structure and technologies are in place.

---

## Table of Contents
- [ADR-001: Domain-Driven Design Layered Architecture with Bounded Contexts](#adr-001-domain-driven-design-layered-architecture-with-bounded-contexts)
- [ADR-002: Core Frontend Framework: Vue 3 with Composition API and Vite](#adr-002-core-frontend-framework-vue-3-with-composition-api-and-vite)
- [ADR-003: State Management with Vue Reactive Stores per Bounded Context](#adr-003-state-management-with-vue-reactive-stores-per-bounded-context)
- [ADR-004: UI Layer: PrimeVue with Own Design Tokens and GSAP Animations](#adr-004-ui-layer-primevue-with-own-design-tokens-and-gsap-animations)
- [ADR-005: Centralized HTTP Client and Endpoint Abstraction with Tenant Scoping](#adr-005-centralized-http-client-and-endpoint-abstraction-with-tenant-scoping)
- [ADR-006: Data Transformation via Assembler and Resource Pattern](#adr-006-data-transformation-via-assembler-and-resource-pattern)
- [ADR-007: Route Protection by Session, Role and Subscription State](#adr-007-route-protection-by-session-role-and-subscription-state)
- [ADR-008: Internationalization with Vue I18n](#adr-008-internationalization-with-vue-i18n)

---

## ADR-001: Domain-Driven Design Layered Architecture with Bounded Contexts

### Status
Accepted

### Context
The triage workflow crosses several business capabilities (patient registration, vital signs, classification, referral, alerts, access and subscriptions). The team splits the work by capability, so the code must let each one evolve without breaking the others.

### Decision
Organize `src` by bounded context: `iam`, `patient-registration`, `vital-signs-capture`, `triage-classification`, `specialty-assignment`, `alerting` and `subscription`, plus `shared`. Each context uses up to four layers:
1. **Domain**: entities, domain events and domain services (`Patient`, `Episode`, `Classification`, `Referral`, `Alert`, `Nt158Engine`).
2. **Application**: reactive stores that hold state and coordinate use cases (`iamStore`, `subscriptionStore`, `alertStore`).
3. **Infrastructure**: API gateways, services, assemblers and resources (`TriageApi`, `AlertingService`, `ClassificationAssembler`).
4. **Presentation**: views, components and route modules.

`panel` and `reports` only have a presentation layer, because they display data owned by other contexts.

### Consequences
- **Positive:**
  - Work on one capability stays inside one folder, which reduces merge conflicts.
  - Business rules stay out of the views.
- **Negative:**
  - Contexts that read data from others (`panel`, `reports`) depend on several stores at once.
  - Not every context uses all layers yet, so the structure is not fully uniform.

---

## ADR-002: Core Frontend Framework: Vue 3 with Composition API and Vite

### Status
Accepted

### Context
The course requires Vue for the frontend web application. The team also needed fast local builds and hot reload while working on many views in parallel.

### Decision
Use **Vue 3** with Single-File Components and `<script setup>`, bundled with **Vite**. Routes are declared per bounded context and loaded lazily with dynamic `import()`.

### Consequences
- **Positive:**
  - Fast startup and hot reload during development.
  - Lazy-loaded routes keep each view in its own chunk.
- **Negative:**
  - The production bundle still produces large chunks, and Vite shows a size warning on build.

---

## ADR-003: State Management with Vue Reactive Stores per Bounded Context

### Status
Accepted

### Context
Several views share the same data: the sidebar shows the signed-in user, the notification bell shows alerts produced while classifying a patient, and the dashboard reads patients, classifications and referrals.

### Decision
Use Vue's own `reactive()` and `computed()` to build one store module per context, without an additional state library:
- `iamStore` (signed-in user, roles and session restore).
- `subscriptionStore` (plans and current subscription).
- Patient Registration `store` (patients and episodes).
- `deviceStore` and the vitals store functions (devices and readings).
- `alertStore` (notification bell items).

Services are kept with `markRaw()` inside the stores so they are not made reactive.

### Consequences
- **Positive:**
  - No extra dependency; the stores are plain modules imported where needed.
  - State is shared between views without passing props through many levels.
- **Negative:**
  - There is no store devtools integration.
  - The shape of each store is a convention, not an enforced API, so it must be kept consistent by review.

---

## ADR-004: UI Layer: PrimeVue with Own Design Tokens and GSAP Animations

### Status
Accepted

### Context
The application needs a consistent visual identity that matches the landing page, and the course defines PrimeVue as the component library and Material Design as the design language.

### Decision
- Register **PrimeVue** with the **Material** preset, the confirmation service and `ConfirmDialog`, and use **PrimeIcons** for icons.
- Define the visual system in `shared/presentation/styles/tokens.css` and `ui.css`, and build shared components (`sidebar`, `auth-shell`, `toast-host`, `lang-switch`, `patient-banner`).
- Use **GSAP** for interface animations (notification bell, toasts, language switch, subscription checkout) and respect `prefers-reduced-motion`.

### Consequences
- **Positive:**
  - The interface keeps the same look across all bounded contexts.
  - Animations are disabled for users who ask the system to reduce motion.
- **Negative:**
  - Most views are built with own components and styles, so they do not benefit from PrimeVue's ready-made components.
  - Two styling sources (PrimeVue theme and own tokens) must be kept aligned.

---

## ADR-005: Centralized HTTP Client and Endpoint Abstraction with Tenant Scoping

### Status
Accepted

### Context
Every context reads and writes data. The backend changes between environments (`json-server` in development, Firebase Realtime Database in production), and several institutions use the same deployment, so clinical data from one institution must not appear in another.

### Decision
1. `BaseApi` creates a single Axios instance with the base URL from `VITE_TRIAGE_PLATFORM_API_URL`.
2. `BaseEndpoint` exposes `getAll`, `getById`, `create`, `update` and `delete`, adds the `.json` suffix when the backend is Firebase, and normalizes collection responses into arrays.
3. Endpoints created with `tenantScoped: true` tag new records with the signed-in institution and filter reads by it. Catalogs (plans, specialties, symptoms) and IAM stay global.

### Consequences
- **Positive:**
  - The same API classes work against both backends.
  - Clinical data is filtered per institution without repeating logic in each context.
- **Negative:**
  - The tenant filter runs in the browser; real isolation must also be enforced by the backend API.

---

## ADR-006: Data Transformation via Assembler and Resource Pattern

### Status
Accepted

### Context
The backend stores flat records, while the domain uses entities with their own states and rules. Binding raw payloads to the views would tie the interface to the storage format.

### Decision
Use assemblers and resources in the infrastructure layer to translate between payloads and entities:
- Triage Classification: `ClassificationAssembler` and `ClassificationResource`.
- Specialty Assignment: `ReferralAssembler`, `ReferralResource`, `VoucherAssembler` and `VoucherResource`.

Other contexts (IAM, Alerting, Subscription) map payloads to entities inside their service classes.

### Consequences
- **Positive:**
  - Changes in the storage format only affect the assembler of that context.
- **Negative:**
  - The pattern is not applied in every context yet, so mapping lives in two different places depending on the context.

---

## ADR-007: Route Protection by Session, Role and Subscription State

### Status
Accepted

### Context
Only signed-in staff may use the application, some screens are only for administrators, and an institution with an overdue subscription must not keep using the clinical modules.

### Decision
Install a global `router.beforeEach` that calls `accessGuard`:
- Public paths (`/login`, `/register`, `/recuperar`) redirect signed-in users to `/panel`.
- Without a session, any other path redirects to `/login`.
- `/subscriptions` and `/users` require the administrator role.
- With an overdue subscription, only `/subscriptions` and `/acceso-suspendido` are allowed.

The session id is kept in `sessionStorage` and restored by `iamStore` before each protected navigation.

### Consequences
- **Positive:**
  - Access rules live in a single function instead of every view.
  - The landing page can send a visitor to `/register` with a preselected plan.
- **Negative:**
  - Client-side guards only protect navigation; the backend must validate every request on its own.

---

## ADR-008: Internationalization with Vue I18n

### Status
Accepted

### Context
The course requires English (default) and Latin American Spanish in the user interface.

### Decision
Use **Vue I18n** in composition mode with `src/locales/en.json` and `src/locales/es.json`, configured in `shared/application/i18n.js`:
- English is the default and fallback language.
- The selected language is saved in `localStorage` and applied to the `lang` attribute of the document.
- The `lang-switch` component changes the language from the app shell and the auth screens.

### Consequences
- **Positive:**
  - The interface text is outside the components and changes at runtime.
  - The `lang` attribute stays correct for screen readers.
- **Negative:**
  - Both catalogs must be updated together; a missing key shows the key instead of the text.

---
