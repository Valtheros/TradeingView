import TradeingViewWidget from '@/components/TradeingViewWidget';
import WatchlistButton from '@/components/WatchlistButton';
import { WatchlistItem } from '@/database/models/watchlist.model';
import { getStocksDetails } from '@/lib/actions/finnhub.actions';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  BASELINE_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from '@/lib/constants';
import { formatSymbolForTV } from '@/lib/formatSymBolFortv';
import { notFound } from 'next/navigation';

export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  const stockData = await getStocksDetails(symbol.toUpperCase());
  const watchlist = await getUserWatchlist();

  const symbolForTV = await formatSymbolForTV(symbol, stockData.company);

  const isInWatchlist = watchlist.some(
    (item: WatchlistItem) => item.symbol === symbol.toUpperCase()
  );

  if (!stockData) notFound();
  if (!symbolForTV) notFound();

  return (
    <div className='flex min-h-screen p-4 md:p-6 lg:p-8'>
      <section className='grid grid-cols-1 md:grid-cols-2 gap-8 w-full'>
        {/* Left column */}
        <div className='flex flex-col gap-6'>
          <TradeingViewWidget
            scriptUrl={`${scriptUrl}symbol-info.js`}
            config={SYMBOL_INFO_WIDGET_CONFIG(symbolForTV)}
            height={170}
          />

          <TradeingViewWidget
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={CANDLE_CHART_WIDGET_CONFIG(symbolForTV)}
            classname='custom-chart'
            height={600}
          />

          <TradeingViewWidget
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={BASELINE_WIDGET_CONFIG(symbolForTV)}
            classname='custom-chart'
            height={600}
          />
        </div>

        {/* Right column */}
        <div className='flex flex-col gap-6'>
          <div className='flex items-center justify-between'>
            <WatchlistButton
              symbol={symbol}
              company={stockData.company}
              isInWatchlist={isInWatchlist}
              type='button'
            />
          </div>

          <TradeingViewWidget
            scriptUrl={`${scriptUrl}technical-analysis.js`}
            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbolForTV)}
            height={400}
          />

          <TradeingViewWidget
            scriptUrl={`${scriptUrl}company-profile.js`}
            config={COMPANY_PROFILE_WIDGET_CONFIG(symbolForTV)}
            height={440}
          />

          <TradeingViewWidget
            scriptUrl={`${scriptUrl}financials.js`}
            config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbolForTV)}
            height={464}
          />
        </div>
      </section>
    </div>
  );
}