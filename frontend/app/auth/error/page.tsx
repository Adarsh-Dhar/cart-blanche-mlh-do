"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

const errorMap: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Server misconfiguration",
    description: "There is a problem with the server configuration. Please contact support.",
  },
  AccessDenied: {
    title: "Access denied",
    description: "You do not have permission to sign in.",
  },
  Verification: {
    title: "Verification failed",
    description: "The sign-in link may have expired or already been used.",
  },
  Default: {
    title: "Sign-in error",
    description: "An unexpected error occurred during sign-in. Please try again.",
  },
};

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") || "Default";
  const { title, description } = errorMap[error] || errorMap.Default;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080a06",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#0d1117",
          border: "1px solid #ef444430",
          borderRadius: 20,
          padding: "36px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: "#ef444415",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            border: "1px solid #ef444430",
          }}
        >
          <AlertCircle size={24} color="#ef4444" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", margin: "0 0 10px" }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: "#4a5568", lineHeight: 1.6, margin: "0 0 28px" }}>
          {description}
        </p>
        <Link
          href="/auth/signin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            background: "hsl(66,100%,50%,0.1)",
            border: "1px solid hsl(66,100%,50%,0.3)",
            borderRadius: 10,
            color: "hsl(66,100%,50%)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Try again
        </Link>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');`}</style>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}