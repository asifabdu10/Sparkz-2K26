# Visitor Registration — Firebase Client Setup

Visitor Registration no longer requires `FIREBASE_SERVICE_ACCOUNT_JSON`.

The visitor payment endpoint verifies the Razorpay signature and the actual Razorpay order/payment server-side, then saves the visitor document through the Firebase Firestore REST API using the signed-in user's Firebase ID token. Firestore Security Rules remain the authorization boundary.

The Visitor Registration page continues to use the existing Firebase client SDK for eligibility checks and admin pages.

## Existing environment variables still used by Visitor Registration

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (for confirmation email)
- Existing Google Drive OAuth variables for proof uploads

## Important

This change only removes the Firebase Admin dependency from the Visitor Registration submission/status/email/proof-view flow used by the Visitor Registration UI. Other existing Sparkz features, especially the separate payment reconciliation system, may still use Firebase Admin and may still require its existing server credentials.
