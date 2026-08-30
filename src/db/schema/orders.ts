import { pgTable, uuid, text, integer, serial, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/**
 * A paid carnet order. Rows are inserted only on `checkout.session.completed`
 * (never at checkout start), so `invoiceSeq` advances solely for real, paid
 * orders — keeping invoice numbers sequential without gaps from abandoned carts.
 *
 * Fulfillment (the Lulu print job) is attempted right after the row lands; its
 * outcome is tracked on `status` / `luluJobId` / `fulfillmentError` so a failed
 * print submission can be retried without re-charging the customer.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // The carnet this order prints (books.code). Kept as plain text, not an FK:
    // an order is a permanent financial record and must survive the book being
    // edited or deleted afterwards.
    bookCode: text("book_code").notNull(),
    bookTitle: text("book_title").notNull(),
    email: text("email").notNull(),

    // Money, in the currency minor unit (cents), exactly as charged by Stripe.
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("eur"),

    // Stripe references. sessionId is the idempotency key for the webhook.
    stripeSessionId: text("stripe_session_id").notNull().unique(),
    stripePaymentIntent: text("stripe_payment_intent"),

    // Shipping snapshot as collected by Stripe Checkout (name + address + phone),
    // frozen at purchase time for fulfillment and records.
    shipping: jsonb("shipping").notNull(),
    phone: text("phone"),

    // Sequential invoice counter → formatted as FL-YYYY-NNNN at render time.
    invoiceSeq: serial("invoice_seq").notNull(),

    // paid → in_production (Lulu job created) → shipped; or failed on error.
    status: text("status").notNull().default("paid"),
    luluJobId: integer("lulu_job_id"),
    fulfillmentError: text("fulfillment_error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("orders_book_code_idx").on(table.bookCode)],
);
