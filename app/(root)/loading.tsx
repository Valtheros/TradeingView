import PageSkeleton from "@/components/PageSkeleton";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
export default async function Loading() { return <PageSkeleton guest={!getSessionCookie(await headers())} />; }
