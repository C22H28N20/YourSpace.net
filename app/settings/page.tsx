push a commit with the msg " Fixed banner issue ""use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

type ImageType = {
  id: number;
  name: string;
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

type BlockedUser = {
  blockerId: number;
  blockedUserId: number;
  blockedUser: {
    id: number;
    username: string;
  };
};

type ColorBlindMode = "default" | "protanopia" | "deuteranopia" | "tritanopia" | "monochrome" | "high-contrast";

const colorBlindModeOptions: Array<{ value: ColorBlindMode; label: string; description: string }> = [
  { value: "default", label: "Default", description: "Original site palette." },
  { value: "protanopia", label: "Protanopia", description: "Red-weak friendly palette." },
  { value: "deuteranopia", label: "Deuteranopia", description: "Green-weak friendly palette." },
  { value: "tritanopia", label: "Tritanopia", description: "Blue-yellow adjusted palette." },
  { value: "monochrome", label: "Monochrome", description: "Low-colour grayscale palette." },
  { value: "high-contrast", label: "High Contrast", description: "Maximum contrast for readability." }
];

function getMediaLabel(typeName: string | null | undefined) {
  if (typeName === "header") return "Banner";
  if (typeName === "profile") return "Profile Picture";
  return typeName ?? "Image";
}

// Settings page: profile management, media, security, and logout.
export default function SettingsPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [headerImageId, setHeaderImageId] = useState<number | null>(null);
  const [profileImageId, setProfileImageId] = useState<number | null>(null);
  const [headerImageX, setHeaderImageX] = useState(0);
  const [headerImageY, setHeaderImageY] = useState(0);
  const [headerImageScale, setHeaderImageScale] = useState(1);
  const [colorBlindMode, setColorBlindMode] = useState<ColorBlindMode>("default");
  const [imageTypes, setImageTypes] = useState<ImageType[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [newImageSource, setNewImageSource] = useState("");
  const [newImageTypeId, setNewImageTypeId] = useState<number | "">("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);

  const headerTypeId = useMemo(() => imageTypes.find((type) => type.name === "header")?.id ?? null, [imageTypes]);
  const profileTypeId = useMemo(() => imageTypes.find((type) => type.name === "profile")?.id ?? null, [imageTypes]);

  const bannerImages = useMemo(() => {
    return images.filter((image) => image.imageType?.name === "header");
  }, [images]);

  const avatarImages = useMemo(() => {
    return images.filter((image) => image.imageType?.name === "profile");
  }, [images]);

  const selectedBanner = images.find((image) => image.id === headerImageId) ?? null;
  const selectedAvatar = images.find((image) => image.id === profileImageId) ?? null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.colorMode = colorBlindMode;
  }, [colorBlindMode]);

  async function loadMedia() {
    const [imagesResponse, typesResponse] = await Promise.all([
      fetch("/api/images", { credentials: "include" }),
      fetch("/api/images/types", { credentials: "include" })
    ]);

    if (imagesResponse.ok) {
      const imageData = await imagesResponse.json();
      setImages(imageData.images ?? []);
    }

    if (typesResponse.ok) {
      const typeData = await typesResponse.json();
      setImageTypes(typeData.types ?? []);
    }
  }

  useEffect(() => {
    async function loadProfile() {
      const [profileResponse, blocksResponse] = await Promise.all([
        fetch("/api/users/me", {
          credentials: "include"
        }),
        fetch("/api/blocks", {
          credentials: "include"
        }),
        loadMedia()
      ]);

      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setUsername(data?.user?.username ?? "");
        setBio(data?.user?.profile?.bio ?? "");
        setHeaderImageId(data?.user?.profile?.header_img ?? null);
        setProfileImageId(data?.user?.profile?.profile_img ?? null);
        setColorBlindMode((data?.user?.profile?.color_blind_mode ?? "default") as ColorBlindMode);
        setHeaderImageX(data?.user?.profile?.header_img_x ?? 0);
        setHeaderImageY(data?.user?.profile?.header_img_y ?? 0);
        setHeaderImageScale(data?.user?.profile?.header_img_scale ?? 1);
        
      }

      if (blocksResponse.ok) {
        const blockData = await blocksResponse.json();
        setBlockedUsers(blockData.blocks ?? []);
      }

      setIsLoadingProfile(false);
      setIsLoadingBlocks(false);
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    if (newImageTypeId !== "" || imageTypes.length === 0) {
      return;
    }

    setNewImageTypeId(headerTypeId ?? imageTypes[0].id);
  }, [imageTypes, headerTypeId, newImageTypeId]);

  async function handleSaveProfile() {
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const payload: Record<string, unknown> = { username, bio };
      payload.colorBlindMode = colorBlindMode;

      if (headerImageId !== null) {
        payload.headerImageId = headerImageId;
        payload.headerImageX = headerImageX;
        payload.headerImageY = headerImageY;
        payload.headerImageScale = headerImageScale;
      }

      if (profileImageId !== null) {
        payload.profileImageId = profileImageId;
      }

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        setProfileError(data.error || "Could not save profile.");
        return;
      }

      const data = await response.json();
      setUsername(data?.user?.username ?? username);
      setHeaderImageId(data?.user?.profile?.header_img ?? headerImageId);
      setProfileImageId(data?.user?.profile?.profile_img ?? profileImageId);
      setColorBlindMode((data?.user?.profile?.color_blind_mode ?? colorBlindMode) as ColorBlindMode);
      setHeaderImageX(data?.user?.profile?.header_img_x ?? headerImageX);
      setHeaderImageY(data?.user?.profile?.header_img_y ?? headerImageY);
      setHeaderImageScale(data?.user?.profile?.header_img_scale ?? headerImageScale);
      
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveMediaChanges() {
    setMediaError(null);
    setIsSavingProfile(true);

    try {
      const payload: Record<string, unknown> = {};

      if (headerImageId !== null) {
        payload.headerImageId = headerImageId;
        payload.headerImageX = headerImageX;
        payload.headerImageY = headerImageY;
        payload.headerImageScale = headerImageScale;
      }

      if (profileImageId !== null) {
        payload.profileImageId = profileImageId;
      }

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        setMediaError(data.error || "Could not save media changes.");
        return;
      }

      const data = await response.json();
      setHeaderImageId(data?.user?.profile?.header_img ?? headerImageId);
      setProfileImageId(data?.user?.profile?.profile_img ?? profileImageId);
      setColorBlindMode((data?.user?.profile?.color_blind_mode ?? colorBlindMode) as ColorBlindMode);
      setHeaderImageX(data?.user?.profile?.header_img_x ?? headerImageX);
      setHeaderImageY(data?.user?.profile?.header_img_y ?? headerImageY);
      setHeaderImageScale(data?.user?.profile?.header_img_scale ?? headerImageScale);
      
    } finally {
      setIsSavingProfile(false);
    }
  }

  

  async function handleAddImage() {
    setMediaError(null);
    setIsAddingImage(true);

    try {
      if (!newImageSource.trim()) {
        setMediaError("Image URL is required.");
        return;
      }

      if (newImageTypeId === "") {
        setMediaError("Choose a media type first.");
        return;
      }

      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source: newImageSource.trim(), imageTypeId: Number(newImageTypeId) })
      });

      if (!response.ok) {
        const data = await response.json();
        setMediaError(data.error || "Could not add image.");
        return;
      }

      setNewImageSource("");
      await loadMedia();
    } finally {
      setIsAddingImage(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        setPasswordError(data.error || "Could not change password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setIsSavingPassword(false);
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

  // Handle logout: clear session and redirect to auth page.
  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      // Send logout request to clear session cookie server-side
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      // Refresh page to reload all state and clear authentication
      window.location.href = "/auth";
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  }

  return (
    <PageShell title="Settings" subtitle="Update profile, banner, profile picture, password, and account status.">
      <style>{`
        .media-layout {
          display: grid;
          gap: 1rem;
        }
        .media-pickers {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1rem;
        }
        .media-panel {
          border: 2px solid #0a307d;
          background: linear-gradient(180deg, #f8fbff, #e9f1ff);
          padding: 1rem;
          display: grid;
          gap: 0.75rem;
        }
        .media-preview {
          border: 2px solid #0a307d;
          min-height: 140px;
          background: linear-gradient(135deg, rgba(22, 88, 230, 0.12), rgba(14, 196, 168, 0.12));
          display: grid;
          place-items: center;
          overflow: hidden;
          position: relative;
          aspect-ratio: 16/9;
        }
        .media-preview.avatar {
          aspect-ratio: 1;
          border-radius: 50%;
        }
        .media-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          position: absolute;
          top: 0;
          left: 0;
        }
        .media-preview.placeholder {
          color: #24467a;
          font-size: 1rem;
          text-align: center;
          padding: 1rem;
        }
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 0.75rem;
        }
        .media-card {
          border: 2px solid #0a307d;
          background: #fff;
          padding: 0.45rem;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          text-align: left;
        }
        .media-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
        }
        .media-card.active {
          border-color: #0ec4a8;
          box-shadow: 0 0 0 3px rgba(14, 196, 168, 0.25);
        }
        .media-card img {
          width: 100%;
          height: 76px;
          object-fit: cover;
          display: block;
          margin-bottom: 0.35rem;
        }
        .media-card small {
          display: block;
          font-size: 0.9rem;
          color: #26446e;
        }
        .media-upload {
          display: grid;
          gap: 0.8rem;
          margin-top: 0.5rem;
        }
        .image-positioning {
          border-top: 2px solid #dde6f0;
          padding-top: 0.75rem;
          margin-top: 0.75rem;
          display: grid;
          gap: 0.6rem;
        }
        .position-slider {
          display: grid;
          grid-template-columns: 80px 1fr 50px;
          align-items: center;
          gap: 0.5rem;
        }
        .position-slider label {
          font-size: 0.9rem;
          color: #1e3a5f;
          font-weight: 500;
        }
        .position-slider input[type="range"] {
          width: 100%;
        }
        .position-slider input[type="number"] {
          font-size: 0.85rem;
          padding: 0.3rem;
          width: 45px;
          text-align: center;
        }
      `}</style>

      <div className="stack">
        <section className="widget">
          <h3>Profile Basics</h3>
          <div className="auth-form compact">
            <label htmlFor="settings-username">Username</label>
            <input
              id="settings-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoadingProfile}
            />
            <label htmlFor="settings-bio">Bio</label>
            <textarea
              id="settings-bio"
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              disabled={isLoadingProfile}
            />
            <label htmlFor="settings-color-mode">Colour-blind mode</label>
            <select
              id="settings-color-mode"
              value={colorBlindMode}
              onChange={(event) => setColorBlindMode(event.target.value as ColorBlindMode)}
              disabled={isLoadingProfile}
            >
              {colorBlindModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            <p style={{ margin: 0, color: "#32517f" }}>
              This updates the site colours across the app and is saved to your account.
            </p>
            {profileError && <div className="error-message">{profileError}</div>}
            <button type="button" onClick={handleSaveProfile} disabled={isLoadingProfile || isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        </section>

        <section className="widget media-layout">
          <h3>Profile Media</h3>
          <p style={{ marginTop: 0, color: "#32517f" }}>Add images to your library, then assign one as your banner and one as your profile picture.</p>

          <div className="media-upload">
            <h4 style={{ margin: 0 }}>Add Image To Library</h4>
            <div className="auth-form compact" style={{ margin: 0 }}>
              <label htmlFor="new-image-source">Image URL</label>
              <input
                id="new-image-source"
                value={newImageSource}
                onChange={(event) => setNewImageSource(event.target.value)}
                placeholder="https://example.com/banner.jpg"
                disabled={isLoadingProfile || isAddingImage}
              />
              <label htmlFor="new-image-type">Image type</label>
              <select
                id="new-image-type"
                value={newImageTypeId}
                onChange={(event) => setNewImageTypeId(Number(event.target.value))}
                disabled={isLoadingProfile || isAddingImage}
              >
                <option value="">Choose a type</option>
                {imageTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {getMediaLabel(type.name)}
                  </option>
                ))}
              </select>
              {mediaError && <div className="error-message">{mediaError}</div>}
              <button type="button" onClick={handleAddImage} disabled={isLoadingProfile || isAddingImage}>
                {isAddingImage ? "Uploading..." : "Add image"}
              </button>
            </div>
          </div>

          <div className="media-pickers">
            <div className="media-panel">
              <h4 style={{ margin: 0 }}>Banner Image</h4>
              <div className="media-preview">
                {selectedBanner ? (
                  <img 
                    src={selectedBanner.source} 
                    alt="Selected banner"
                  />
                ) : (
                  <div className="media-preview placeholder">No banner selected yet.</div>
                )}
              </div>
              {headerImageId && (
                <div className="image-positioning">
                  <p style={{ margin: 0 }}>Aspect ratio: 16:9 — the banner will be fitted and cropped to this area.</p>
                </div>
              )}
              <div className="media-grid">
                {(bannerImages.length > 0 ? bannerImages : images).map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className={`media-card ${headerImageId === image.id ? "active" : ""}`}
                    onClick={() => setHeaderImageId(image.id)}
                    disabled={isLoadingProfile}
                  >
                    <img src={image.source} alt={getMediaLabel(image.imageType?.name)} />
                    <small>{getMediaLabel(image.imageType?.name)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="media-panel">
              <h4 style={{ margin: 0 }}>Profile Picture</h4>
              <div className="media-preview avatar">
                {selectedAvatar ? (
                  <img 
                    src={selectedAvatar.source} 
                    alt="Selected profile picture"
                  />
                ) : (
                  <div className="media-preview placeholder">No profile picture selected yet.</div>
                )}
              </div>
              {profileImageId && (
                <div className="image-positioning">
                  <p style={{ margin: 0 }}>Profile picture will be center-cropped and fitted to a square preview.</p>
                </div>
              )}
              <div className="media-grid">
                {(avatarImages.length > 0 ? avatarImages : images).map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className={`media-card ${profileImageId === image.id ? "active" : ""}`}
                    onClick={() => setProfileImageId(image.id)}
                    disabled={isLoadingProfile}
                  >
                    <img src={image.source} alt={getMediaLabel(image.imageType?.name)} />
                    <small>{getMediaLabel(image.imageType?.name)}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pill-row">
            <button type="button" onClick={handleSaveMediaChanges} disabled={isLoadingProfile || isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save media changes"}
            </button>
            <button type="button" className="secondary" onClick={loadMedia} disabled={isLoadingProfile || isAddingImage}>
              Refresh library
            </button>
          </div>
        </section>

        <section className="widget">
          <h3>Security</h3>
          <div className="auth-form compact">
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            {passwordError && <div className="error-message">{passwordError}</div>}
            <button type="button" onClick={handleChangePassword} disabled={isSavingPassword}>
              {isSavingPassword ? "Changing..." : "Change password"}
            </button>
            <button type="button" className="danger">
              Delete account
            </button>
          </div>
        </section>

        <section className="widget">
          <h3>Blocked Users</h3>
          {isLoadingBlocks ? (
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

        <section className="widget">
          <h3>Session</h3>
          <div className="auth-form compact">
            <button
              type="button"
              className="danger"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
