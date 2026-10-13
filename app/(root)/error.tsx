"use client";
import { LoadFailure } from "@/components/SectionBoundary";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <LoadFailure retry={reset} />;
}
