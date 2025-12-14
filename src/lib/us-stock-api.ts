import { KoreanStockPriceInfo } from './api/korea-stock-api';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Search for US stocks by name or symbol using Alpha Vantage
 */
export async function searchUSStocks(query: string): Promise<KoreanStockPriceInfo[]> {
    if (!query || !API_KEY) {
        if (!API_KEY) console.error('Alpha Vantage API Key is missing');
        return [];
    }

    try {
        const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data['Note'] || data['Information']) {
            console.warn('Alpha Vantage API Limit/Info:', data);
            return [];
        }

        const matches = data['bestMatches'];
        if (!matches || !Array.isArray(matches)) return [];

        return matches
            .filter((match: any) => match['4. region'] === 'United States')
            .map((match: any) => ({
                basDt: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                srtnCd: match['1. symbol'],
                isinCd: match['1. symbol'],
                itmsNm: match['2. name'],
                mrktCtg: 'US',
                clpr: '0',
                vs: '0',
                fltRt: '0',
                mkp: '0',
                hipr: '0',
                lopr: '0',
                trqu: '0',
                trPrc: '0',
                lstgStCnt: '0',
                mrktTotAmt: '0',
            }));
    } catch (error) {
        console.error('Error searching US stocks:', error);
        return [];
    }
}

/**
 * Get historical stock price data for US stocks using Alpha Vantage
 */
export async function getUSStockHistory(
    symbol: string,
    startDate: Date,
    endDate: Date
): Promise<KoreanStockPriceInfo[]> {
    if (!API_KEY) {
        console.error('Alpha Vantage API Key is missing');
        return [];
    }

    try {
        // Alpha Vantage TIME_SERIES_DAILY returns last 100 data points by default (compact)
        // or full history (full). For performance and free tier, compact is usually better if we only need recent data.
        // However, if we need a specific range, we might need full, but let's stick to compact (100 days) for now as it covers "1 month" and "1 week".
        // "1 year" would require 'full', but that might be heavy. Let's try 'compact' first.
        // Actually, user might want 1 year. Let's use 'full' if needed, but start with 'compact' for speed if days < 100.
        // But to simplify, let's just fetch 'compact' (latest 100 data points) which is usually enough for recent trends.
        // If the user selects '1year', we might miss data with 'compact'.
        // Let's use 'outputsize=full' only if requested range is large, but for now let's default to compact to save bandwidth/time, 
        // or maybe just use compact and warn if it's not enough. 
        // Wait, the free tier is generous with data points per call, but rate limited.
        // Let's use 'compact' (100 data points) which covers ~5 months of trading days. 
        // If we need 1 year, we need 'full'.

        // Let's check the requested range.
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const outputSize = diffDays > 100 ? 'full' : 'compact';

        const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data['Note'] || data['Information']) {
            console.warn('Alpha Vantage API Limit/Info:', data);
            return [];
        }

        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) return [];

        const result: KoreanStockPriceInfo[] = [];
        const startStr = startDate.toISOString().slice(0, 10);
        const endStr = endDate.toISOString().slice(0, 10);

        Object.keys(timeSeries).forEach((date) => {
            if (date >= startStr && date <= endStr) {
                const dayData = timeSeries[date];
                const close = parseFloat(dayData['4. close']).toFixed(2);
                const open = parseFloat(dayData['1. open']).toFixed(2);
                const high = parseFloat(dayData['2. high']).toFixed(2);
                const low = parseFloat(dayData['3. low']).toFixed(2);
                const volume = dayData['5. volume'];

                // Calculate change (vs previous day) - this is hard without guaranteed previous day in this loop order.
                // We can calculate it after sorting.

                result.push({
                    basDt: date.replace(/-/g, ''),
                    srtnCd: symbol,
                    isinCd: symbol,
                    itmsNm: symbol, // Name not available in daily series
                    mrktCtg: 'US',
                    clpr: close,
                    vs: '0', // Will calculate
                    fltRt: '0', // Will calculate
                    mkp: open,
                    hipr: high,
                    lopr: low,
                    trqu: volume,
                    trPrc: '0',
                    lstgStCnt: '0',
                    mrktTotAmt: '0',
                });
            }
        });

        // Sort by date ascending to calculate change
        result.sort((a, b) => a.basDt.localeCompare(b.basDt));

        // Calculate change and fluctuation rate
        for (let i = 1; i < result.length; i++) {
            const prev = parseFloat(result[i - 1].clpr);
            const curr = parseFloat(result[i].clpr);
            const change = curr - prev;
            const rate = (change / prev) * 100;

            result[i].vs = change.toFixed(2);
            result[i].fltRt = rate.toFixed(2);
        }

        // Return descending (newest first) as expected by frontend
        return result.reverse();

    } catch (error) {
        console.error('Error fetching US stock history:', error);
        return [];
    }
}

/**
 * Get recent US stock history
 */
export async function getUSStockRecentHistory(
    symbol: string,
    days: number = 30
): Promise<KoreanStockPriceInfo[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days - 5); // Buffer

    return getUSStockHistory(symbol, startDate, endDate);
}
