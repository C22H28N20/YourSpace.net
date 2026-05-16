"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type Summary = {
  username: string;
  roomCount: number;
  friendRequestCount: number;
  inviteCount: number;
};

export default function HomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    async function loadSummary() {
      // Pull the dashboard counts in one pass so the landing page reflects live account state.
      const [authResponse, roomsResponse, requestsResponse, invitesResponse] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/rooms", { credentials: "include" }),
        fetch("/api/friends/requests", { credentials: "include" }),
        fetch("/api/invites", { credentials: "include" })
      ]);

      const authData = authResponse.ok ? await authResponse.json() : null;
      const roomsData = roomsResponse.ok ? await roomsResponse.json() : { rooms: [] };
      const requestsData = requestsResponse.ok ? await requestsResponse.json() : { requests: [] };
      const invitesData = invitesResponse.ok ? await invitesResponse.json() : { invites: [] };

      setSummary({
        username: authData?.user?.username ?? "guest",
        roomCount: roomsData.rooms.length,
        friendRequestCount: requestsData.requests.length,
        inviteCount: invitesData.invites.length
      });
    }

    void loadSummary();
  }, []);

  return (
    <PageShell title="Home Feed" subtitle="Status updates, room invites, and active friends.">
      <div className="stack">
        <section className="widget">
          <h3>Announcements</h3>
          <p>
            {summary
              ? `${summary.username}, you have ${summary.roomCount} joined rooms, ${summary.friendRequestCount} friend requests, and ${summary.inviteCount} room invites.`
              : "Loading dashboard summary..."}
          </p>
        </section>
        <section className="widget">
          <h3>Quick Actions</h3>
          {/* Keep the dashboard actions as navigation-only buttons. */}
          <div className="pill-row">
            <Link href="/rooms"><button type="button">Create Room</button></Link>
            <Link href="/invites"><button type="button">Send Invite</button></Link>
            <Link href="/settings"><button type="button">Edit Profile</button></Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
