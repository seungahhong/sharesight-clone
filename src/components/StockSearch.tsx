'use client';

import { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { searchStocksAction } from '@/app/actions';
import { KoreanStockPriceInfo } from '@/lib/api/korea-stock-api';

export default function StockSearch({
  onSelect,
}: {
  onSelect: (stock: KoreanStockPriceInfo) => void;
}) {
  const [selected, setSelected] = useState<KoreanStockPriceInfo | null>(null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<KoreanStockPriceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length > 0) {
      setLoading(true);
      try {
        const results = await searchStocksAction(value);
        setOptions(results);
      } catch (error) {
        console.error('Search error:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    } else {
      setOptions([]);
    }
  };

  return (
    <div className="w-72">
      <Combobox
        value={selected}
        onChange={(value) => {
          setSelected(value);
          if (value) onSelect(value);
        }}
      >
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
              displayValue={(stock: KoreanStockPriceInfo) =>
                stock ? `${stock.itmsNm} (${stock.srtnCd})` : ''
              }
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="주식 검색... (예: 삼성전자)"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
              {loading ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  검색 중...
                </div>
              ) : options.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  검색 결과가 없습니다.
                </div>
              ) : (
                options.map((stock) => (
                  <Combobox.Option
                    key={stock.srtnCd}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-teal-600 text-white' : 'text-gray-900'
                      }`
                    }
                    value={stock}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {stock.itmsNm} ({stock.srtnCd})
                        </span>
                        <span
                          className={`block text-xs ${
                            active ? 'text-teal-100' : 'text-gray-500'
                          }`}
                        >
                          {parseInt(stock.clpr).toLocaleString()}원 (
                          {stock.fltRt}%)
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-teal-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
