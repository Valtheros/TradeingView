import { Inngest } from "inngest";
import { branchEnvironment } from './environment';

export const inngest = new Inngest({
    id: "StockMarket",
    env: branchEnvironment,
    eventKey: process.env.INNGEST_EVENT_KEY!,
    ai: {gemini: { apiKey: process.env.GEMINI_API_KEY! }},
})
