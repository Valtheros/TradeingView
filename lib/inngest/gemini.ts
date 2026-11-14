import 'server-only';
import { NonRetriableError, RetryAfterError } from 'inngest';

export const NEWS_MODEL = 'gemini-3.1-flash-lite';
type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  error?: { details?: { retryDelay?: string; violations?: { quotaId?: string; quotaMetric?: string; quotaValue?: string }[] }[] };
};

export async function generateGeminiText(prompt: string, maxOutputTokens = 6144) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new NonRetriableError('GEMINI_API_KEY is not configured');
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${NEWS_MODEL}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens } }),
      signal: AbortSignal.timeout(60000), cache: 'no-store',
    });
  } catch {
    throw new RetryAfterError('Gemini request timed out or could not connect', '1m');
  }
  const result: GeminiResponse = await response.json().catch(() => ({}));
  if (response.status === 429) {
    const details = result.error?.details || [];
    const dailyQuota = details.some(detail => detail.violations?.some(violation =>
      /per.?day/i.test(`${violation.quotaId} ${violation.quotaMetric}`) || violation.quotaValue === '0'));
    if (dailyQuota) throw new NonRetriableError(`Gemini ${NEWS_MODEL}: daily quota exhausted or model quota unavailable`);
    const header = response.headers.get('retry-after');
    const headerDelay = header ? (Number.isFinite(Number(header)) ? Number(header) * 1000 : Date.parse(header) - Date.now()) : 0;
    const providerDelay = Math.max(0, ...details.map(detail => parseFloat(detail.retryDelay || '0') * 1000).filter(Number.isFinite));
    throw new RetryAfterError(`Gemini ${NEWS_MODEL}: rate limited (429)`, Math.max(60000, headerDelay || 0, providerDelay));
  }
  if (response.status >= 500) throw new RetryAfterError(`Gemini unavailable (${response.status})`, '1m');
  if (!response.ok) throw new NonRetriableError(`Gemini request rejected (${response.status})`);
  const candidate = result.candidates?.[0];
  const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim();
  if (!text || candidate?.finishReason !== 'STOP') throw new Error('Gemini returned empty, blocked or incomplete content');
  return text.replace(/^```(?:html)?\s*\n([\s\S]*?)\n```$/i, '$1').trim();
}
