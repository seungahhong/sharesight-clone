import { searchKoreanStocks } from './src/lib/api/korea-stock-api';

async function test() {
  console.log('Testing searchKoreanStocks for "삼성전자"...');
  
  // Test 1: Default (Today)
  console.log('--- Test 1: Default (Today) ---');
  const res1 = await searchKoreanStocks('삼성전자');
  console.log('Result count:', res1.length);
  if (res1.length > 0) console.log('First result:', res1[0].basDt);

  // Test 2: Hardcoded recent weekday (e.g. 20241128 - Thursday)
  // We need to modify the function or mock the Date to test this easily without changing code.
  // But for now let's just see if Test 1 fails.
  // If Test 1 fails (returns 0), it confirms the issue is likely the date (since today is Sat/Sun or holiday).
}

test();
