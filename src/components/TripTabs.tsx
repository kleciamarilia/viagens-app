"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/trips/${tripId}/roteiro`, label: "Roteiro", icon: "🗺️" },
    { href: `/trips/${tripId}/passeios`, label: "Passeios", icon: "📅" },
    { href: `/trips/${tripId}/despesas`, label: "Despesas", icon: "💰" },
  ];

  return (
    <nav className="flex gap-1 border-b border-border mt-4 -mb-px">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              active
                ? "border-primary text-primary-dark"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
