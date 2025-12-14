'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface StockChartProps {
  data: any[];
  stockNames: string[];
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00C49F',
];

export default function StockChart({ data, stockNames }: StockChartProps) {
  return (
    <div className="h-full w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
        주식 차트
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              // Format YYYYMMDD to MM/DD
              if (value && value.length === 8) {
                return `${value.substring(4, 6)}/${value.substring(6, 8)}`;
              }
              return value;
            }}
          />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip
            labelFormatter={(value) => {
              if (value && value.length === 8) {
                return `${value.substring(0, 4)}-${value.substring(
                  4,
                  6
                )}-${value.substring(6, 8)}`;
              }
              return value;
            }}
          />
          <Legend />
          {stockNames.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[index % COLORS.length]}
              activeDot={{ r: 8 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
