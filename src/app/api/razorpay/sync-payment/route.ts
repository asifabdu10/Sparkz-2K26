import { NextRequest, NextResponse } from "next/server";
import { checkAndReconcileOrder } from "@/utils/server/paymentReconciliation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId") || undefined;
    const orderId = searchParams.get("orderId") || undefined;

    if (!registrationId && !orderId) {
      return NextResponse.json(
        { success: false, error: "Either registrationId or orderId is required" },
        { status: 400 }
      );
    }

    const result = await checkAndReconcileOrder({ registrationId, orderId });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[sync-payment] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const registrationId = body.registrationId ? String(body.registrationId).trim() : undefined;
    const orderId = body.orderId ? String(body.orderId).trim() : undefined;

    if (!registrationId && !orderId) {
      return NextResponse.json(
        { success: false, error: "Either registrationId or orderId is required" },
        { status: 400 }
      );
    }

    const result = await checkAndReconcileOrder({ registrationId, orderId });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[sync-payment] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 }
    );
  }
}
