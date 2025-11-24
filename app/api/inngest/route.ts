import { inngest } from "@/lib/inngest/client";
import { DailyNewsSummary, sendSignUpEmail } from "@/lib/inngest/functions";
import { serve } from "inngest/next";

export const { GET, POST, PUT} = serve({
    client: inngest,
    functions: [sendSignUpEmail, DailyNewsSummary],
    signingKey: process.env.INNGEST_SIGNING_KEY,
})