"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

// Unified authentication page with toggle between login and register modes.
export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Handle login submission
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
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
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle registration submission
  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password: registerPassword }),
        credentials: "include"
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      // Successful registration: refresh page to reload all state and data
      window.location.href = "/home";
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Toggle between login and register modes
  function toggleMode() {
    setIsLogin(!isLogin);
    setError(null);
    // Reset form fields when toggling
    setIdentifier("");
    setPassword("");
    setUsername("");
    setEmail("");
    setRegisterPassword("");
  }

  return (
    <PageShell
      title={isLogin ? "Login" : "Register"}
      subtitle={
        isLogin
          ? "Welcome back. Sign in to your account."
          : "Claim your username and start customizing."
      }
    >
      <div className="auth-container">
        {/* Toggle buttons */}
        <div className="auth-toggle">
          <button
            type="button"
            className={`toggle-btn ${isLogin ? "active" : ""}`}
            onClick={toggleMode}
            disabled={isLoading}
          >
            Login
          </button>
          <button
            type="button"
            className={`toggle-btn ${!isLogin ? "active" : ""}`}
            onClick={toggleMode}
            disabled={isLoading}
          >
            Register
          </button>
        </div>

        {/* Login Form */}
        {isLogin && (
          <form className="auth-form" onSubmit={handleLogin}>
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
        )}

        {/* Register Form */}
        {!isLogin && (
          <form className="auth-form" onSubmit={handleRegister}>
            {error && <div className="error-message">{error}</div>}

            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              name="username"
              placeholder="scene_legend"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
