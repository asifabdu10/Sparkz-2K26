import crypto from "crypto";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    try {
        /*
         * IMPORTANT:
         * Razorpay webhook signature must be calculated
         * using the RAW request body.
         *
         * Do NOT use request.json() before verification.
         */
        const rawBody = await request.text();

        const signature =
            request.headers.get(
                "x-razorpay-signature"
            );

        const eventId =
            request.headers.get(
                "x-razorpay-event-id"
            );

        if (!signature) {
            console.error(
                "Razorpay webhook: missing signature"
            );

            return Response.json(
                {
                    error:
                        "Missing Razorpay webhook signature",
                },
                {
                    status: 400,
                }
            );
        }

        const webhookSecret =
            process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error(
                "RAZORPAY_WEBHOOK_SECRET is not configured"
            );

            return Response.json(
                {
                    error:
                        "Webhook secret not configured",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * -------------------------------------------------------
         * Verify Razorpay webhook signature
         * -------------------------------------------------------
         */

        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    webhookSecret
                )
                .update(rawBody)
                .digest("hex");

        const expectedBuffer = Buffer.from(expectedSignature, "utf8");
        const receivedBuffer = Buffer.from(signature, "utf8");

        if (
            expectedBuffer.length !== receivedBuffer.length ||
            !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
        ) {
            console.error(
                "Razorpay webhook signature mismatch"
            );

            return Response.json(
                {
                    error:
                        "Invalid webhook signature",
                },
                {
                    status: 400,
                }
            );
        }

        /*
         * -------------------------------------------------------
         * Signature is valid.
         * Now it is safe to parse the body.
         * -------------------------------------------------------
         */

        const payload =
            JSON.parse(rawBody);

        const event =
            payload.event;

        console.log(
            "Razorpay webhook received:",
            event
        );

        console.log(
            "Razorpay webhook event ID:",
            eventId
        );

        /*
         * -------------------------------------------------------
         * Handle successful payment
         * -------------------------------------------------------
         */

        if (
            event === "payment.captured" ||
            event === "order.paid"
        ) {
            const payment =
                payload?.payload?.payment?.entity;

            const order =
                payload?.payload?.order?.entity;

            console.log(
                "Payment captured:",
                {
                    paymentId:
                        payment?.id,

                    orderId:
                        payment?.order_id ||
                        order?.id,

                    amount:
                        payment?.amount,

                    status:
                        payment?.status,
                }
            );

            /*
             * You can add your Firestore update here.
             *
             * We will connect this to your registration
             * collection after confirming the webhook works.
             */
        }

        /*
         * -------------------------------------------------------
         * Handle failed payment
         * -------------------------------------------------------
         */

        if (
            event === "payment.failed"
        ) {
            const payment =
                payload?.payload?.payment?.entity;

            console.log(
                "Razorpay payment failed:",
                {
                    paymentId:
                        payment?.id,

                    orderId:
                        payment?.order_id,

                    errorCode:
                        payment?.error_code,

                    errorDescription:
                        payment?.error_description,
                }
            );
        }

        /*
         * -------------------------------------------------------
         * Always return 2xx after successful processing.
         * -------------------------------------------------------
         */

        return Response.json(
            {
                success: true,
                received: true,
                event,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(
            "Razorpay webhook error:",
            error
        );

        return Response.json(
            {
                error:
                    "Webhook processing failed",
            },
            {
                status: 500,
            }
        );
    }
}