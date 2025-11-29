'use client'

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import StockSearchWrapper from "@/components/StockSearchWrapper"
import StockChart from "@/components/StockChart"
import { getDailySeriesAction } from "@/app/actions"
import { KoreanStockPriceInfo } from "@/lib/api/korea-stock-api"

// 인기 종목 목록
const POPULAR_STOCKS = [
    { code: "005930", name: "삼성전자" },
    { code: "000660", name: "SK하이닉스" },
    { code: "035420", name: "NAVER" },
    { code: "005380", name: "현대차" },
    { code: "051910", name: "LG화학" },
    { code: "006400", name: "삼성SDI" },
    { code: "035720", name: "카카오" },
    { code: "068270", name: "셀트리온" },
]

export default function Dashboard() {
    const [selectedStocks, setSelectedStocks] = useState<string[]>(["005930"])
    const [stocksData, setStocksData] = useState<Map<string, KoreanStockPriceInfo[]>>(new Map())
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

    // 주식 데이터 가져오기
    const fetchStockData = async (stockCode: string) => {
        setLoading(true)
        try {
            const data = await getDailySeriesAction(stockCode, 730) // 2년치 (약 730일)
            if (data && data.length > 0) {
                setStocksData(prev => new Map(prev).set(stockCode, data))
            }
        } catch (error) {
            console.error('Error fetching stock data:', error)
        } finally {
            setLoading(false)
        }
    }

    // 초기 데이터 로드
    useEffect(() => {
        selectedStocks.forEach(code => {
            if (!stocksData.has(code)) {
                fetchStockData(code)
            }
        })
    }, [selectedStocks])

    // 주식 추가
    const handleAddStock = (stock: KoreanStockPriceInfo) => {
        if (!selectedStocks.includes(stock.srtnCd)) {
            setSelectedStocks(prev => [...prev, stock.srtnCd])
            fetchStockData(stock.srtnCd)
        }
    }

    // 주식 제거
    const handleRemoveStock = (stockCode: string) => {
        setSelectedStocks(prev => prev.filter(code => code !== stockCode))
        setStocksData(prev => {
            const newMap = new Map(prev)
            newMap.delete(stockCode)
            return newMap
        })
    }

    // 차트 데이터 준비
    const getChartData = () => {
        const allData: { date: string;[key: string]: any }[] = []
        const dateMap = new Map<string, any>()

        selectedStocks.forEach(stockCode => {
            const data = stocksData.get(stockCode)
            if (data) {
                data.forEach(item => {
                    if (!dateMap.has(item.basDt)) {
                        dateMap.set(item.basDt, { date: item.basDt })
                    }
                    const stockName = POPULAR_STOCKS.find(s => s.code === stockCode)?.name || stockCode
                    dateMap.get(item.basDt)[stockName] = parseFloat(item.clpr)
                })
            }
        })

        return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    }

    // 표 데이터 준비
    const getTableData = () => {
        const tableData: any[] = []
        selectedStocks.forEach(stockCode => {
            const data = stocksData.get(stockCode)
            if (data && data.length > 0) {
                const latest = data[0]
                const stockName = POPULAR_STOCKS.find(s => s.code === stockCode)?.name || stockCode
                tableData.push({
                    code: stockCode,
                    name: stockName,
                    price: parseInt(latest.clpr).toLocaleString(),
                    change: latest.vs,
                    changeRate: latest.fltRt,
                    volume: parseInt(latest.trqu).toLocaleString(),
                    date: latest.basDt,
                })
            }
        })
        return tableData
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <header className="bg-white shadow rounded-lg p-6">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                                한국 주식 차트
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                공공데이터포털 금융위원회 주식시세정보 (2년치 데이터)
                            </p>
                        </div>
                        <div className="mt-4 flex gap-2 md:ml-4 md:mt-0">
                            <button
                                onClick={() => setViewMode('chart')}
                                className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'chart'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                차트
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'table'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                표
                            </button>
                            <StockSearchWrapper onSelect={handleAddStock} />
                        </div>
                    </div>
                </header>

                {/* 인기 종목 빠른 선택 */}
                <div className="bg-white shadow rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">인기 종목</h3>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_STOCKS.map(stock => (
                            <button
                                key={stock.code}
                                onClick={() => {
                                    if (!selectedStocks.includes(stock.code)) {
                                        setSelectedStocks(prev => [...prev, stock.code])
                                        fetchStockData(stock.code)
                                    }
                                }}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${selectedStocks.includes(stock.code)
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {stock.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 선택된 종목 */}
                <div className="bg-white shadow rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">선택된 종목</h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedStocks.map(code => {
                            const stockName = POPULAR_STOCKS.find(s => s.code === code)?.name || code
                            return (
                                <div
                                    key={code}
                                    className="flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full"
                                >
                                    <span className="text-sm font-medium text-teal-900">
                                        {stockName} ({code})
                                    </span>
                                    <button
                                        onClick={() => handleRemoveStock(code)}
                                        className="text-teal-600 hover:text-teal-800"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <main>
                    {loading && (
                        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                            데이터를 불러오는 중...
                        </div>
                    )}

                    {!loading && viewMode === 'chart' && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            {selectedStocks.length > 0 && stocksData.size > 0 ? (
                                <StockChart
                                    data={getChartData()}
                                    symbol={selectedStocks.map(code =>
                                        POPULAR_STOCKS.find(s => s.code === code)?.name || code
                                    ).join(', ')}
                                    multiLine={selectedStocks.length > 1}
                                />
                            ) : (
                                <div className="text-center text-gray-500 py-12">
                                    종목을 선택해주세요
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && viewMode === 'table' && (
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            종목명
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            종목코드
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            현재가
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            전일대비
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            등락률
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            거래량
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            기준일
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {getTableData().map((row) => (
                                        <tr key={row.code} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {row.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {row.code}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                {row.price}원
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${parseFloat(row.change) > 0 ? 'text-red-600' :
                                                    parseFloat(row.change) < 0 ? 'text-blue-600' : 'text-gray-900'
                                                }`}>
                                                {parseFloat(row.change) > 0 ? '+' : ''}{parseInt(row.change).toLocaleString()}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${parseFloat(row.changeRate) > 0 ? 'text-red-600' :
                                                    parseFloat(row.changeRate) < 0 ? 'text-blue-600' : 'text-gray-900'
                                                }`}>
                                                {parseFloat(row.changeRate) > 0 ? '+' : ''}{row.changeRate}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                                {row.volume}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {row.date.slice(0, 4)}-{row.date.slice(4, 6)}-{row.date.slice(6, 8)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </DashboardLayout>
    )
}
