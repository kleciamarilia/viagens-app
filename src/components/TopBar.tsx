import Link from "next/link";

export default function TopBar() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/trips" className="flex items-center gap-2 font-semibold text-primary-dark">
          <span className="text-xl">✈️</span>
          <span>Nossas Viagens</span>
        </Link>
      </div>
    </header>
  );
}
