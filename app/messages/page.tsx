"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import Link from "next/link";

type Conversation = {
  userId: number;
  username: string;
  lastMessageTime: string;
  lastMessageId: number;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadConversations() {
      try {
        const [authResponse, messagesResponse] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include" }),
          fetch("/api/messages", { credentials: "include" })
        ]);

        if (!authResponse.ok) {
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        setCurrentUserId(authData?.user?.id ?? null);

        if (messagesResponse.ok) {
          const data = await messagesResponse.json();
          setConversations(data.conversations ?? []);
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadConversations();

    // Set up polling to check for new conversations every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/messages", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations ?? []);
        }
      } catch (error) {
        console.error("Error polling conversations:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [router]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <PageShell title="Messages" subtitle="View your conversations and recent chats.">
      <div style={{ maxWidth: "800px", margin: "0 auto", height: "100%", minHeight: 0, padding: "20px", display: "flex", flexDirection: "column" }}>
        <h1>Messages</h1>

        {isLoading ? (
          <p>Loading conversations...</p>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", flex: 1, minHeight: 0 }}>
            <p>No conversations yet. Start messaging your friends!</p>
            <Link href="/friends" style={{ color: "#0066cc", textDecoration: "none" }}>
              Go to Friends →
            </Link>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {conversations.map((conv) => (
              <Link
                key={conv.userId}
                href={`/messages/${conv.userId}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: "#f9f9f9",
                    transition: "background-color 0.2s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f0f0f0";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f9f9f9";
                  }}
                >
                  <span style={{ fontWeight: "500" }}>{conv.username}</span>
                  <span style={{ color: "#666", fontSize: "0.9em" }}>
                    {formatTime(conv.lastMessageTime)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
