"use client";

/**
 * app/auth/signin/page.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Custom sign-in page. Matches Cart-Blanche's dark neon aesthetic.
 * Uses NextAuth's signIn() to redirect to Google OAuth.
 */

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, Zap } from "lucide-react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

function SignInContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/chat";
  const error = params.get("error");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl });
  };

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Could not initiate Google sign-in. Please try again.",
    OAuthCallback: "Google sign-in failed. Please try again.",
    OAuthAccountNotLinked: "This email is already registered with a different sign-in method.",
    SessionRequired: "Please sign in to access this page.",
    Default: "An unexpected error occurred. Please try again.",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080a06",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Syne', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(66,100%,50%,0.08), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-15%",
          left: "-5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(66,100%,50%,0.04), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "hsl(66,100%,50%,0.15)",
                  border: "1px solid hsl(66,100%,50%,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={18} color="hsl(66,100%,50%)" />
              </div>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "hsl(66,100%,50%)",
                  letterSpacing: "-0.02em",
                  textShadow: "0 0 20px hsl(66,100%,50%,0.3)",
                }}
              >
                Cart Blanche
              </span>
            </div>
          </Link>
          <p
            style={{
              fontSize: 13,
              color: "#4a5568",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            AI-powered agentic commerce
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#0d1117",
            border: "1px solid hsl(66,100%,50%,0.2)",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow:
              "0 0 60px hsl(66,100%,50%,0.05), 0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#e2e8f0",
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#4a5568",
              margin: "0 0 32px",
              lineHeight: 1.5,
            }}
          >
            Sign in to start shopping with your AI concierge
          </p>

          {/* Error banner */}
          {error && (
            <div
              style={{
                background: "#ef444415",
                border: "1px solid #ef444430",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 20,
                fontSize: 13,
                color: "#ef4444",
                lineHeight: 1.5,
              }}
            >
              {errorMessages[error] || errorMessages.Default}
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: loading ? "#1a2332" : "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontSize: 14,
              fontWeight: 600,
              color: loading ? "#4a5568" : "#1a1a1a",
              fontFamily: "'Syne', sans-serif",
              transition: "all 0.2s",
              opacity: loading ? 0.6 : 1,
              boxShadow: loading
                ? "none"
                : "0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)";
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid #4a5568",
                    borderTopColor: "hsl(66,100%,50%)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Connecting…
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "28px 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#1a2332" }} />
            <span style={{ fontSize: 11, color: "#2d3748", letterSpacing: "0.08em" }}>
              SECURE SIGN-IN
            </span>
            <div style={{ flex: 1, height: 1, background: "#1a2332" }} />
          </div>

          {/* Trust indicators */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { icon: ShieldCheck, text: "Your data is never shared with third parties" },
              { icon: Zap, text: "Instant access to AI shopping agent" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                  color: "#4a5568",
                }}
              >
                <Icon size={13} color="#2d3748" style={{ flexShrink: 0 }} />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#2d3748",
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          By signing in you agree to our{" "}
          <a href="#" style={{ color: "#4a5568", textDecoration: "none" }}>
            Terms
          </a>{" "}
          &{" "}
          <a href="#" style={{ color: "#4a5568", textDecoration: "none" }}>
            Privacy Policy
          </a>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}