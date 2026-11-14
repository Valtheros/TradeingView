import { NonRetriableError } from 'inngest';
import { ObjectId } from 'mongodb';
import { getNews } from '../actions/finnhub.actions';
import { getRecentNewsSummaries, saveUserNewsSummary } from '../actions/saveusernews.action';
import { getAllUserForNews } from '../actions/user.action';
import { getWatchlistSymbolsByEmail } from '../watchlist-server';
import { sendWelcomeEmail } from '../nodemailer';
import { isLocale, type Locale } from '../i18n';
import { digestIsCurrent, expectedDigestDate, isDigestDate } from '../news-policy';
import { inngest } from './client';
import { isPreview } from './environment';
import { generateGeminiText, NEWS_MODEL } from './gemini';
import { buildNewsSummaryPrompt, PERSONALIZED_WELCOME_EMAIL_PROMPT } from './prompts';

const aiConcurrency = { limit: 1, key: '"gemini-text"', scope: 'account' as const };

export const sendSignUpEmail = inngest.createFunction(
  { id: 'sign-up-email', retries: 3, concurrency: aiConcurrency, throttle: { limit: 4, period: '1m' } },
  { event: 'app/user.created' },
  async ({ event, step }) => {
    if (isPreview) return { status: 'skipped', reason: 'Preview never sends welcome emails' };
    const userProfile = `Country: ${event.data.country}\nInvestment Goals: ${event.data.investmentGoals}\nRisk Tolerance: ${event.data.riskTolerance}\nPreferred Industry: ${event.data.preferredIndustry}`;
    const intro = await step.run('generate-welcome-intro', () => generateGeminiText(
      PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile), 1024,
    ));
    await step.run('send-welcome-email', () => sendWelcomeEmail({ email: event.data.email, name: event.data.name, intro }));
    return { success: true, message: 'Welcome email sent successfully' };
  },
);

export const DailyNewsSummary = inngest.createFunction(
  { id: 'daily-news-summary', retries: 3 },
  [{ event: 'app/news.daily.fetched' }, ...(!isPreview ? [{ cron: 'TZ=Asia/Bangkok 0 19 * * *' }] : [])],
  async ({ event, step }) => {
    const userId = event.data.userId;
    if (userId !== undefined && (typeof userId !== 'string' || !ObjectId.isValid(userId))) throw new NonRetriableError('Invalid news user ID');
    const users = await step.run('get-all-users', () => getAllUserForNews(userId));
    const requestedLocales: unknown[] = Array.isArray(event.data.locales) ? event.data.locales : ['en', 'th'];
    const locales: Locale[] = [...new Set(requestedLocales.filter(isLocale))];
    if (!locales.length) throw new NonRetriableError('No valid news locales');
    const dateISO = expectedDigestDate(new Date(event.ts || Date.now()));
    const events = users.flatMap(user => locales.map(locale => ({
      id: `news-${event.id}-${user.id}-${locale}-${dateISO}`,
      name: 'app/news.summary.requested', data: { userId: user.id, locale, dateISO },
    })));
    if (events.length) await step.sendEvent('dispatch-news-editions', events);
    return { status: 'dispatched', editions: events.length, dateISO };
  },
);

export const GenerateNewsSummary = inngest.createFunction(
  {
    id: 'generate-news-summary', retries: 3, concurrency: aiConcurrency,
    throttle: { limit: 4, period: '1m' },
    singleton: { key: 'event.data.userId + ":" + event.data.locale + ":" + event.data.dateISO', mode: 'skip' },
  },
  { event: 'app/news.summary.requested' },
  async ({ event, step }) => {
    const { userId, locale, dateISO } = event.data;
    if (typeof userId !== 'string' || !ObjectId.isValid(userId) || !isLocale(locale) || !isDigestDate(dateISO)) {
      throw new NonRetriableError('Invalid news edition');
    }
    const current = await step.run('check-saved-edition', () => getRecentNewsSummaries(userId, 1, locale));
    if (digestIsCurrent(current[0], dateISO)) return { status: 'already-current', userId, locale, dateISO };
    const user = await step.run('load-news-user', async () => {
      const users = await getAllUserForNews(userId);
      if (!users[0]) throw new NonRetriableError('News user no longer exists');
      return users[0];
    });
    const articles = await step.run('fetch-user-news', async () => {
      const symbols = await getWatchlistSymbolsByEmail(user.email);
      const articles = (await getNews(symbols)).slice(0, 6);
      if (!articles.length) throw new Error('No source articles available; keeping the saved digest');
      return articles;
    });
    const html = await step.run('generate-summary', () => generateGeminiText(buildNewsSummaryPrompt(locale, articles)));
    await step.run('save-news-summary', async () => {
      const saved = await saveUserNewsSummary({
        userId: user.id, email: user.email, name: user.name, locale, dateISO, newsContent: html,
        readableDate: new Date(`${dateISO}T12:00:00Z`).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok',
        }),
      });
      if (!saved) throw new Error('News summary was not saved');
    });
    return { status: 'saved', userId, locale, dateISO, model: NEWS_MODEL };
  },
);
