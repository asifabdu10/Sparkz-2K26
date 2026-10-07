# Visitor Pass Payment Fix

## What was fixed

- Replaced the Razorpay Node SDK order creation path with a direct server-side Razorpay Orders API request. This avoids SDK/runtime incompatibilities and guarantees that the API route returns JSON errors.
- Added explicit Node.js runtime and dynamic execution to the Razorpay order route.
- Added safe response parsing in the visitor registration page so an HTML error page can no longer produce the confusing `Unexpected token '<'` JSON error.
- Added the same safe response handling to the shared Razorpay payment button.
- Updated visitor-pass fallback fee values to ₹1 so the code remains consistent with the current ₹1 visitor-pass configuration.
- Kept Razorpay secret credentials server-side. Do not put `RAZORPAY_KEY_SECRET` in a `NEXT_PUBLIC_*` variable.

## Required deployment environment variables

The deployment must have:

- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — Razorpay Key ID used by the browser checkout.
- `RAZORPAY_KEY_ID` — Razorpay Key ID used by the server.
- `RAZORPAY_KEY_SECRET` — Razorpay Key Secret; server-only.
- The existing Firebase Admin/service-account variables already required by this project.

After changing environment variables, create a **new deployment**. Existing deployments do not automatically receive changed environment variables.

## Important

The source project cannot verify the production server's private environment variables. If the deployment still reports that payment is not configured after deploying this ZIP, add/verify the three Razorpay variables above in the hosting provider and redeploy.
