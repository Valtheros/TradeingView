"use client";
import { LoadFailure } from "@/components/SectionBoundary";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="app-content"><LoadFailure retry={reset} /></main>;
}
