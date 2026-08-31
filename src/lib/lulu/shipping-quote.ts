import "server-only";
import { calculatePrintJobCost, type LuluShippingAddress } from "@/lib/lulu/client";
import { LULU_POD_PACKAGE_ID } from "@/lib/lulu/product";
import {
  CARNET_SHIPPING_OPTIONS,
  type CarnetCountry,
  type CarnetShippingOption,
} from "@/lib/books/shipping";

/**
 * Representative address per country for shipping quotes. Lulu prices shipping
 * at the country level, so a big-city address stands in for the customer's
 * (which we don't know yet: Stripe collects it during checkout, after the
 * shipping options are fixed).
 */
const QUOTE_ADDRESSES: Record<CarnetCountry, { street1: string; city: string; postcode: string }> = {
  FR: { street1: "1 rue de Rivoli", city: "Paris", postcode: "75001" },
  BE: { street1: "Rue de la Loi 16", city: "Bruxelles", postcode: "1000" },
  CH: { street1: "Bahnhofstrasse 1", city: "Zürich", postcode: "8001" },
  LU: { street1: "1 Rue du Fossé", city: "Luxembourg", postcode: "1536" },
  MC: { street1: "1 Avenue de la Costa", city: "Monaco", postcode: "98000" },
  DE: { street1: "Unter den Linden 1", city: "Berlin", postcode: "10117" },
  NL: { street1: "Dam 1", city: "Amsterdam", postcode: "1012 JS" },
  PT: { street1: "Praça do Comércio 1", city: "Lisboa", postcode: "1100-148" },
  IE: { street1: "1 O'Connell Street", city: "Dublin", postcode: "D01 F5P2" },
  AT: { street1: "Stephansplatz 1", city: "Wien", postcode: "1010" },
  GB: { street1: "1 Regent Street", city: "London", postcode: "SW1Y 4NR" },
};

interface LuluCostQuote {
  total_cost_incl_tax?: string;
}

async function quoteTotalCents(
  country: CarnetCountry,
  pageCount: number,
  level: "MAIL" | "EXPRESS",
): Promise<number> {
  const address: LuluShippingAddress = {
    name: "Devis Les Flèches",
    ...QUOTE_ADDRESSES[country],
    country_code: country,
    phone_number: "+33600000000",
  };
  const quote = (await calculatePrintJobCost({
    lineItems: [{ podPackageId: LULU_POD_PACKAGE_ID, pageCount, quantity: 1 }],
    shippingAddress: address,
    shippingOption: level,
  })) as LuluCostQuote;
  const total = Number(quote.total_cost_incl_tax);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`Lulu ${level} quote for ${country} returned no usable total.`);
  }
  return Math.round(total * 100);
}

/**
 * Shipping options for a given destination, priced from live Lulu quotes.
 *
 * Standard (MAIL) stays bundled in the carnet price: its real cost only spans
 * roughly €10 to €16 across every country we ship to (measured 2026-08-31), so
 * a flat included tier is safe. Express varies wildly by country (€19 to €67
 * all-in), so its surcharge is the REAL Lulu delta over standard, rounded up
 * to the next 50 cents; a flat figure would lose serious money outside France.
 *
 * If the express quote fails, the customer simply gets standard only. The
 * static CARNET_SHIPPING_OPTIONS provide labels and delivery estimates.
 */
export async function quoteCarnetShippingOptions(
  country: CarnetCountry,
  pageCount: number,
): Promise<CarnetShippingOption[]> {
  const standard = CARNET_SHIPPING_OPTIONS.find((o) => o.key === "standard")!;
  const express = CARNET_SHIPPING_OPTIONS.find((o) => o.key === "express")!;
  try {
    const [mailCents, expressCents] = await Promise.all([
      quoteTotalCents(country, pageCount, "MAIL"),
      quoteTotalCents(country, pageCount, "EXPRESS"),
    ]);
    const delta = expressCents - mailCents;
    if (delta <= 0) return [standard];
    const surcharge = Math.ceil(delta / 50) * 50;
    return [standard, { ...express, amountCents: surcharge }];
  } catch (err) {
    console.error(`Devis express Lulu indisponible (${country}):`, err);
    return [standard];
  }
}
