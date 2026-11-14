import { StockSkeleton } from "@/components/PageSkeleton";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";

export default async function Loading() { return <StockSkeleton guest={!getSessionCookie(await headers())} />; }
