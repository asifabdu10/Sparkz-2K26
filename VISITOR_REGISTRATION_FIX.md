# Sparkz 2K26 — Visitor & Alumni Registration Fix

## Fixed production failure

After a successful Razorpay checkout, `/api/visitor-registration/submit` was returning HTTP 500. The browser then attempted to parse the HTML error page as JSON and displayed:

`Unexpected token '<', '<!DOCTYPE '... is not valid JSON`

The submit route now uses the shared Firebase Admin helper, performs verified Google authentication, and converts all expected/unexpected failures into JSON responses.

## Current registration rules

### Visitor pass

- Google authentication is required.
- The visitor must have exactly one confirmed paid Sparkz departmental event registration.
- The visitor must upload the required college ID proof.
- Normal visitors must complete the configured Razorpay payment.
- The visitor-pass amount is read from `eventSettings/visitorPass.fee` and is never forced to ₹1 or ₹250.
- Admins retain their existing administrative bypass/direct-pass capability.
- Duplicate active visitor passes are rejected.

### Alumni

- Google authentication is required.
- The server verifies the Google Firebase ID token.
- Duplicate active alumni registrations are rejected.
- Alumni registration status/capacity remains controlled by the existing admin settings.

## Security changes

- Removed duplicate Firebase Admin initialization from the main visitor/alumni submit paths.
- Removed the insecure JWT decode fallback from visitor registration.
- Visitor/alumni server routes require a verified Firebase ID token.
- Visitor and alumni user-facing flows require the Google provider.
- Visitor proof upload now also requires a verified Google-authenticated session.
- Visitor payment signature verification fails safely when `RAZORPAY_KEY_SECRET` is missing instead of silently accepting a payment.
- Visitor status no longer returns a fake successful fee when Firebase Admin is unavailable.
- Firestore `visitor_registrations` and `alumni_registrations` remain restricted for direct client creation; public creation goes through the secure server APIs.

## Validation

The modified TypeScript/TSX files were transpiled with the TypeScript compiler successfully. A full `npm run build` could not be completed in the working environment because the uploaded project's dependency installation timed out and the resulting `node_modules` was incomplete.
