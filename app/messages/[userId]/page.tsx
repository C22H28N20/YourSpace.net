"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import Link from "next/link";

type Message = {
  id: number;
  senderId: number;
  content: string;
  timestamp: string;
  sender: {
    id: number;
    username: string;
  };
};

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [otherUserName, setOtherUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUserId = parseInt(String(userId), 10);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadMessages() {
      if (!Number.isFinite(otherUserId)) {
        setError("Invalid user ID");
        setIsLoading(false);
        return;
      }

      try {
        const [authResponse, messagesResponse, userResponse] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include" }),
          fetch(`/api/messages/${otherUserId}`, { credentials: "include" }),
          fetch(`/api/users/id/${otherUserId}`, { credentials: "include" })
        ]);

        if (!authResponse.ok) {
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        setCurrentUserId(authData?.user?.id ?? null);

        if (messagesResponse.ok) {
          const data = await messagesResponse.json();
          setMessages(data.messages ?? []);
        } else if (messagesResponse.status === 400) {
          const errorData = await messagesResponse.json();
          setError(errorData.error || "Could not load messages");
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setOtherUserName(userData.user?.username ?? null);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
        setError("Failed to load messages");
      } finally {
        setIsLoading(false);
      }
    }

    void loadMessages();

    // Set up polling to check for new messages every 2 seconds
    const pollInterval = setInterval(async () => {
      if (!Number.isFinite(otherUserId)) return;

      try {
        const response = await fetch(`/api/messages/${otherUserId}`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          const newMessages = data.messages ?? [];
          
          // Only update if there are new messages
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
  }, [otherUserId, router]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!messageInput.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: messageInput.trim(),
          recipientId: otherUserId,
          kind: "text"
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setMessageInput("");
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
  };

  if (isLoading) {
    return (
      <PageShell title="Messages" subtitle="Loading conversation...">
        <div style={{ padding: "20px", textAlign: "center" }}>Loading messages...</div>
      </PageShell>
    );
  }

  if (error && messages.length === 0) {
    return (
      <PageShell title="Messages" subtitle="Conversation unavailable">
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
          <Link href="/messages" style={{ color: "#0066cc", marginBottom: "20px", display: "block" }}>
            ← Back to Messages
          </Link>
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#d32f2f" }}>
            <p>{error}</p>
            <Link href="/friends" style={{ color: "#0066cc" }}>
              Go to Friends
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={otherUserName || "Messages"} subtitle="Direct message conversation.">
      <div style={{ maxWidth: "800px", margin: "0 auto", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/messages" style={{ color: "#0066cc", fontSize: "24px", textDecoration: "none" }}>
            ←
          </Link>
          <h2 style={{ margin: "0", flex: 1 }}>{otherUserName || "User"}</h2>
        </div>

        {/* Messages List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", marginTop: "20px" }}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const showDate = idx === 0 || formatDate(messages[idx - 1].timestamp) !== formatDate(msg.timestamp);
                const isCurrentUser = msg.senderId === currentUserId;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: "center", margin: "16px 0 8px", color: "#999", fontSize: "0.85em" }}>
                        {formatDate(msg.timestamp)}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: isCurrentUser ? "flex-end" : "flex-start"
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "8px 12px",
                          borderRadius: "12px",
                          backgroundColor: isCurrentUser ? "#0066cc" : "#e0e0e0",
                          color: isCurrentUser ? "white" : "black",
                          wordWrap: "break-word"
                        }}
                      >
                        <p style={{ margin: "0 0 4px", fontSize: "0.95em" }}>{msg.content}</p>
                        <span style={{ fontSize: "0.75em", opacity: 0.7 }}>{formatTime(msg.timestamp)}</span>
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
        <form
          onSubmit={handleSendMessage}
          style={{
            flexShrink: 0,
            padding: "16px 20px",
            borderTop: "1px solid #ddd",
            display: "flex",
            gap: "8px"
          }}
        >
          {error && <div style={{ color: "#d32f2f", fontSize: "0.85em", width: "100%", marginBottom: "8px" }}>{error}</div>}
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.95em"
            }}
          />
          <button
            type="submit"
            disabled={isSending || !messageInput.trim()}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isSending ? "not-allowed" : "pointer",
              opacity: isSending ? 0.6 : 1
            }}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
