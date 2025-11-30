import { getKoreanStockRecentHistory } from './src/lib/api/korea-stock-api';

async function test() {
  console.log('Testing API with likeSrtnCd...');
  const API_KEY = process.env.KOREA_STOCK_API_KEY;
  const BASE_URL = 'http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService';
  const stockCode = '005930';
  const startDate = '20251123';
  const endDate = '20251130';

  // Try likeSrtnCd instead of srtnCd
  const url = `${BASE_URL}/getStockPriceInfo?serviceKey=${API_KEY}&resultType=json&numOfRows=1000&likeSrtnCd=${stockCode}&beginBasDt=${startDate}&endBasDt=${endDate}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.response.body.items?.item;
    const results = Array.isArray(items) ? items : [items];

    console.log('Results count:', results.length);
    results.slice(0, 10).forEach((item: any) => {
      console.log(`Date: ${item.basDt}, Code: ${item.srtnCd}, Name: ${item.itmsNm}, Price: ${item.clpr}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
