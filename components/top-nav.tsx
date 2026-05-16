"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentUser } from "@/lib/backend";

// Navigation link structure
type NavLink = {
  href: string;
  label: string;
};

// Renders navigation tabs and highlights the currently active route.
// Auth state is resolved client-side so the shared layout can render immediately.
export function TopNav() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    async function loadCurrentUser() {
      const response = await fetch("/api/auth/me", { credentials: "include" });

      if (!response.ok) {
        setCurrentUser(null);
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user ?? null);
    }

    void loadCurrentUser();
  }, []);

  const navLinks: NavLink[] = currentUser
    ? [
        { href: "/home", label: "Home" },
        { href: "/rooms", label: "Rooms" },
        { href: "/invites", label: "Invites" },
        { href: "/friends", label: "Friends" },
        { href: "/messages", label: "Messages" },
        { href: `/users/${currentUser.username}`, label: "Profile" },
        { href: "/settings", label: "Settings" },
        ...(currentUser.isAdmin ? [{ href: "/admin/database", label: "Admin" }] : [])
      ]
    : [
        { href: "/home", label: "Home" },
        { href: "/auth", label: "Login" },
        { href: "/rooms", label: "Rooms" },
        { href: "/invites", label: "Invites" },
        { href: "/friends", label: "Friends" }
      ];

  return (
    <nav aria-label="Main navigation" className="top-nav">
      {navLinks.map((item) => {
        // Tab is active if URL matches exactly or starts with the tab's href (for nested routes)
        const isActive =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            className={`tab-link ${isActive ? "is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
