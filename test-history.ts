import { getKoreanStockRecentHistory } from './src/lib/api/korea-stock-api';

async function test() {
  console.log('Testing getKoreanStockRecentHistory for 365 days...');
  const results = await getKoreanStockRecentHistory('005930', 365);
  console.log('Results length:', results.length);
  if (results.length > 0) {
    console.log('First result date:', results[0].basDt);
    console.log('Last result date:', results[results.length - 1].basDt);
  }
}

test();
