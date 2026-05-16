"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type User = {
  user_id: number;
  username: string;
  email: string;
  is_online: number;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadUsers() {
      const [usersResponse, authResponse, blocksResponse] = await Promise.all([
        fetch("/api/users/online", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/blocks", { credentials: "include" })
      ]);

      if (authResponse.ok) {
        const authData = await authResponse.json();
        setCurrentUsername(authData?.user?.username);
      }

      if (blocksResponse.ok) {
        const blockData = await blocksResponse.json();
        const blockedIds = new Set<number>(
          (blockData.blocks ?? []).map((block: { blockedUserId: number }) => block.blockedUserId)
        );
        setBlockedUserIds(blockedIds);
      }

      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const userList = data.users ?? [];
        setUsers(userList);
        setFilteredUsers(userList);
      }

      setIsLoading(false);
    }

    void loadUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  async function handleBlockUser(username: string) {
    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const data = await response.json();
        setBlockedUserIds((current) => new Set([...current, data.block.blockedUserId]));
      }
    } catch (error) {
      console.error("Failed to block user:", error);
    }
  }

  async function handleUnblockUser(userId: number, username: string) {
    try {
      const response = await fetch(`/api/blocks/${userId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        setBlockedUserIds((current) => {
          const updated = new Set(current);
          updated.delete(userId);
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to unblock user:", error);
    }
  }

  return (
    <PageShell title="Find Users" subtitle="Search for users and send friend requests">
      <div className="stack">
        <section className="widget">
          <h3>Search Users</h3>
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "16px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px"
            }}
          />

          {isLoading ? (
            <p>Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p>
              {searchQuery ? "No users found matching your search." : "No users available."}
            </p>
          ) : (
            <ul className="list-grid">
              {filteredUsers
                .filter((user) => user.username !== currentUsername && user.username !== "admin")
                .map((user) => (
                  <li key={user.user_id}>
                    <div>
                      <strong>{user.username}</strong>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {user.is_online ? "🟢 Online" : "⚪ Offline"}
                      </div>
                    </div>
                    <div className="pill-row">
                      <a
                        href={`/users/${encodeURIComponent(user.username)}`}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          textDecoration: "none",
                          color: "#333",
                          fontSize: "14px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        View Profile
                      </a>
                      {blockedUserIds.has(user.user_id) ? (
                        <button
                          type="button"
                          onClick={() => handleUnblockUser(user.user_id, user.username)}
                          style={{ padding: "0.45rem 0.8rem", fontSize: "0.9rem" }}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBlockUser(user.username)}
                          className="danger"
                          style={{ padding: "0.45rem 0.8rem", fontSize: "0.9rem" }}
                        >
                          Block
                        </button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
