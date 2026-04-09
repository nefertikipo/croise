import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-6">
        <Link
          href="/"
          className="font-bold text-lg"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Les Fleches
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/fleche" className="text-muted-foreground hover:text-foreground transition-colors">
            Creer
          </Link>
          <Link href="/contribuer" className="text-muted-foreground hover:text-foreground transition-colors">
            Contribuer
          </Link>
          <Link href="/admin/label" className="text-muted-foreground hover:text-foreground transition-colors">
            Scorer
          </Link>
        </div>
      </div>
    </nav>
  );
}
