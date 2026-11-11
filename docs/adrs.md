# Architecture Decision Records (ADRs)

## Overview
This document records the key architectural decisions of the Tri-Aid web application. Each record follows the Architecture Decision Record format (Status, Context, Decision, Consequences) to explain why the current structure and technologies are in place.

---

## Table of Contents
- [ADR-001: Domain-Driven Design Layered Architecture with Bounded Contexts](#adr-001-domain-driven-design-layered-architecture-with-bounded-contexts)

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
