'use client'

import { useState, useEffect, useRef } from 'react'
import { KoreanStockPriceInfo } from '@/lib/api/korea-stock-api'
import { searchStocksAction, getStockListAction } from '@/app/actions'
import { searchUSStocksAction } from '@/app/actions-us'

interface CompanySelectorProps {
    onSelect: (stock: KoreanStockPriceInfo) => void
    selectedCodes: string[]
    marketType: 'KR' | 'US'
}

export default function CompanySelector({ onSelect, selectedCodes, marketType }: CompanySelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<KoreanStockPriceInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [initialList, setInitialList] = useState<KoreanStockPriceInfo[]>([])
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Load initial list (only for KR for now, or could fetch trending US)
    useEffect(() => {
        const loadInitial = async () => {
            if (marketType === 'KR') {
                try {
                    const list = await getStockListAction(20)
                    setInitialList(list)
                } catch (error) {
                    console.error('Failed to load initial stock list', error)
                }
            } else {
                setInitialList([]) // Clear initial list for US or fetch trending
            }
        }
        loadInitial()
    }, [marketType])

    // Search
    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults(initialList)
                return
            }

            setLoading(true)
            try {
                const action = marketType === 'KR' ? searchStocksAction : searchUSStocksAction
                const data = await action(query)
                setResults(data)
            } catch (error) {
                console.error('Search failed', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(search, 300)
        return () => clearTimeout(debounce)
    }, [query, initialList, marketType])

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 flex items-center gap-2"
            >
                <span>+ 종목 추가</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 flex flex-col">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="회사명 또는 코드 검색..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="overflow-y-auto flex-1 p-2">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">검색 중...</div>
                        ) : results.length > 0 ? (
                            <div className="space-y-1">
                                {results.map((stock) => {
                                    const isSelected = selectedCodes.includes(stock.srtnCd)
                                    return (
                                        <button
                                            key={stock.srtnCd}
                                            onClick={() => {
                                                if (!isSelected) {
                                                    onSelect(stock)
                                                    setIsOpen(false)
                                                    setQuery('')
                                                }
                                            }}
                                            disabled={isSelected}
                                            className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${isSelected
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                                                : 'hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium">{stock.itmsNm}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{stock.srtnCd} | {stock.mrktCtg}</div>
                                            </div>
                                            {isSelected && <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">선택됨</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">검색 결과가 없습니다</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
