"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

type FriendRequest = {
  request_id: number;
  sender_id: number;
  recipient_id: number;
  status: string;
  senderName: string;
  recipientName: string;
};

type Friend = {
  id: number;
  username: string;
  email: string;
};

type User = {
  user_id: number;
  username: string;
  email: string;
  is_online: number;
};

export default function FriendsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadRequests() {
      // Load requests, friends, users, blocks, and auth together.
      const [requestsResponse, friendsResponse, usersResponse, authResponse, blocksResponse] = await Promise.all([
        fetch("/api/friends/requests", { credentials: "include" }),
        fetch("/api/friends", { credentials: "include" }),
        fetch("/api/users/online", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/blocks", { credentials: "include" })
      ]);

      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        setRequests(data.requests ?? []);
      }

      if (friendsResponse.ok) {
        const data = await friendsResponse.json();
        setFriends(data.friends ?? []);
      }

      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const userList = data.users ?? [];
        setAllUsers(userList);
        setFilteredUsers(userList);
      }

      if (authResponse.ok) {
        const authData = await authResponse.json();
        setCurrentUserId(authData?.user?.id ?? null);
        setCurrentUsername(authData?.user?.username);
      }

      if (blocksResponse.ok) {
        const blockData = await blocksResponse.json();
        const blockedIds = new Set<number>(
          (blockData.blocks ?? []).map((block: { blockedUserId: number }) => block.blockedUserId)
        );
        setBlockedUserIds(blockedIds);
      }

      setIsLoading(false);
    }

    void loadRequests();
  }, []);

  useEffect(() => {
    const filtered = allUsers.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  async function respondToRequest(id: number, status: "accepted" | "declined") {
    // Respond to the request and then reload both requests and friends lists
    const response = await fetch(`/api/friends/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      // Reload the requests and friends lists
      const [newRequestsResponse, newFriendsResponse] = await Promise.all([
        fetch("/api/friends/requests", { credentials: "include" }),
        fetch("/api/friends", { credentials: "include" })
      ]);

      if (newRequestsResponse.ok) {
        const data = await newRequestsResponse.json();
        setRequests(data.requests ?? []);
      }

      if (newFriendsResponse.ok) {
        const data = await newFriendsResponse.json();
        setFriends(data.friends ?? []);
      }
    } else {
      alert("Failed to respond to friend request");
    }
  }

  function handleMessage(friendId: number) {
    router.push(`/messages/${friendId}`);
  }

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

  async function handleUnblockUser(userId: number) {
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
    <PageShell title="Friends" subtitle="Find friends, manage requests, and view your friend list.">
      <div className="stack">
        <section className="widget">
          <h3>🔍 Find Users</h3>
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
              fontSize: "14px",
              boxSizing: "border-box"
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
                .map((user, index) => (
                  <li key={`search-${index}-${user.user_id}`}>
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
                          onClick={() => handleUnblockUser(user.user_id)}
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

        <section className="widget">
          <h3>💌 Friend Requests</h3>
          {isLoading ? (
            <p>Loading requests...</p>
          ) : requests.filter((req) => req.status === "pending" && req.recipient_id === currentUserId).length === 0 ? (
            <p>No pending friend requests.</p>
          ) : (
            <ul className="list-grid">
              {requests
                .filter((request) => request.status === "pending" && request.recipient_id === currentUserId)
                .map((request, index) => (
                <li key={`request-${index}-${request.request_id}`}>
                  <span>{request.senderName} requested to connect</span>
                  <div className="pill-row">
                    <button type="button" onClick={() => respondToRequest(request.request_id, "accepted")}>Accept</button>
                    <button type="button" className="secondary" onClick={() => respondToRequest(request.request_id, "declined")}>Decline</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="widget">
          <h3>👥 Friend List</h3>
          {/* The list stays read-only here until a dedicated friend actions API exists. */}
          {isLoading ? (
            <p>Loading friends...</p>
          ) : friends.filter((f) => !blockedUserIds.has(f.id)).length === 0 ? (
            <p>You haven't added any friends yet.</p>
          ) : (
            <ul className="list-grid">
              {friends
                .filter((f) => !blockedUserIds.has(f.id))
                .map((friend, index) => (
                <li key={`friend-${index}-${friend.id}`}>
                  <span>{friend.username}</span>
                  <div className="pill-row">
                    <button type="button" onClick={() => handleMessage(friend.id)}>Message</button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleBlockUser(friend.username)}
                    >
                      Block
                    </button>
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
