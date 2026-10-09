"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { getAdminEmail } from "@/lib/admin";
import { ORDER_STUCK_AFTER_MS, submitOrderForPrinting } from "@/lib/billing/submit-order";

/**
 * Admin: relaunch printing for a paid order whose Lulu submission failed (or
 * never finished). Re-submits from the frozen order snapshot; the customer is
 * not charged again.
 */
export async function retryOrderFulfillment(
  orderId: string,
): Promise<{ success: true; luluJobId: number } | { success: false; error: string }> {
  if (!(await getAdminEmail())) {
    return { success: false, error: "Accès refusé." };
  }

  // Atomic claim: only a failed order, or a paid one stuck past the threshold,
  // flips back to a fresh `paid`. A double click or a concurrent webhook finds
  // nothing to claim, so one payment can never become two print jobs.
  const stuckBefore = new Date(Date.now() - ORDER_STUCK_AFTER_MS);
  const [order] = await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        or(
          eq(orders.status, "failed"),
          and(eq(orders.status, "paid"), lt(orders.updatedAt, stuckBefore)),
        ),
      ),
    )
    .returning();
  if (!order) {
    return { success: false, error: "Commande introuvable ou déjà en cours d'impression." };
  }

  const result = await submitOrderForPrinting(order);
  revalidatePath("/admin/commandes");
  return result.ok
    ? { success: true, luluJobId: result.luluJobId }
    : { success: false, error: result.error };
}
