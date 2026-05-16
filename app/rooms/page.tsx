"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

type Room = {
  id: number;
  name?: string;
  slug?: string;
  size?: number;
  ownerId?: number;
  visibility?: number;
  memberIds?: number[];
  messageIds?: number[];
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRooms() {
      const response = await fetch("/api/rooms", { credentials: "include" });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms ?? []);
      }

      setIsLoading(false);
    }

    void loadRooms();

    // Poll for new rooms every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/rooms", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms ?? []);
        }
      } catch (error) {
        console.error("Error polling rooms:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  async function handleCreateRoom() {
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: roomName })
    });

    if (response.ok) {
      const data = await response.json();
      setRooms((current) => [data.room, ...current]);
      setRoomName("");
    }
  }

  return (
    <PageShell title="Rooms" subtitle="Create a room and chat with whoever is online.">
      <div className="stack">
        <section className="widget">
          <h3>Create Room</h3>
          <div className="auth-form compact">
            <label htmlFor="room-name">Room name</label>
            <input id="room-name" name="room-name" placeholder="late-night-hangout" value={roomName} onChange={(event) => setRoomName(event.target.value)} />
            <button type="button" onClick={handleCreateRoom}>Create room</button>
          </div>
        </section>

        <section className="widget">
          <h3>Joined Rooms</h3>
          {isLoading ? (
            <p>Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p>No joined rooms yet.</p>
          ) : (
            <ul className="list-grid">
              {rooms.map((room) => {
                const identifier = room.slug ?? String(room.id);
                return (
                  <li key={room.id}>
                    <Link href={`/rooms/${identifier}`}>{room.name ?? identifier}</Link>
                    <span>{room.size ?? 0} members</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
