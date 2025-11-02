import { useState } from 'react';
import { Calendar } from './components/ui/calendar';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select } from './components/ui/select';
import { ReceiptUploadDialog } from './components/ReceiptUploadDialog';
import { MonthlyChart } from './components/MonthlyChart';
import { Receipt, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ExpenseItem {
  name: string;
  price?: number;
  quantity?: number;
}

interface Expense {
  id: string;
  date: Date;
  storeName: string;
  amount: number;
  category: string;
  items: (string | ExpenseItem)[];
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      date: new Date(2025, 9, 28),
      storeName: 'GS25',
      amount: 8500,
      category: '식료품',
      items: ['삼각김밥', '바나나우유']
    }
  ]);
  
  // 지출 입력 폼 상태
  const [newExpense, setNewExpense] = useState({
    date: new Date(),
    storeName: '',
    amount: 0,
    category: '',
    memo: ''
  });

  const getMonthlyTotal = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getDayExpenses = (date: Date) => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getDate() === date.getDate() &&
        expenseDate.getMonth() === date.getMonth() &&
        expenseDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getDayTotal = (date: Date) => {
    const dayExpenses = getDayExpenses(date);
    return dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const selectedDateExpenses = getDayExpenses(selectedDate);
  const selectedDateTotal = getDayTotal(selectedDate);

  const handleAddExpense = () => {
    if (!newExpense.storeName || !newExpense.amount || !newExpense.category) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (editingExpense) {
      handleUpdateExpense();
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      date: newExpense.date,
      storeName: newExpense.storeName,
      amount: newExpense.amount,
      category: newExpense.category,
      items: newExpense.memo ? newExpense.memo.split(',').map(item => item.trim()) : []
    };

    setExpenses([...expenses, expense]);
    setIsDialogOpen(false);
    
    // 폼 초기화
    setNewExpense({
      date: selectedDate,
      storeName: '',
      amount: 0,
      category: '',
      memo: ''
    });
  };

  const handleReceiptUpload = (data: {
    date: Date;
    storeName: string;
    amount: number;
    category: string;
    items: (string | ExpenseItem)[];
  }) => {
    const expense: Expense = {
      id: Date.now().toString(),
      ...data
    };
    
    setExpenses([...expenses, expense]);
    setSelectedDate(data.date);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      date: expense.date,
      storeName: expense.storeName,
      amount: expense.amount,
      category: expense.category,
      memo: expense.items.map(item => typeof item === 'string' ? item : item.name).join(', ')
    });
    setIsDialogOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setExpenses(expenses.filter(exp => exp.id !== expenseId));
    }
  };

  const handleUpdateExpense = () => {
    if (!editingExpense || !newExpense.storeName || !newExpense.amount || !newExpense.category) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    const updatedExpense: Expense = {
      id: editingExpense.id,
      date: newExpense.date,
      storeName: newExpense.storeName,
      amount: newExpense.amount,
      category: newExpense.category,
      items: newExpense.memo ? newExpense.memo.split(',').map(item => item.trim()) : []
    };

    setExpenses(expenses.map(exp => exp.id === editingExpense.id ? updatedExpense : exp));
    setIsDialogOpen(false);
    setEditingExpense(null);
    
    // 폼 초기화
    setNewExpense({
      date: selectedDate,
      storeName: '',
      amount: 0,
      category: '',
      memo: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">가계부</h1>
            <p className="text-gray-600 text-lg">
              이번 달 총 지출: <span className="text-red-600 font-bold">{getMonthlyTotal().toLocaleString()}원</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12"
              onClick={() => {
                setEditingExpense(null);
                setNewExpense({
                  date: selectedDate,
                  storeName: '',
                  amount: 0,
                  category: '',
                  memo: ''
                });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
            <Button 
              className="gap-2 h-12 px-4 bg-black text-white hover:bg-black/90"
              onClick={() => setIsReceiptDialogOpen(true)}
            >
              <Receipt className="h-5 w-5" />
              영수증 업로드
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 달력 */}
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                classNames={{
                  months: "flex flex-col gap-4",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  table: "w-full border-collapse",
                  head_row: "flex gap-1 justify-center",
                  head_cell: "text-muted-foreground rounded-md w-10 font-normal text-sm text-center",
                  row: "flex w-full mt-2 gap-1 justify-center",
                  cell: "text-center text-sm relative p-0 h-12 w-10 justify-center",
                  day: "h-12 w-10 p-0 font-normal hover:bg-accent hover:rounded-md flex flex-col items-center justify-center",
                  day_selected: "bg-black text-white hover:bg-black rounded-md",
                  day_today: "bg-accent text-accent-foreground rounded-md",
                  day_outside: "text-muted-foreground opacity-50",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dayTotal = getDayTotal(date);
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    
                    return (
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <span className="text-sm">{date.getDate()}</span>
                        {dayTotal > 0 && (
                          <span className={`text-[9px] ${isSelected ? 'text-white' : 'text-red-600'}`}>
                            {dayTotal.toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* 오른쪽: 지출 내역 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {format(selectedDate, 'yyyy년 M월 d일')} 지출 내역
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateExpenses.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                  이날 기록된 지출이 없습니다.
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-right text-lg font-semibold text-blue-600">
                      {selectedDateTotal.toLocaleString()}원
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedDateExpenses.map(expense => (
                      <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{expense.storeName}</h3>
                            <Badge variant="secondary" className="mb-2">
                              {expense.category}
                            </Badge>
                            {expense.items.length > 0 && (
                              <div className="mt-2">
                                <h4 className="text-sm font-medium mb-2">품목 목록</h4>
                                <ul className="list-none p-0 space-y-2">
                                  {expense.items.map((item, index) => {
                                    if (typeof item === 'string') {
                                      return (
                                        <li key={index} className="text-sm text-gray-600">
                                          {item}
                                        </li>
                                      );
                                    } else {
                                      return (
                                        <li key={index} className="text-sm">
                                          <strong>{item.name}</strong>
                                          {item.price && <span className="text-gray-600"> {item.price.toLocaleString()}원</span>}
                                          {item.quantity && <span className="text-gray-500"> (수량: {item.quantity})</span>}
                                        </li>
                                      );
                                    }
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-lg font-bold text-red-600">
                              -{expense.amount.toLocaleString()}원
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditExpense(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 지출 입력 다이얼로그 */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingExpense(null);
            setNewExpense({
              date: selectedDate,
              storeName: '',
              amount: 0,
              category: '',
              memo: ''
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingExpense ? '지출 수정' : '지출 입력'}</DialogTitle>
          <DialogDescription>{editingExpense ? '지출 내역을 수정하세요' : '지출 내역을 직접 입력하세요'}</DialogDescription>
        </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={format(newExpense.date, 'yyyy-MM-dd')}
                onChange={(e) => setNewExpense({ ...newExpense, date: new Date(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeName">상호명</Label>
              <Input
                id="storeName"
                placeholder="예: 스타벅스"
                value={newExpense.storeName}
                onChange={(e) => setNewExpense({ ...newExpense, storeName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">금액</Label>
              <Input
                id="amount"
                type="number"
                value={newExpense.amount || ''}
                onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select
                id="category"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              >
                <option value="">카테고리 선택</option>
                <option value="식료품">식료품</option>
                <option value="카페">카페</option>
                <option value="식당">식당</option>
                <option value="교통">교통</option>
                <option value="생활용품">생활용품</option>
                <option value="의류">의류</option>
                <option value="기타">기타</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">메모 (선택)</Label>
              <Input
                id="memo"
                placeholder="메모를 입력하세요"
                value={newExpense.memo}
                onChange={(e) => setNewExpense({ ...newExpense, memo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              취소
            </Button>
            <Button 
              className="bg-black text-white hover:bg-black/90"
              onClick={handleAddExpense}
            >
              {editingExpense ? '수정' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 영수증 업로드 다이얼로그 */}
      <ReceiptUploadDialog 
        open={isReceiptDialogOpen}
        onOpenChange={setIsReceiptDialogOpen}
        onUpload={handleReceiptUpload}
      />

      {/* 월별 지출 차트 */}
      <div className="mt-6">
        <MonthlyChart expenses={expenses} />
      </div>
    </div>
  );
}
