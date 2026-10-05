import {
  saveRazorpayOrderIdSafe,
  reconcileSuccessfulPayment,
  findRegistrationDoc,
} from "./paymentReconciliation";
import { getAdminFirestore } from "./firebaseAdmin";

/**
 * Backward compatibility wrapper for saveRazorpayOrderIdServerSide.
 * Uses atomic transaction and refuses to downgrade paid status to pending.
 */
export async function saveRazorpayOrderIdServerSide(args: {
  registrationId: string;
  orderId: string;
}) {
  return saveRazorpayOrderIdSafe(args);
}

/**
 * Backward compatibility wrapper for updateRegistrationPaymentServerSide.
 * Delegates to the centralized reconcileSuccessfulPayment engine.
 */
export async function updateRegistrationPaymentServerSide(args: {
  registrationId: string;
  paymentId: string;
  orderId: string;
  status?: string;
}) {
  const result = await reconcileSuccessfulPayment({
    razorpayOrderId: args.orderId,
    razorpayPaymentId: args.paymentId,
    registrationId: args.registrationId,
    source: "verify_payment_api",
  });

  if (!result.success && !result.alreadyReconciled) {
    throw new Error(result.error || "Payment reconciliation failed");
  }
}

/**
 * Backward compatibility wrapper for findRegistrationIdByOrderId.
 */
export async function findRegistrationIdByOrderId(orderId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const docRef = await findRegistrationDoc(db, { razorpayOrderId: orderId });
  return docRef ? docRef.id : null;
}
