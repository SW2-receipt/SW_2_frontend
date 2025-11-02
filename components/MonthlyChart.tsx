import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Expense {
  date: Date;
  amount: number;
}

interface MonthlyChartProps {
  expenses: Expense[];
}

export function MonthlyChart({ expenses }: MonthlyChartProps) {
  // 최근 12개월의 월별 지출 계산
  const getMonthlyData = () => {
    const today = new Date();
    const monthlyTotals: { [key: string]: number } = {};
    
    // 최근 12개월 생성
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      months.push({
        key: monthKey,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`
      });
    }
    
    // 월별 지출 계산
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth() + 1}`;
      if (monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] += expense.amount;
      } else {
        monthlyTotals[monthKey] = expense.amount;
      }
    });
    
    return months.map(month => ({
      ...month,
      amount: monthlyTotals[month.key] || 0
    }));
  };

  const monthlyData = getMonthlyData();
  const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 지출 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-64">
          {monthlyData.map((data, index) => {
            const heightPercent = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                {data.amount > 0 ? (
                  <div className="relative w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(heightPercent, 10)}%`, minHeight: '30px' }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap font-semibold">
                      {data.amount.toLocaleString()}원
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full bg-gray-100 rounded-t" style={{ height: '20px' }}>
                  </div>
                )}
                <span className="text-xs text-gray-600">{data.month}월</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          총 지출: {monthlyData.reduce((sum, data) => sum + data.amount, 0).toLocaleString()}원
        </div>
      </CardContent>
    </Card>
  );
}
