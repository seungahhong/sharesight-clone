'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StockChart from '@/components/StockChart';
import CompanySelector from '@/components/CompanySelector';
import StockDataTable from '@/components/StockDataTable';
import { getDailySeriesAction } from '@/app/actions';
import { getUSStockDailySeriesAction } from '@/app/actions-us';
import { KoreanStockPriceInfo } from '@/lib/api/korea-stock-api';
import { useSession, signIn, signOut } from "next-auth/react";
import { migrateLocalData } from "@/app/actions/auth-migration";
import { getUserHoldings, addHolding, removeHolding } from "@/app/actions/holdings";
import { useRouter } from 'next/navigation';

interface SelectedStock {
  code: string;
  name: string;
}

type TimeRange = '1week' | '1month' | '1year';

export default function Dashboard() {
  const [selectedStocks, setSelectedStocks] = useState<SelectedStock[]>([]);
  const [stocksData, setStocksData] = useState<
    Map<string, KoreanStockPriceInfo[]>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [timeRange, setTimeRange] = useState<TimeRange>('1year');
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [tableFilterStock, setTableFilterStock] = useState<string>('all'); // 'all' or stock code
  const [marketType, setMarketType] = useState<'KR' | 'US'>('KR');
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dbHoldings, setDbHoldings] = useState<any[]>([]); // Store fetched holdings
  const router = useRouter();

  // Usage Limit & Migration Logic
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      // Check usage limit
      const usageCount = parseInt(localStorage.getItem('dashboard_usage_count') || '0', 10);
      if (usageCount >= 10) {
        setShowLoginModal(true);
      } else {
        localStorage.setItem('dashboard_usage_count', (usageCount + 1).toString());
      }
    } else if (status === 'authenticated') {
      // Fetch holdings from DB
      getUserHoldings().then((result) => {
        if (result.success && result.holdings) {
          setDbHoldings(result.holdings);
          // Convert holdings to SelectedStock format
          // Assuming we want to display all holdings regardless of market type initially?
          // Or we should filter by market type?
          // The current UI separates KR and US.
          // But Holding doesn't explicitly store market type (except maybe by symbol format).
          // However, we can just load them all into selectedStocks?
          // But selectedStocks is used for both KR and US depending on marketType state.
          // Wait, the UI switches `selectedStocks` based on `marketType` in `useEffect` (line 84-91 saves it, line 34-82 loads it).
          // But if we are logged in, we should ignore localStorage and use DB.
          // So we need to separate KR and US holdings from DB.
          // Simple heuristic: KR stocks are usually numbers (005930), US stocks are letters (AAPL).

          const krHoldings = result.holdings.filter(h => /^\d+$/.test(h.symbol));
          const usHoldings = result.holdings.filter(h => !/^\d+$/.test(h.symbol));

          if (marketType === 'KR') {
            setSelectedStocks(krHoldings.map(h => ({ code: h.symbol, name: h.name || h.symbol })));
          } else {
            setSelectedStocks(usHoldings.map(h => ({ code: h.symbol, name: h.name || h.symbol })));
          }
        }
      });

      // Check for local data to migrate
      const localKR = localStorage.getItem('selectedStocks_KR');
      const localUS = localStorage.getItem('selectedStocks_US');

      if (localKR || localUS) {
        const stocksKR = localKR ? JSON.parse(localKR) : [];
        const stocksUS = localUS ? JSON.parse(localUS) : [];

        if (stocksKR.length > 0 || stocksUS.length > 0) {
          migrateLocalData(stocksKR, stocksUS).then((result) => {
            if (result.success) {
              localStorage.removeItem('selectedStocks_KR');
              localStorage.removeItem('selectedStocks_US');
              // Refetch holdings after migration instead of reloading
              getUserHoldings().then((res) => {
                if (res.success && res.holdings) {
                  setDbHoldings(res.holdings);
                }
              });
            }
          });
        }
      }
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selectedStocks when dbHoldings or marketType changes (only if authenticated)
  useEffect(() => {
    if (status === 'authenticated') {
      const krHoldings = dbHoldings.filter(h => /^\d+$/.test(h.symbol));
      const usHoldings = dbHoldings.filter(h => !/^\d+$/.test(h.symbol));

      const newSelection = marketType === 'KR'
        ? krHoldings.map(h => ({ code: h.symbol, name: h.name || h.symbol }))
        : usHoldings.map(h => ({ code: h.symbol, name: h.name || h.symbol }));

      // Only update if changed to prevent deep recursion/refetching
      setSelectedStocks(prev => {
        const isSame = prev.length === newSelection.length &&
          prev.every((p, i) => p.code === newSelection[i].code);
        return isSame ? prev : newSelection;
      });
    }
  }, [dbHoldings, marketType, status]);

  // Load from LocalStorage on mount (only if unauthenticated or loading)
  useEffect(() => {
    if (status === 'authenticated') return; // Skip if authenticated

    // Load market type
    const savedMarketType = localStorage.getItem('marketType') as 'KR' | 'US';
    let currentMarket = 'KR';
    if (savedMarketType && (savedMarketType === 'KR' || savedMarketType === 'US')) {
      setMarketType(savedMarketType);
      currentMarket = savedMarketType;
    }

    // Load stocks for the current market
    const storageKey = currentMarket === 'US' ? 'selectedStocks_US' : 'selectedStocks_KR';
    const savedStocks = localStorage.getItem(storageKey);

    if (savedStocks) {
      try {
        const parsed = JSON.parse(savedStocks);
        setSelectedStocks(parsed);
      } catch (e) {
        console.error(`Failed to parse ${storageKey} from localStorage`, e);
      }
    } else {
      // Default stocks
      if (currentMarket === 'KR') {
        setSelectedStocks([{ code: '005930', name: '삼성전자' }]);
      } else {
        setSelectedStocks([]);
      }
    }

    // Load viewMode from localStorage
    const savedViewMode = localStorage.getItem('viewMode');
    if (
      savedViewMode &&
      (savedViewMode === 'chart' || savedViewMode === 'table')
    ) {
      setViewMode(savedViewMode as 'chart' | 'table');
    }

    // Load timeRange from localStorage
    const savedTimeRange = localStorage.getItem('timeRange');
    if (
      savedTimeRange &&
      ['1week', '1month', '1year'].includes(savedTimeRange)
    ) {
      setTimeRange(savedTimeRange as TimeRange);
    }

    setIsLoaded(true);
  }, []);

  // Save to LocalStorage whenever selectedStocks changes
  useEffect(() => {
    if (isLoaded) {
      const storageKey = marketType === 'US' ? 'selectedStocks_US' : 'selectedStocks_KR';
      localStorage.setItem(storageKey, JSON.stringify(selectedStocks));
    }
  }, [selectedStocks, isLoaded, marketType]);

  // Save marketType to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('marketType', marketType);
    }
  }, [marketType, isLoaded]);

  // Save viewMode to LocalStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('viewMode', viewMode);
    }
  }, [viewMode, isLoaded]);

  // Save timeRange to LocalStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('timeRange', timeRange);
    }
  }, [timeRange, isLoaded]);

  // Fetch data for selected stocks when selection or timeRange changes
  useEffect(() => {
    if (!isLoaded) return;

    // Clear existing data when range changes to force refetch with correct range
    // Or we can just refetch.
    // If we switch from 1year to 1week, we technically have the data, but it's easier to just refetch
    // or filter. But the user asked to "fetch -7 days" etc.
    // So we should refetch to be precise with the API call as requested.

    // However, if we have 1 year data, we can just slice it for 1 week.
    // But the user explicitly said "get -7 days data... get -30 days data...".
    // I will follow the instruction to fetch the specific amount.

    setStocksData(new Map()); // Clear data to trigger loading state or just refresh

    selectedStocks.forEach((stock) => {
      fetchStockData(stock.code);
    });
  }, [selectedStocks, timeRange, isLoaded, marketType]);

  const fetchStockData = async (stockCode: string) => {
    setLoading(true);
    try {
      let days = 365;
      if (timeRange === '1week') days = 7;
      if (timeRange === '1month') days = 30;

      const action =
        marketType === 'KR'
          ? getDailySeriesAction
          : getUSStockDailySeriesAction;

      const data = await action(stockCode, days);
      if (data && data.length > 0) {
        setStocksData((prev) => new Map(prev).set(stockCode, data));
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (stock: KoreanStockPriceInfo) => {
    if (!selectedStocks.some((s) => s.code === stock.srtnCd)) {
      // Optimistic update
      const newStock = { code: stock.srtnCd, name: stock.itmsNm };
      setSelectedStocks((prev) => [...prev, newStock]);

      if (status === 'authenticated') {
        const result = await addHolding(newStock);
        if (!result.success) {
          console.error("Failed to add holding:", result.message);
          // Revert on failure if needed, or just let it sync on next fetch
        }
      }
    }
  };

  const handleRemoveStock = async (stockCode: string) => {
    // Optimistic update
    setSelectedStocks((prev) => prev.filter((s) => s.code !== stockCode));

    if (status === 'authenticated') {
      const result = await removeHolding(stockCode);
      if (!result.success) {
        console.error("Failed to remove holding:", result.message);
      }
    }
  };

  const handleReset = () => {
    setSelectedStocks([]);
    const storageKey = marketType === 'US' ? 'selectedStocks_US' : 'selectedStocks_KR';
    localStorage.removeItem(storageKey);
    setStocksData(new Map());
  };

  const switchMarket = (newType: 'KR' | 'US') => {
    if (newType === marketType) return;

    // Load stocks for the new market
    const storageKey = newType === 'US' ? 'selectedStocks_US' : 'selectedStocks_KR';
    const savedStocks = localStorage.getItem(storageKey);

    let nextStocks: SelectedStock[] = [];
    if (savedStocks) {
      try {
        nextStocks = JSON.parse(savedStocks);
      } catch (e) {
        console.error(`Failed to parse ${storageKey}`, e);
      }
    } else {
      if (newType === 'KR') {
        nextStocks = [{ code: '005930', name: '삼성전자' }];
      }
    }

    // Update both states together to avoid race conditions in effects
    setMarketType(newType);
    setSelectedStocks(nextStocks);
    setStocksData(new Map()); // Clear data for new market

    // If switching to US and timeRange is 1year, reset to 1month
    if (newType === 'US' && timeRange === '1year') {
      setTimeRange('1month');
    }
  };

  // Helper to process data: Group by date and average if duplicates exist
  const processStockData = (data: KoreanStockPriceInfo[]) => {
    if (!data || data.length === 0) return [];

    // Group by date
    const dateGroups = new Map<string, KoreanStockPriceInfo[]>();
    data.forEach((item) => {
      if (!dateGroups.has(item.basDt)) {
        dateGroups.set(item.basDt, []);
      }
      dateGroups.get(item.basDt)!.push(item);
    });

    // Calculate average for each date
    const processedData: any[] = [];
    dateGroups.forEach((items, date) => {
      const count = items.length;
      if (count === 1) {
        processedData.push({
          clpr: items[0].clpr,
          vs: items[0].vs,
          fltRt: items[0].fltRt,
          trqu: items[0].trqu,
          basDt: date,
        });
      } else {
        // Average duplicates
        const totalClpr = items.reduce(
          (sum, item) => sum + parseInt(item.clpr),
          0
        );
        const totalVs = items.reduce((sum, item) => sum + parseInt(item.vs), 0);
        const totalFltRt = items.reduce(
          (sum, item) => sum + parseFloat(item.fltRt),
          0
        );
        const totalTrqu = items.reduce(
          (sum, item) => sum + parseInt(item.trqu),
          0
        );

        processedData.push({
          clpr: Math.round(totalClpr / count).toString(),
          vs: Math.round(totalVs / count).toString(),
          fltRt: (totalFltRt / count).toFixed(2),
          trqu: Math.round(totalTrqu / count).toString(),
          basDt: date,
        });
      }
    });

    // Sort by date descending
    return processedData.sort((a, b) => b.basDt.localeCompare(a.basDt));
  };

  const getChartData = () => {
    const dateMap = new Map<string, any>();

    selectedStocks.forEach((stock) => {
      const data = stocksData.get(stock.code);
      if (data) {
        const processed = processStockData(data);
        processed.forEach((item) => {
          if (!dateMap.has(item.basDt)) {
            dateMap.set(item.basDt, { date: item.basDt });
          }
          dateMap.get(item.basDt)[stock.name] = parseFloat(item.clpr);
        });
      }
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  };

  const getTableData = () => {
    const tableData: any[] = [];

    // Filter stocks based on tableFilterStock
    const stocksToShow =
      tableFilterStock === 'all'
        ? selectedStocks
        : selectedStocks.filter((s) => s.code === tableFilterStock);

    stocksToShow.forEach((stock) => {
      const data = stocksData.get(stock.code);
      if (data && data.length > 0) {
        const processed = processStockData(data);
        processed.forEach((item) => {
          tableData.push({
            code: stock.code,
            name: stock.name,
            price: parseInt(item.clpr).toLocaleString(),
            change: item.vs,
            changeRate: parseFloat(item.fltRt).toFixed(2),
            volume: parseInt(item.trqu).toLocaleString(),
            date: item.basDt,
          });
        });
      }
    });
    // Sort by date descending (newest first)
    return tableData.sort((a, b) => b.date.localeCompare(a.date));
  };

  const getStockPerformanceStats = () => {
    const allData = getTableData();
    if (allData.length === 0) return null;

    // Find top gainer and biggest loser
    let topGainer = allData[0];
    let biggestLoser = allData[0];

    allData.forEach((row) => {
      const rate = parseFloat(row.changeRate);
      if (rate > parseFloat(topGainer.changeRate)) {
        topGainer = row;
      }
      if (rate < parseFloat(biggestLoser.changeRate)) {
        biggestLoser = row;
      }
    });

    return { topGainer, biggestLoser };
  };

  // Pagination is still needed if we have many stocks selected,
  // even if each stock only has 1 row.
  const getPaginatedTableData = () => {
    const allData = getTableData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const allData = getTableData();
    return Math.ceil(allData.length / itemsPerPage);
  };

  if (!isLoaded) return null; // or loading spinner

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-132px)] gap-6">
        <header className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:truncate sm:text-3xl sm:tracking-tight">
                실시간 주식 표/차트
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Market Type Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                <button
                  onClick={() => switchMarket('KR')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${marketType === 'KR'
                    ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                >
                  한국
                </button>
                <button
                  onClick={() => switchMarket('US')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${marketType === 'US'
                    ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                >
                  미국
                </button>
              </div>
              {/* Time Range Selector */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setTimeRange('1week')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === '1week'
                    ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                >
                  1주
                </button>
                <button
                  onClick={() => setTimeRange('1month')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === '1month'
                    ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                >
                  1개월
                </button>
                {marketType !== 'US' && (
                  <button
                    onClick={() => setTimeRange('1year')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === '1year'
                      ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                  >
                    1년
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'chart'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                차트
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'table'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                표
              </button>

              <CompanySelector
                onSelect={handleAddStock}
                selectedCodes={selectedStocks.map((s) => s.code)}
                marketType={marketType}
              />

              {selectedStocks.length > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600"
                >
                  초기화
                </button>
              )}


            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0">
          {loading && stocksData.size === 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center text-gray-500 dark:text-gray-400">
              데이터를 불러오는 중...
            </div>
          )}

          {!loading && viewMode === 'chart' && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow h-full flex flex-col">
              {selectedStocks.length > 0 ? (
                <StockChart
                  data={getChartData()}
                  stockNames={selectedStocks.map((s) => s.name)}
                  marketType={marketType}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                  종목을 선택해주세요
                </div>
              )}
            </div>
          )}

          {!loading && viewMode === 'table' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden h-full flex flex-col">
              {/* Company Filter */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      종목 선택:
                    </label>
                    <select
                      value={tableFilterStock}
                      onChange={(e) => {
                        setTableFilterStock(e.target.value);
                        setCurrentPage(1); // Reset to first page when filter changes
                      }}
                      className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">전체 종목</option>
                      {selectedStocks.map((stock) => (
                        <option key={stock.code} value={stock.code}>
                          {stock.name} ({stock.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected stocks with delete buttons */}
                  {selectedStocks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedStocks.map((stock) => (
                        <div
                          key={stock.code}
                          className="flex items-center gap-2 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-full"
                        >
                          <span className="text-sm font-medium text-teal-900 dark:text-teal-100">
                            {stock.name} ({stock.code})
                          </span>
                          <button
                            onClick={() => handleRemoveStock(stock.code)}
                            className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200 font-bold"
                            title="종목 삭제"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 relative">
                <StockDataTable
                  data={getPaginatedTableData()}
                  marketType={marketType}
                />
              </div>

              {/* Pagination Controls */}
              {getTotalPages() > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 flex-shrink-0">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(getTotalPages(), prev + 1)
                        )
                      }
                      disabled={currentPage === getTotalPages()}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        전체{' '}
                        <span className="font-medium">
                          {getTableData().length}
                        </span>
                        개 중{' '}
                        <span className="font-medium">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{' '}
                        -{' '}
                        <span className="font-medium">
                          {Math.min(
                            currentPage * itemsPerPage,
                            getTableData().length
                          )}
                        </span>
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">이전</span>
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        {Array.from(
                          { length: getTotalPages() },
                          (_, i) => i + 1
                        )
                          .filter((page) => {
                            // Show first page, last page, current page, and pages around current
                            return (
                              page === 1 ||
                              page === getTotalPages() ||
                              Math.abs(page - currentPage) <= 1
                            );
                          })
                          .map((page, index, array) => (
                            <React.Fragment key={page}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                                  ? 'z-10 bg-teal-50 dark:bg-teal-900 border-teal-500 text-teal-600 dark:text-teal-400'
                                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                  }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          ))}
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(getTotalPages(), prev + 1)
                            )
                          }
                          disabled={currentPage === getTotalPages()}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">다음</span>
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Login Modal */}
      {
        showLoginModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">로그인이 필요합니다</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                무료 사용 횟수(10회)를 모두 사용하셨습니다.<br />
                계속 사용하시려면 구글 로그인을 해주세요.
              </p>
              <button
                onClick={() => signIn("google")}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition-colors"
              >
                Google로 로그인
              </button>
            </div>
          </div>
        )
      }
    </DashboardLayout >
  );
}
