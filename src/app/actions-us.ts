'use server';

import { searchUSStocks, getUSStockRecentHistory } from '@/lib/us-stock-api';

export async function searchUSStocksAction(query: string) {
    return await searchUSStocks(query);
}

export async function getUSStockDailySeriesAction(symbol: string, days: number = 30) {
    return await getUSStockRecentHistory(symbol, days);
}
