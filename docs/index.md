---
layout: home

hero:
  name: nestjs-honeypot
  text: Admin-route honeypot for NestJS
  tagline: Intercept requests to a decoy admin path, record the intrusion attempt, and answer with a fake admin page or a redirect.
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: Configuration
      link: /configuration

features:
  - title: Decoy admin page
    details: Serves a believable login page at a configurable path (default /admin) without touching your real routes.
  - title: Intrusion signals
    details: Logs every hit and emits a honeypotHit event with method, path, IP and user agent — no credentials, ever.
  - title: Nest-native
    details: Dynamic module with forRoot / forRootAsync, class middleware, works with Express and Fastify adapters.
---

# What is a honeypot?

A honeypot is a decoy that has no legitimate purpose. A path like `/admin`
that no real route handles is exactly that: the only clients that request it
are scanners and attackers probing for an admin panel. Each request to the
decoy is a strong signal of hostile intent — legitimate users never see it.

## How nestjs-honeypot works

The package registers one middleware covering the whole application. For every
request whose path hits the configured honeypot path (default `/admin`,
including nested paths such as `/admin/login`):

1. The hit is logged and a `honeypotHit` event is emitted (if configured).
2. The request is answered with the built-in fake admin login page, your
   custom HTML, or a redirect to a configured URL.
3. The request never reaches a controller.

## Features

- Configurable protected path with case-insensitive, nested matching
- Built-in fake admin login page (no external assets, no frameworks)
- Custom HTML responses and 302 redirects
- Optional `honeypotHit` events via a standard Node.js `EventEmitter`
- Minimal logger contract (one `warn` method); NestJS `Logger` by default
- Works with the Express and Fastify adapters
- ESM and CommonJS builds, TypeScript declarations included

## What it does not protect against

This package is a detection and distraction tool, **not** a security
boundary. It does not:

- authenticate or authorize anyone,
- block, rate-limit or ban clients,
- protect against attacks on paths you actually expose,
- replace a reverse proxy, WAF or intrusion prevention system.

See [Security](/security) for details.
