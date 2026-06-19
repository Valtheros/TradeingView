type FinnhubEnv = {
  FINNHUB_API_KEY?: string;
  NEXT_PUBLIC_FINNHUB_API_KEY?: string;
  [key: string]: string | undefined;
};

export const getFinnhubApiKey = (env: FinnhubEnv = process.env) =>
  env.FINNHUB_API_KEY || env.NEXT_PUBLIC_FINNHUB_API_KEY || "";
