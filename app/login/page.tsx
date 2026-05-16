"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

// Login page component with form handling and error management.
// Accepts both email and username as the identifier field.
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState(""); // Email or username
  const [password, setPassword] = useState("");

  // Handle form submission: send credentials to API and redirect on success.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // POST to login endpoint with credentials
      // credentials: "include" ensures session cookie is set/sent
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "include"
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      // Successful login: refresh page to reload all state and data
      window.location.href = "/home";
    } catch (err) {
      // Network or parsing error
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageShell title="Login" subtitle="Welcome back. Sign in to your account.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <label htmlFor="login-identifier">Email or Username</label>
        <input
          id="login-identifier"
          name="identifier"
          type="text"
          placeholder="you@example.com or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={isLoading}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </PageShell>
  );
}
