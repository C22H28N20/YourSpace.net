"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type BlockedUser = {
  blockerId: number;
  blockedUserId: number;
  blockedUser: {
    id: number;
    username: string;
  };
};

export default function BlocksPage() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockUsername, setBlockUsername] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockSuccess, setBlockSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlockedUsers() {
      const response = await fetch("/api/blocks", { credentials: "include" });

      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.blocks ?? []);
      }

      setIsLoading(false);
    }

    void loadBlockedUsers();
  }, []);

  async function handleBlockUser() {
    if (!blockUsername.trim()) {
      setBlockError("Please enter a username");
      return;
    }

    setBlockError(null);
    setBlockSuccess(null);

    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: blockUsername })
      });

      if (!response.ok) {
        const data = await response.json();
        setBlockError(data.error || "Failed to block user");
        return;
      }

      const data = await response.json();
      setBlockedUsers((current) => [
        ...current,
        {
          blockerId: data.block.blockerId,
          blockedUserId: data.block.blockedUserId,
          blockedUser: { id: data.block.blockedUserId, username: blockUsername }
        }
      ]);
      setBlockUsername("");
      setBlockSuccess(`Blocked @${blockUsername}`);
      setTimeout(() => setBlockSuccess(null), 3000);
    } catch (error) {
      setBlockError("An error occurred while blocking the user");
    }
  }

  async function handleUnblockUser(blockedUserId: number) {
    try {
      const response = await fetch(`/api/blocks/${blockedUserId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        setBlockedUsers((current) => current.filter((b) => b.blockedUserId !== blockedUserId));
      }
    } catch (error) {
      console.error("Failed to unblock user:", error);
    }
  }

  return (
    <PageShell title="Blocked Users" subtitle="Manage the users you have blocked.">
      <div className="stack">
        <section className="widget">
          <h3>Block a User</h3>
          <div className="auth-form compact">
            <label htmlFor="block-username">Username</label>
            <input
              id="block-username"
              name="block-username"
              placeholder="username"
              value={blockUsername}
              onChange={(event) => setBlockUsername(event.target.value)}
            />
            <button type="button" onClick={handleBlockUser}>
              Block User
            </button>
          </div>
          {blockError && <div className="error-message">{blockError}</div>}
          {blockSuccess && <div style={{ background: "#efe", border: "2px solid #8a8", color: "#2a2", padding: "0.8rem 1rem", marginTop: "1rem" }}>{blockSuccess}</div>}
        </section>

        <section className="widget">
          <h3>Blocked Users</h3>
          {isLoading ? (
            <p>Loading blocked users...</p>
          ) : blockedUsers.length === 0 ? (
            <p>You haven't blocked any users.</p>
          ) : (
            <ul className="list-grid">
              {blockedUsers.map((block) => (
                <li key={block.blockedUserId}>
                  <span>@{block.blockedUser.username}</span>
                  <button
                    type="button"
                    onClick={() => handleUnblockUser(block.blockedUserId)}
                    style={{ padding: "0.45rem 0.8rem", fontSize: "0.9rem" }}
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
