# Razorpay payment reliability setup

This project now persists the Razorpay order ID before checkout and marks the Firestore registration as paid on the server after Razorpay signature verification. The Razorpay webhook can also reconcile a captured payment if the browser closes or loses connection.

## Required production environment variable

Configure this in Vercel Production (and locally when testing):

`FIREBASE_SERVICE_ACCOUNT_JSON`

Value: the complete Firebase service-account JSON for the same Firebase project. Store it only as a private environment variable. Do not commit it to the repository.

Existing Razorpay variables remain required:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_WEBHOOK_SECRET`

## Why this is required

Without the Firebase service-account credential, the server cannot safely update Firestore from the Razorpay webhook. The application therefore refuses to start a paid checkout when a registration ID is present but reconciliation is not configured, preventing a payment from being accepted while the registration can remain pending.
