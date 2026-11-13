"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** La APK arranca en index.html; la app vive en /app. */
export default function MobileStart() {
  const router = useRouter();
  useEffect(() => router.replace("/app/"), [router]);
  return <main className="flex-1 bg-ink" />;
}
