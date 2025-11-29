import { searchKoreanStocks } from './src/lib/api/korea-stock-api';

async function test() {
  console.log('Testing searchKoreanStocks with empty string...');
  const results = await searchKoreanStocks('');
  console.log('Results length:', results.length);
  if (results.length > 0) {
    console.log('First item:', results[0]);
  }
}

test();
