"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryOrderFulfillment } from "@/actions/orders";

export function RetryFulfillmentButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();

  function retry() {
    if (!window.confirm("Relancer l'impression chez Lulu ? Le client ne sera pas re-débité.")) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await retryOrderFulfillment(orderId);
        if (res.success) {
          toast.success(`Job Lulu #${res.luluJobId} créé.`);
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        console.error(err);
        toast.error("Relance impossible. Réessayez.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={retry}>
      {pending ? "Envoi…" : "Relancer l'impression"}
    </Button>
  );
}
