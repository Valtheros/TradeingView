import { getNews } from "../actions/finnhub.actions";
import { saveUserNewsSummary } from "../actions/saveusernews.action";
import { getAllUserForNews } from "../actions/user.action";
import { getWatchlistSymbolsByEmail } from "../actions/watchlist.actions";
import { sendWelcomeEmail } from "../nodemailer";
import { getFormattedTodayDateForLocale, getTodayString } from "../utils";
import { isLocale } from "../i18n";
import { inngest } from "./client";
import {
  buildNewsSummaryPrompt,
  PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "./prompts";

export const sendSignUpEmail = inngest.createFunction(
  { id: "sign-up-email" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    const userProfile = `
         - Country: ${event.data.country}
         - Investment Goals: ${event.data.investmentGoals}
         - Risk Tolerance: ${event.data.riskTolerance}
         - Preferred Industry: ${event.data.preferredIndustry}
        `;

    const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
      "{{userProfile}}",
      userProfile
    );

    const response = await step.ai.infer("generate-welcome-intro", {
      model: step.ai.models.gemini({
        model: "gemini-3.5-flash-lite",
      }),
      body: {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
    });

    await step.run("send-welcome-email", async () => {
      const part = response.candidates?.[0]?.content?.parts?.[0];
      const introText =
        (part && "text" in part ? part.text : null) ||
        "Thanks for joining StockMarket!. You now have the tool to make a smart investment decision.";

      const {
        data: { email, name },
      } = event;
      return await sendWelcomeEmail({
        email,
        name,
        intro: introText,
      });
    });

    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  }
);

export const DailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [{ event: "app/news.daily.fetched" }, { cron: "0 12 * * *" }],
  async ({ event, step }) => {
    // Step #1: Get all users for news delivery
    const users = await step.run("get-all-users", async () =>
      getAllUserForNews(event.data.userId)
    );

    if (!users || users.length === 0)
      return {
        success: false,
        message: "No users found for news summary",
      };

    // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{
        user: UserForNews;
        articles: MarketNewsArticle[];
      }> = [];
      for (const user of users as UserForNews[]) {
        try {
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          let articles = await getNews(symbols);
          // Enforce max 6 articles per user
          articles = (articles || []).slice(0, 6);
          // If still empty, fallback to general
          if (!articles || articles.length === 0) {
            articles = await getNews();
            articles = (articles || []).slice(0, 6);
          }
          perUser.push({ user, articles });
        } catch (e) {
          console.error("daily-news: error preparing user news", user.email, e);
          perUser.push({ user, articles: [] });
        }
      }
      return perUser;
    });

    // Step #3: (placeholder) Summarize news via AI
    const requestedLocales = Array.isArray(event.data.locales)
      ? event.data.locales.filter(isLocale)
      : [];
    const summaryLocales =
      requestedLocales.length > 0 ? requestedLocales : (["en", "th"] as const);
    const userNewsSummaries: {
      user: UserForNews;
      locale: (typeof summaryLocales)[number];
      readableDate: string;
      newsContent: string | null;
    }[] = [];
    const dateISO = getTodayString();

    for (const { user, articles } of results) {
      for (const locale of summaryLocales) {
        try {
          const prompt = buildNewsSummaryPrompt(locale, articles);

          const response = await step.ai.infer(
            `summarize-news-${locale}-${user.email}`,
            {
              model: step.ai.models.gemini({ model: "gemini-3.5-flash-lite" }),
              body: {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
              },
            }
          );

          const part = response.candidates?.[0]?.content?.parts?.[0];
          const newsContent =
            (part && "text" in part ? part.text : null) ||
            (locale === "th" ? "ไม่มีข่าวตลาด" : "No market news.");

          userNewsSummaries.push({
            user,
            locale,
            readableDate: getFormattedTodayDateForLocale(locale),
            newsContent,
          });
        } catch (e) {
          console.error(
            `Failed to summarize ${locale} news for : `,
            user.email,
            e
          );
          userNewsSummaries.push({
            user,
            locale,
            readableDate: getFormattedTodayDateForLocale(locale),
            newsContent: null,
          });
        }
      }
    }
    // Step #4: Persist summaries for in-app viewing
    await step.run("save-news-summaries", async () => {
      await Promise.all(
        userNewsSummaries.map(async ({ user, locale, readableDate, newsContent }) => {
          if (!newsContent) return false;

          return await saveUserNewsSummary({
            userId: user.id,
            email: user.email,
            name: user.name,
            locale,
            readableDate,
            dateISO,
            newsContent,
          });
        })
      );
      return {
        success: true,
        message: "Daily news summaries stored successfully",
      };
    });

    return { success: true, message: "Update news success" };
  }
);
