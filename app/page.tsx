import Link from "next/link";

export default function LandingPage() {
  return (
    // Simple entry page that routes users to core sections.
    <section className="landing card-enter">
      <h2>CREATE YOUR ACCOUNT NOW</h2>
      <p>
        Meet new people, make friends, and express yourself on Yourspace!
      </p>
      <div className="landing-actions">
        <Link href="/home">Enter Home</Link>
        <Link href="/register">Create Account</Link>
      </div>
    </section>
  );
}
