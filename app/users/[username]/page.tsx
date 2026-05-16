"use client";

import { use, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

type ImageRecord = {
  id: number;
  source: string;
  imageTypeId: number | null;
  imageType: {
    id: number | null;
    name: string | null;
  };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username: routeUsername } = use(params);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [canEditBio, setCanEditBio] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending" | "friends" | "blocked">("none");
  const [profileFriends, setProfileFriends] = useState<any[]>([]);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [headerImageId, setHeaderImageId] = useState<number | null>(null);
  const [profileImageId, setProfileImageId] = useState<number | null>(null);
  const [headerImageX, setHeaderImageX] = useState(0);
  const [headerImageY, setHeaderImageY] = useState(0);
  const [headerImageScale, setHeaderImageScale] = useState(1);
  
  const [images, setImages] = useState<ImageRecord[]>([]);

  const imageById = useMemo(() => {
    return new Map(images.map((image) => [image.id, image.source]));
  }, [images]);

  const bannerImageSource = headerImageId ? imageById.get(headerImageId) ?? null : null;
  const profileImageSource = profileImageId ? imageById.get(profileImageId) ?? null : null;

  useEffect(() => {
    async function loadProfile() {
      setIsLoadingProfile(true);
      setFriendshipStatus("none");
      setRequestSent(false);

      const [profileResponse, authResponse, requestsResponse, imagesResponse] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(routeUsername)}`, {
          credentials: "include"
        }),
        fetch("/api/auth/me", {
          credentials: "include"
        }),
        fetch("/api/friends/requests?scope=all", {
          credentials: "include"
        }),
        fetch("/api/images", {
          credentials: "include"
        })
      ]);

      setUsername(routeUsername);

      let profileData: any = null;
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        setProfileUserId(profileData?.user?.id ?? null);
        const nextBio = profileData?.user?.profile?.bio ?? profileData?.user?.bio ?? "";
        setBio(nextBio);
        setBioInput(nextBio);
        setHeaderImageId(profileData?.user?.profile?.header_img ?? null);
        setProfileImageId(profileData?.user?.profile?.profile_img ?? null);
        setHeaderImageX(profileData?.user?.profile?.header_img_x ?? 0);
        setHeaderImageY(profileData?.user?.profile?.header_img_y ?? 0);
        setHeaderImageScale(profileData?.user?.profile?.header_img_scale ?? 1);
        
      }

      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        setImages(imagesData.images ?? []);
      }

      let authData: any = null;
      if (authResponse.ok) {
        authData = await authResponse.json();
        setCanEditBio(authData?.user?.id != null && profileData?.user?.id != null && authData.user.id === profileData.user.id);
        setCurrentUserId(authData?.user?.id);
        setCurrentUsername(authData?.user?.username);
      }

      // Load public friend list from profile payload (public by default)
      setProfileFriends(profileData?.user?.friends ?? []);

      // Check friendship status with requests
      if (requestsResponse.ok && authData?.user?.id && profileData?.user?.id) {
        const targetUserId = profileData.user.id;

        if (authData.user.id !== targetUserId) {
          const data = await requestsResponse.json();
          const requests = data.requests ?? [];

          const relatedRequest = requests.find((req: any) => 
            (req.sender_id === targetUserId && req.recipient_id === authData.user.id) ||
            (req.sender_id === authData.user.id && req.recipient_id === targetUserId)
          );

          if (relatedRequest) {
            setFriendshipStatus(relatedRequest.status === "accepted" ? "friends" : "pending");
            if (relatedRequest.status === "pending") {
              setRequestSent(relatedRequest.sender_id === authData.user.id);
            }
          }
        }
      }

      setIsLoadingProfile(false);
    }

    void loadProfile();
  }, [routeUsername]);

  const handleEditBio = () => {
    setBioInput(bio);
    setIsEditingBio(true);
  };

  const handleCancelBioEdit = () => {
    setBioInput(bio);
    setIsEditingBio(false);
  };

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio: bioInput })
      });

      if (response.ok) {
        setBio(bioInput);
        setIsEditingBio(false);
      } else {
        alert("Failed to update bio");
      }
    } catch {
      alert("Error updating bio");
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!profileUserId) {
      alert("Unable to send friend request right now");
      return;
    }

    setIsSendingRequest(true);
    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: profileUserId })
      });

      if (response.ok) {
        setRequestSent(true);
        setFriendshipStatus("pending");
      } else {
        const error = await response.json();
        alert(`Failed to send request: ${error.message || "Unknown error"}`);
      }
    } catch {
      alert("Error sending friend request");
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <PageShell title={`${username}'s Profile`} subtitle="Bio, banner, groups, friendlist, and now playing.">
      <style>{`
        .profile-hero {
          position: relative;
          min-height: 240px;
          overflow: hidden;
          padding: 0;
          border: 2px solid var(--line);
          background: linear-gradient(135deg, rgba(10, 46, 119, 0.92), rgba(22, 88, 230, 0.78), rgba(14, 196, 168, 0.56));
        }
        .profile-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 35%), radial-gradient(circle at bottom left, rgba(255,255,255,0.12), transparent 45%);
          pointer-events: none;
        }
        .profile-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.72;
        }
        .profile-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          min-height: 240px;
          padding: 1.25rem;
          background: linear-gradient(180deg, transparent 0%, rgba(8, 19, 45, 0.72) 100%);
        }
        .profile-avatar {
          width: 120px;
          height: 120px;
          border: 4px solid #fff;
          background: #dfe8ff;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
          overflow: hidden;
          flex: 0 0 auto;
        }
        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .profile-avatar-placeholder {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          font-family: var(--font-heading), "Arial Black", sans-serif;
          color: #1c315f;
          font-size: 2rem;
          background: linear-gradient(180deg, #fff7a1, #e5edff);
        }
        .profile-hero-copy {
          color: #fff;
          text-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
        }
        .profile-hero-copy h3 {
          margin: 0;
          font-family: var(--font-heading), "Arial Black", sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .profile-hero-copy p {
          margin: 0.45rem 0 0;
          max-width: 52ch;
          font-size: 1.25rem;
        }
      `}</style>

      <div className="stack">
        <section className="profile-hero">
          {bannerImageSource && (
            <img 
              className="profile-hero-image" 
              src={bannerImageSource} 
              alt="Profile banner"
            />
          )}
          <div className="profile-hero-inner">
            <div className="profile-avatar">
              {profileImageSource ? (
                <img 
                  src={profileImageSource} 
                  alt="Profile picture"
                />
              ) : (
                <div className="profile-avatar-placeholder">{(username || routeUsername).slice(0, 1).toUpperCase()}</div>
              )}
            </div>
            <div className="profile-hero-copy">
              <h3>{username || routeUsername}</h3>
              <p>{bio || "No bio added yet."}</p>
            </div>
          </div>
        </section>

        <section className="widget split">
          <div>
            <h3>Bio</h3>
            {isLoadingProfile ? (
              <p>Loading bio...</p>
            ) : isEditingBio ? (
              <div className="bio-edit-form">
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Enter your bio..."
                  maxLength={500}
                  rows={4}
                />
                <div className="pill-row">
                  <button type="button" onClick={handleSaveBio} disabled={isSavingBio}>
                    {isSavingBio ? "Saving..." : "Save"}
                  </button>
                  <button type="button" className="secondary" onClick={handleCancelBioEdit} disabled={isSavingBio}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>{bio || "No bio added yet."}</p>
                {canEditBio && (
                  <button type="button" className="secondary" onClick={handleEditBio}>
                    Edit Bio
                  </button>
                )}
              </>
            )}
          </div>
          <div>
            <h3>Actions</h3>
            {canEditBio ? (
              <p>This is your profile.</p>
            ) : routeUsername === "admin" ? (
              <p style={{ color: "#999", fontStyle: "italic" }}>Admin account</p>
            ) : (
              <div className="pill-row" style={{ flexDirection: "column", gap: "8px" }}>
                {friendshipStatus === "friends" && (
                  <p style={{ margin: 0, color: "#4caf50", fontWeight: "bold" }}>✓ Friends</p>
                )}
                {friendshipStatus === "pending" && (
                  <p style={{ margin: 0, color: "#ff9800", fontWeight: "bold" }}>
                    {requestSent ? "⏳ Request Sent" : "⏳ Request Pending"}
                  </p>
                )}
                {friendshipStatus === "none" && (
                  <button 
                    type="button" 
                    onClick={handleSendFriendRequest}
                    disabled={isSendingRequest}
                  >
                    {isSendingRequest ? "Sending..." : "Send Friend Request"}
                  </button>
                )}
                <button type="button" className="secondary">
                  Block User
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="widget split">
          <div>
            <h3>Groups</h3>
            <p>No groups to display.</p>
          </div>
          <div>
            <h3>Friendlist</h3>
            {isLoadingProfile ? (
              <p>Loading friends...</p>
            ) : profileFriends.length === 0 ? (
              <p>No public friends list.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {profileFriends.map((friend) => (
                  <li key={`prof-friend-${friend.id}`} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                    <a href={`/users/${encodeURIComponent(friend.username)}`} style={{ textDecoration: "none", color: "#0066cc" }}>
                      {friend.username}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="widget">
          <h3>Custom User CSS</h3>
          <pre className="css-preview"></pre>
        </section>
      </div>
    </PageShell>
  );
}
