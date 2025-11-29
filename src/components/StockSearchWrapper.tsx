'use client'

import StockSearch from "./StockSearch"
import { KoreanStockPriceInfo } from "@/lib/api/korea-stock-api"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function StockSearchWrapper() {
    const [selectedStock, setSelectedStock] = useState<KoreanStockPriceInfo | null>(null)
    const router = useRouter()

    const handleSelect = async (stock: KoreanStockPriceInfo) => {
        setSelectedStock(stock)
        // Refresh the page to show the selected stock
        // In a real app, you might want to use URL params or state management
        alert(`선택한 주식: ${stock.itmsNm} (${stock.srtnCd})\n현재가: ${parseInt(stock.clpr).toLocaleString()}원`)
    }

    return (
        <div className="flex items-center gap-2">
            <StockSearch onSelect={handleSelect} />
            {selectedStock && (
                <span className="text-sm text-gray-600">
                    {selectedStock.itmsNm}
                </span>
            )}
        </div>
    )
}
