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
