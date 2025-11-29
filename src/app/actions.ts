'use server'

import {
    searchKoreanStocks,
    getKoreanStockQuote,
    getKoreanStockRecentHistory,
    getStockList
} from '@/lib/api/korea-stock-api'

export async function searchStocksAction(query: string) {
    return await searchKoreanStocks(query)
}

export async function getQuoteAction(stockCode: string) {
    return await getKoreanStockQuote(stockCode)
}

export async function getDailySeriesAction(stockCode: string, days: number = 30) {
    return await getKoreanStockRecentHistory(stockCode, days)
}

export async function getStockListAction(numOfRows: number = 20) {
    return await getStockList(numOfRows)
}
