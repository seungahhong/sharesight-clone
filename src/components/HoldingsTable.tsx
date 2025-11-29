'use client'

interface Holding {
    id: string
    symbol: string
    quantity: number
    buyPrice: number
    currentPrice?: number
    buyDate: string
}

interface HoldingsTableProps {
    holdings: Holding[]
}

export default function HoldingsTable({ holdings }: HoldingsTableProps) {
    return (
        <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                        Symbol
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Quantity
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Buy Price
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Current Price
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Gain/Loss
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {holdings.map((holding) => {
                                    const currentPrice = holding.currentPrice || 0
                                    const gainLoss = (currentPrice - holding.buyPrice) * holding.quantity
                                    const gainLossPercent = ((currentPrice - holding.buyPrice) / holding.buyPrice) * 100

                                    return (
                                        <tr key={holding.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                {holding.symbol}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{holding.quantity}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${holding.buyPrice.toFixed(2)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${currentPrice.toFixed(2)}</td>
                                            <td className={classNames(
                                                gainLoss >= 0 ? 'text-green-600' : 'text-red-600',
                                                "whitespace-nowrap px-3 py-4 text-sm font-medium"
                                            )}>
                                                ${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}
