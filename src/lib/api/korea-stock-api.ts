const API_KEY = process.env.KOREA_STOCK_API_KEY;
const BASE_URL = 'http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService';

export interface KoreanStockPriceInfo {
    basDt: string;          // 기준일자 (YYYYMMDD)
    srtnCd: string;         // 단축코드
    isinCd: string;         // ISIN 코드
    itmsNm: string;         // 종목명
    mrktCtg: string;        // 시장구분
    clpr: string;           // 종가
    vs: string;             // 대비
    fltRt: string;          // 등락률
    mkp: string;            // 시가
    hipr: string;           // 고가
    lopr: string;           // 저가
    trqu: string;           // 거래량
    trPrc: string;          // 거래대금
    lstgStCnt: string;      // 상장주식수
    mrktTotAmt: string;     // 시가총액
}

export interface KoreanStockApiResponse {
    response: {
        header: {
            resultCode: string;
            resultMsg: string;
        };
        body: {
            items: {
                item: KoreanStockPriceInfo[] | KoreanStockPriceInfo;
            };
            numOfRows: number;
            pageNo: number;
            totalCount: number;
        };
    };
}

/**
 * Search for Korean stocks by name
 */
export async function searchKoreanStocks(query: string): Promise<KoreanStockPriceInfo[]> {
    if (!query || !API_KEY) return [];

    // Get date range: Last 7 days to ensure we hit a trading day
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const endBasDt = today.toISOString().slice(0, 10).replace(/-/g, '');
    const beginBasDt = weekAgo.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${BASE_URL}/getStockPriceInfo?serviceKey=${API_KEY}&resultType=json&numOfRows=100&likeItmsNm=${encodeURIComponent(query)}&beginBasDt=${beginBasDt}&endBasDt=${endBasDt}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        const data: KoreanStockApiResponse = await res.json();

        if (data.response.header.resultCode !== '00') {
            console.error('Korean Stock API Error:', data.response.header.resultMsg);
            return [];
        }

        const items = data.response.body.items?.item;
        if (!items) return [];

        const rawList = Array.isArray(items) ? items : [items];

        // Deduplicate by srtnCd, keeping the latest entry
        const latestMap = new Map<string, KoreanStockPriceInfo>();
        rawList.forEach(item => {
            if (!latestMap.has(item.srtnCd) || item.basDt > latestMap.get(item.srtnCd)!.basDt) {
                latestMap.set(item.srtnCd, item);
            }
        });

        return Array.from(latestMap.values());
    } catch (error) {
        console.error('Error fetching Korean stocks:', error);
        return [];
    }
}

/**
 * Get a list of Korean stocks (default list)
 */
export async function getStockList(numOfRows: number = 20): Promise<KoreanStockPriceInfo[]> {
    if (!API_KEY) return [];

    // Get date range: Last 7 days
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const endBasDt = today.toISOString().slice(0, 10).replace(/-/g, '');
    const beginBasDt = weekAgo.toISOString().slice(0, 10).replace(/-/g, '');

    // Fetch without likeItmsNm to get a list
    // We need to fetch enough rows to get unique companies, as we might get duplicates across days.
    // Let's fetch more rows (e.g. 100) and then slice to numOfRows after deduplication.
    const fetchRows = numOfRows * 5;
    const url = `${BASE_URL}/getStockPriceInfo?serviceKey=${API_KEY}&resultType=json&numOfRows=${fetchRows}&beginBasDt=${beginBasDt}&endBasDt=${endBasDt}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        const data: KoreanStockApiResponse = await res.json();

        if (data.response.header.resultCode !== '00') {
            console.error('Korean Stock API Error:', data.response.header.resultMsg);
            return [];
        }

        const items = data.response.body.items?.item;
        if (!items) return [];

        const rawList = Array.isArray(items) ? items : [items];

        // Deduplicate by srtnCd, keeping the latest entry
        const latestMap = new Map<string, KoreanStockPriceInfo>();
        rawList.forEach(item => {
            if (!latestMap.has(item.srtnCd) || item.basDt > latestMap.get(item.srtnCd)!.basDt) {
                latestMap.set(item.srtnCd, item);
            }
        });

        return Array.from(latestMap.values()).slice(0, numOfRows);
    } catch (error) {
        console.error('Error fetching stock list:', error);
        return [];
    }
}

/**
 * Get stock price info for a specific stock code
 */
export async function getKoreanStockQuote(stockCode: string): Promise<KoreanStockPriceInfo | null> {
    if (!stockCode || !API_KEY) return null;

    // Get today's date in YYYYMMDD format
    const today = new Date();
    const basDt = today.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${BASE_URL}/getStockPriceInfo?serviceKey=${API_KEY}&resultType=json&likeSrtnCd=${stockCode}&basDt=${basDt}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        const data: KoreanStockApiResponse = await res.json();

        if (data.response.header.resultCode !== '00') {
            console.error('Korean Stock API Error:', data.response.header.resultMsg);
            return null;
        }

        const items = data.response.body.items?.item;
        if (!items) return null;

        return Array.isArray(items) ? items[0] : items;
    } catch (error) {
        console.error('Error fetching Korean stock quote:', error);
        return null;
    }
}

/**
 * Get historical stock price data for a date range
 */
export async function getKoreanStockHistory(
    stockCode: string,
    startDate: string, // YYYYMMDD
    endDate: string    // YYYYMMDD
): Promise<KoreanStockPriceInfo[]> {
    if (!stockCode || !API_KEY) return [];

    const url = `${BASE_URL}/getStockPriceInfo?serviceKey=${API_KEY}&resultType=json&numOfRows=1000&likeSrtnCd=${stockCode}&beginBasDt=${startDate}&endBasDt=${endDate}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        const data: KoreanStockApiResponse = await res.json();

        if (data.response.header.resultCode !== '00') {
            console.error('Korean Stock API Error:', data.response.header.resultMsg);
            return [];
        }

        const items = data.response.body.items?.item;
        if (!items) return [];

        const result = Array.isArray(items) ? items : [items];

        // Sort by date descending (newest first)
        return result.sort((a, b) => b.basDt.localeCompare(a.basDt));
    } catch (error) {
        console.error('Error fetching Korean stock history:', error);
        return [];
    }
}

/**
 * Get stock data for the last N days
 */
export async function getKoreanStockRecentHistory(
    stockCode: string,
    days: number = 30
): Promise<KoreanStockPriceInfo[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
    const startDateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');

    return getKoreanStockHistory(stockCode, startDateStr, endDateStr);
}
