import { createHash } from 'node:crypto';

export const isPreview = process.env.VERCEL_ENV === 'preview';
export const branchEnvironment = isPreview ? process.env.VERCEL_GIT_COMMIT_REF || 'preview' : undefined;
export const newsCollection = branchEnvironment
  ? `news_summaries_preview_${createHash('sha256').update(branchEnvironment).digest('hex').slice(0, 12)}`
  : 'news_summaries';
