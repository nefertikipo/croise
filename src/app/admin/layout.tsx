import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminEmail } from "@/lib/admin";

export const metadata = {
  title: "Admin - Les Flèches",
  robots: { index: false, follow: false },
};

// Per-request auth check; never cache an admin page.
export const dynamic = "force-dynamic";

const ADMIN_LINKS = [
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/label", label: "Étiquetage" },
  { href: "/admin/calibration", label: "Calibration" },
  { href: "/admin/contribute", label: "Contribuer" },
];

/** Every /admin page is invisible (404) unless the viewer is in ADMIN_EMAILS. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) notFound();

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-4 border-b-2 border-ink bg-ink px-6 py-2 text-xs uppercase tracking-wide text-paper">
        <span className="font-bold">Admin</span>
        {ADMIN_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
            {l.label}
          </Link>
        ))}
        <span className="ml-auto normal-case tracking-normal text-paper/60">{adminEmail}</span>
      </nav>
      {children}
    </div>
  );
}
