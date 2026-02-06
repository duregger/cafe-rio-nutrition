# Security Best Practices – Cafe Rio Nutrition

This document maps the recommended security practices to this project and what’s already in place.

---

## Current State

### What’s already in place

| Practice | Status |
|----------|--------|
| **No secrets in source** | `.env` is in `.gitignore`; Firebase config uses `import.meta.env.VITE_*` |
| **Environment-based config** | `.env.example` documents required vars; no hardcoded keys |
| **Firebase client keys** | Web API keys are intended to be public; security is enforced by Firestore rules and Auth |
| **Domain restriction** | Auth limited to `@caferio.com` |
| **API key storage** | API keys stored in Firestore `apiKeys` collection, not in code |

---

## Recommended Actions

### 1. Zero-code storage (secrets)

- **Firebase client config**: Uses env vars; keep `.env` out of version control.
- **Cloud Functions**: Use default Application Default Credentials; no service account JSON in repo.
- **API keys for external services**: If you add any, use [Secret Manager](https://cloud.google.com/secret-manager) and inject at runtime.

### 2. Disable dormant keys

- **Firebase**: [Firebase Console](https://console.firebase.google.com) → Project Settings → Service accounts → review and remove unused keys.
- **Google Cloud**: [IAM & Admin](https://console.cloud.google.com/iam-admin) → Service accounts → Keys → remove keys with no use in 30+ days.
- **Firestore `apiKeys`**: Add an Admin UI or script to list and deactivate keys with no recent use.

### 3. API restrictions

- **Firebase Web API key**: In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → APIs & Services → Credentials:
  - Restrict to: Firebase services (e.g. Authentication, Firestore).
  - Add HTTP referrer restrictions for your domains (e.g. `https://cafe-rio-nutrition.web.app/*`, `http://localhost:5173/*`).
- **Cloud Functions API**: Uses Firebase Auth + Firestore; no separate API key for Google APIs.

### 4. Least privilege

- **Cloud Functions service account**: In [IAM](https://console.cloud.google.com/iam-admin), ensure the default compute service account has only needed roles (e.g. Firestore, Auth).
- **Firestore rules**: Already scoped (e.g. `apiKeys` admin-only; user data by `userId`).

### 5. Key rotation and lifecycle

- **Firestore `apiKeys`**: Schema supports `expiresAt` (Firestore Timestamp); API middleware rejects expired keys.
- **Service account keys**: If you use custom keys, set `iam.serviceAccountKeyExpiryHours` or prefer Workload Identity where possible.

### 6. Operational safeguards

- **Essential Contacts**: [Google Cloud Console](https://console.cloud.google.com/iam-admin/settings) → Essential Contacts → add security and billing contacts.
- **Billing alerts**: [Billing](https://console.cloud.google.com/billing) → Budgets & alerts → create budgets and alerts for unexpected spend.

---

## Quick checklist

- [ ] Restrict Firebase Web API key (referrers + APIs)
- [ ] Review and remove unused service account keys
- [ ] Set Essential Contacts
- [ ] Configure billing budget and anomaly alerts
- [ ] Add `expiresAt` and rotation logic for Firestore `apiKeys` (optional)
- [ ] Run `npm audit` and address high/critical vulnerabilities

---

## References

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
