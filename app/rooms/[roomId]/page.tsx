"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

type Message = {
  id?: number;
  content?: string;
  timestamp?: string;
  sender?: { id?: number; username?: string };
};

export default function RoomPage({ params }: RoomPageProps) {
  const roomParams = use(params);
  const router = useRouter();
  const { roomId } = roomParams;

  const [title, setTitle] = useState(`Room: ${roomId}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadRoom() {
      try {
        const [authResponse, roomResponse, messagesResponse] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include" }),
          fetch(`/api/rooms/${encodeURIComponent(roomId)}`, { credentials: "include" }),
          fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, { credentials: "include" })
        ]);

        if (!authResponse.ok) {
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        setCurrentUserId(authData?.user?.id ?? null);

        if (roomResponse.ok) {
          const roomData = await roomResponse.json();
          setTitle(`${roomData?.room?.chatroom_name ?? roomId}`);
        }

        if (messagesResponse.ok) {
          const messageData = await messagesResponse.json();
          setMessages(messageData.messages ?? []);
        }
      } catch (err) {
        console.error("Error loading room:", err);
        setError("Failed to load room");
      } finally {
        setIsLoading(false);
      }
    }

    void loadRoom();

    // Polling for new messages every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          const newMessages = data.messages ?? [];

          setMessages((prevMessages) => {
            const existingIds = new Set(prevMessages.map((m) => m.id));
            const newOnes = newMessages.filter((m: Message) => !existingIds.has(m.id));

            if (newOnes.length > 0) {
              return [...prevMessages, ...newOnes];
            }
            return prevMessages;
          });
        }
      } catch (err) {
        console.error("Error polling messages:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [roomId, router]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: message.trim(), kind: "text" })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((current) => [...current, data.message]);
        setMessage("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleInviteUser() {
    if (!inviteUsername.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: inviteUsername })
      });

      if (response.ok) {
        // Try to read returned invite info (may be snake_case or camelCase)
        try {
          const data = await response.json();
          // no-op: we could surface this in UI later
          console.log('Invite sent:', data.invite ?? data);
        } catch {
          // ignore parse errors
        }
        setInviteUsername("");
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to invite user");
      }
    } catch (err) {
      console.error("Error inviting user:", err);
      setError("Failed to invite user");
    }
  }

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    });
  };

  if (isLoading) {
    return (
      <PageShell title="Rooms" subtitle="Loading room...">
        <div style={{ padding: "20px", textAlign: "center" }}>Loading room...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title={title} subtitle="Room chat and invites.">
      <div style={{ maxWidth: "900px", margin: "0 auto", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/rooms" style={{ color: "#0066cc", fontSize: "24px", textDecoration: "none" }}>
            ←
          </Link>
          <h2 style={{ margin: "0", flex: 1 }}>#{title}</h2>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", marginTop: "20px" }}>
              <p>No messages yet. Be the first to chat!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const showDate =
                  idx === 0 ||
                  (messages[idx - 1].timestamp &&
                    msg.timestamp &&
                    formatDate(messages[idx - 1].timestamp) !== formatDate(msg.timestamp));
                const isCurrentUser = msg.sender?.id === currentUserId;

                return (
                  <div key={msg.id ?? idx}>
                    {showDate && (
                      <div style={{ textAlign: "center", margin: "16px 0 8px", color: "#999", fontSize: "0.85em" }}>
                        {formatDate(msg.timestamp)}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85em", color: "#666", marginBottom: "4px" }}>
                          <strong>{msg.sender?.username ?? "system"}</strong>
                        </div>
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            backgroundColor: isCurrentUser ? "#0066cc" : "#e0e0e0",
                            color: isCurrentUser ? "white" : "black",
                            wordWrap: "break-word",
                            maxWidth: "70%"
                          }}
                        >
                          <p style={{ margin: "0 0 4px", fontSize: "0.95em" }}>{msg.content ?? ""}</p>
                          <span style={{ fontSize: "0.75em", opacity: 0.7 }}>{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div style={{ flexShrink: 0, padding: "16px 20px", borderTop: "1px solid #ddd", display: "flex", flexDirection: "column", gap: "8px" }}>
          {error && <div style={{ color: "#d32f2f", fontSize: "0.85em" }}>{error}</div>}

          <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "8px" }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.95em",
                minHeight: "40px",
                maxHeight: "120px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSending ? "not-allowed" : "pointer",
                opacity: isSending ? 0.6 : 1,
                alignSelf: "flex-end"
              }}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </form>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="Invite username..."
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.95em"
              }}
            />
            <button
              type="button"
              onClick={handleInviteUser}
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Invite
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
