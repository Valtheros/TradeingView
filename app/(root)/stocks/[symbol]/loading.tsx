"use client";

import { StockSkeleton } from "@/components/PageSkeleton";
import { useAppAccess } from "@/components/AppAccessProvider";

export default function Loading() {
  const { user } = useAppAccess();
  return <StockSkeleton guest={!user} />;
}
