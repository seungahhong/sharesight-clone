'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface StockTableRow {
  code: string;
  name: string;
  price: string;
  change: string;
  changeRate: string;
  volume: string;
  date: string;
}

interface StockDataTableProps {
  data: StockTableRow[];
  marketType: 'KR' | 'US';
}

export default function StockDataTable({ data, marketType }: StockDataTableProps) {
  return (
    <div className="w-full h-full overflow-auto relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">종목명</TableHead>
            <TableHead className="whitespace-nowrap">종목코드</TableHead>
            <TableHead className="text-right whitespace-nowrap">종가</TableHead>
            <TableHead className="text-right whitespace-nowrap">
              전일대비
            </TableHead>
            <TableHead className="text-right whitespace-nowrap">
              등락률
            </TableHead>
            <TableHead className="text-right whitespace-nowrap">
              거래량
            </TableHead>
            <TableHead className="whitespace-nowrap">기준일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((row) => (
              <TableRow key={`${row.code}-${row.date}`}>
                <TableCell className="font-medium whitespace-nowrap">
                  {row.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.code}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {marketType === 'KR'
                    ? `${row.price}원`
                    : `$${parseFloat(row.price).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                </TableCell>
                <TableCell
                  className={`text-right font-medium whitespace-nowrap ${parseFloat(row.change) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : parseFloat(row.change) < 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                >
                  {parseFloat(row.change) > 0 ? '+' : ''}
                  {marketType === 'KR'
                    ? parseInt(row.change).toLocaleString()
                    : parseFloat(row.change).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </TableCell>
                <TableCell
                  className={`text-right font-medium whitespace-nowrap ${parseFloat(row.changeRate) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : parseFloat(row.changeRate) < 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-gray-100'
                    }`}
                >
                  {parseFloat(row.changeRate) > 0 ? '+' : ''}
                  {row.changeRate}%
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {row.volume}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.date.slice(0, 4)}-{row.date.slice(4, 6)}-
                  {row.date.slice(6, 8)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                데이터가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
