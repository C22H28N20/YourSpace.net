"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type RoomInvite = {
  invite_id: number;
  chatroom_id: number;
  sender_id: number;
  status: string;
  chatroom_name: string;
  chatroom_slug: string;
  username: string;
};

export default function InvitesPage() {
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInvites() {
      const response = await fetch("/api/invites", { credentials: "include" });

      if (response.ok) {
        const data = await response.json();
        const raw = data.invites ?? [];
        const normalized = raw.map((i: any) => ({
          invite_id: i.invite_id ?? i.inviteId,
          chatroom_id: i.chatroom_id ?? i.room_id ?? i.roomId ?? i.chatroom_id,
          sender_id: i.sender_id ?? i.senderId ?? i.sender_user_id,
          recipient_id: i.recipient_id ?? i.recipientId,
          status: i.status,
          created_at: i.created_at ?? i.createdAt,
          chatroom_name: i.chatroom_name ?? i.chatroomName ?? i.chatroom_name,
          chatroom_slug: i.chatroom_slug ?? i.chatroomSlug ?? i.chatroom_slug,
          username: i.username
        }));
        setInvites(normalized as RoomInvite[]);
      }

      setIsLoading(false);
    }

    void loadInvites();
  }, []);

  async function respondToInvite(inviteId: number, status: "accepted" | "declined") {
    const response = await fetch(`/api/invites/${inviteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      setInvites((current) => current.filter((invite) => invite.invite_id !== inviteId));
    }
  }

  return (
    <PageShell title="Invites" subtitle="Manage incoming and outgoing room invites.">
      <section className="widget">
        <h3>Pending Invites</h3>
        {isLoading ? (
          <p>Loading invites...</p>
        ) : invites.length === 0 ? (
          <p>No pending invites at this time.</p>
        ) : (
          <ul className="list-grid">
            {invites.map((invite) => (
              <li key={invite.invite_id}>
                <span>
                  {invite.username} invited you to {invite.chatroom_name}
                </span>
                <div className="pill-row">
                  <button type="button" onClick={() => respondToInvite(invite.invite_id, "accepted")}>Accept</button>
                  <button type="button" className="secondary" onClick={() => respondToInvite(invite.invite_id, "declined")}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
