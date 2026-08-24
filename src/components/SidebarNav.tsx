"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/roster", label: "Roster" },
  { href: "/analysis", label: "Analysis" },
  { href: "/reports", label: "Reports" },
];

export function SidebarNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
          {link.label}
        </Link>
      ))}
      {isOwner && (
        <Link href="/sync" className={pathname === "/sync" ? "active" : ""}>
          Sync
        </Link>
      )}
    </nav>
  );
}
