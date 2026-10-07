# Visitor Registration 500 Error Fix

The visitor registration API now returns a clear configuration error instead of a generic 500 when Firebase Admin credentials are missing or malformed.

## Required Vercel Production variables

Recommended:
- FIREBASE_SERVICE_ACCOUNT_JSON

The value must be the complete Firebase service-account JSON.

Alternative:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

The private key may contain escaped `\n` sequences; the server normalizes them.

Also keep the existing Razorpay and Google Drive variables configured.

After adding/changing environment variables, redeploy the Vercel Production deployment.

## What was changed

- More robust Firebase Admin credential parsing.
- Supports a base64-encoded service-account JSON as a fallback.
- Supports separate Firebase Admin environment variables.
- Visitor registration now returns HTTP 503 with a useful configuration message if Firebase Admin cannot initialize.
- Visitor payment verification now fails safely if RAZORPAY_KEY_SECRET is missing instead of silently accepting a payment signature.
- Existing visitor/event/Abheri data structures are preserved.
