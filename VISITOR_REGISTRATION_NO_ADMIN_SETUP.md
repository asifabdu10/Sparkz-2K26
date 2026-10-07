# Sparkz 2K26 — Visitor Registration Authentication & Server Setup

Visitor-pass registration now requires a Google-authenticated Firebase account.

The public visitor flow is:

Google sign-in → exactly one confirmed paid departmental event → ID proof upload → configured visitor-pass payment → server-side payment verification → `visitor_registrations`.

The public registration is finalized by the server API. Firestore rules keep direct client creation restricted to admins.

## Visitor-pass transaction amount

The visitor-pass fee is controlled by the admin configuration document:

`eventSettings/visitorPass.fee`

The value shown in the UI, Razorpay order, saved registration, and confirmation email must come from this configuration. A test value such as ₹1 is valid when the admin has configured ₹1; it is not hard-coded by the application.

## Required production variables

- `FIREBASE_SERVICE_ACCOUNT_JSON` (or the existing supported Firebase Admin credential variable)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` for confirmation email
- Existing Google Drive OAuth variables for visitor proof uploads
- Existing `NEXT_PUBLIC_FIREBASE_*` variables for the client Firebase application

Never commit service-account JSON, private keys, Razorpay secrets, SMTP passwords, or Google OAuth refresh tokens to the repository.

## Alumni registration

Alumni registration also requires Google authentication. The server verifies the Firebase ID token and requires the Google provider before creating an `alumni_registrations` document.
