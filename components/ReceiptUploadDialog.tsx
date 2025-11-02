import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, X, Loader2, Check } from 'lucide-react';

interface ExpenseItem {
  name: string;
  price?: number;
  quantity?: number;
}

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: {
    date: Date;
    storeName: string;
    amount: number;
    category: string;
    items: (string | ExpenseItem)[];
  }) => void;
}

export function ReceiptUploadDialog({ open, onOpenChange, onUpload }: ReceiptUploadDialogProps) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analyzedData, setAnalyzedData] = useState<{
    storeName: string;
    amount: number;
    category: string;
    items: (string | ExpenseItem)[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image_file', image);
      formData.append('user_id', 'anonymous');

      const response = await fetch('/api/analyze_receipt', {
        method: 'POST',
        body: formData,
      });

      // 응답 본문을 먼저 텍스트로 읽기
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('서버 오류 응답:', responseText);
        // JSON 형식인지 확인
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`서버 오류 (${response.status}): ${errorData.message || errorData.detail || JSON.stringify(errorData)}`);
        } catch {
          throw new Error(`서버 오류 (${response.status}): ${responseText || '알 수 없는 오류'}`);
        }
      }

      // JSON 파싱
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        console.error('응답 텍스트:', responseText);
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
      }
      
      // 디버깅: 응답 데이터 로그
      console.log('API 응답 데이터 (전체):', data);
      console.log('API 응답 데이터 타입:', typeof data);
      console.log('amount 값:', data.amount, '타입:', typeof data.amount);
      console.log('items 값:', data.items, '타입:', typeof data.items);
      
      // amount 처리: 문자열이거나 다른 형식일 수 있음
      let parsedAmount = 0;
      if (typeof data.amount === 'number') {
        parsedAmount = data.amount;
      } else if (typeof data.amount === 'string') {
        // 문자열에서 숫자만 추출 (예: "10,400원" -> 10400)
        const cleaned = data.amount.replace(/[^0-9]/g, '');
        parsedAmount = parseInt(cleaned, 10) || 0;
      } else if (data.amount) {
        parsedAmount = Number(data.amount) || 0;
      }
      
      // items 처리: 여러 형식 지원 (객체 배열 유지)
      let itemsArray: (string | ExpenseItem)[] = [];
      if (Array.isArray(data.items)) {
        // 배열인 경우
        itemsArray = data.items.map(item => {
          // 각 요소가 객체인 경우 객체 그대로 유지
          if (typeof item === 'object' && item !== null) {
            return {
              name: item.name || item.item || item.product || item.title || item.품목 || item.상품명 || '품목',
              price: item.price || item.가격 || (typeof item.price === 'string' ? parseInt(item.price.replace(/[^0-9]/g, ''), 10) : undefined),
              quantity: item.quantity || item.수량 || item.qty || undefined
            };
          }
          // 문자열이나 숫자인 경우 문자열로 유지
          return String(item);
        }).filter(item => {
          // name이 없는 빈 객체는 제거
          if (typeof item === 'object' && !item.name) return false;
          return Boolean(item);
        });
      } else if (typeof data.items === 'string') {
        // 문자열인 경우 쉼표로 분리
        itemsArray = data.items.split(',').map((item: string) => item.trim()).filter(Boolean);
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        // 단일 객체인 경우
        try {
          const values = Object.values(data.items);
          itemsArray = values.map(val => {
            if (typeof val === 'object' && val !== null) {
              return {
                name: val.name || val.item || '품목',
                price: val.price || undefined,
                quantity: val.quantity || undefined
              };
            }
            return String(val);
          }).filter(Boolean);
        } catch {
          itemsArray = [JSON.stringify(data.items)];
        }
      } else if (data.items) {
        // 기타 경우 문자열로 변환
        itemsArray = [String(data.items)];
      }
      
      const analyzedData = {
        storeName: data.store_name || data.storeName || '알 수 없음',
        amount: parsedAmount,
        category: data.category || '기타',
        items: itemsArray
      };
      
      console.log('변환된 데이터:', analyzedData);
      setAnalyzedData(analyzedData);
    } catch (err) {
      console.error('분석 오류 상세:', err);
      console.error('오류 스택:', err instanceof Error ? err.stack : '');
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요. (http://127.0.0.1:8000)');
      } else if (err instanceof SyntaxError || (err instanceof Error && err.message.includes('파싱'))) {
        setError('서버 응답을 파싱할 수 없습니다. 브라우저 콘솔(F12)을 확인해주세요.');
      } else {
        const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
        setError(errorMessage + '\n(브라우저 콘솔(F12)에서 상세 정보 확인 가능)');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!analyzedData) return;

    const data = {
      date: new Date(),
      storeName: analyzedData.storeName,
      amount: analyzedData.amount,
      category: analyzedData.category,
      items: analyzedData.items
    };

    onUpload(data);
    
    // 초기화
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setAnalyzedData(null);
    setIsAnalyzing(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>영수증 업로드</DialogTitle>
          <DialogDescription>영수증 이미지를 업로드하면 자동으로 분석합니다</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* 이미지 업로드 영역 */}
          {!preview && (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <Button 
                type="button"
                variant="outline"
                className="mb-2"
                onClick={() => {
                  const input = document.getElementById('receipt-upload');
                  if (input) {
                    input.click();
                  }
                }}
              >
                영수증 이미지 선택
              </Button>
              <p className="text-sm text-gray-500 mt-2">JPG, PNG 형식의 이미지를 업로드하세요</p>
            </div>
          )}

          {/* 이미지 미리보기 */}
          {preview && !isAnalyzing && !analyzedData && (
            <div className="space-y-4">
              <div className="relative border rounded-lg p-4">
                <img src={preview} alt="Receipt preview" className="max-h-64 mx-auto rounded" />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Button 
                onClick={analyzeImage}
                className="w-full bg-black text-white hover:bg-black/90"
              >
                분석 시작
              </Button>
            </div>
          )}

          {/* 분석 중 */}
          {isAnalyzing && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">영수증을 분석하고 있습니다...</p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">오류 발생</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <Button 
                onClick={handleReset}
                variant="outline"
                className="mt-3"
              >
                다시 시도
              </Button>
            </div>
          )}

          {/* 분석 결과 */}
          {analyzedData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-semibold">분석 완료</span>
              </div>
              
              <div className="border rounded-lg p-6 space-y-4">
                <div>
                  <span className="text-sm text-gray-500">상호명</span>
                  <div className="text-lg font-semibold block mt-1">{analyzedData.storeName}</div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">금액</span>
                  <div className="text-2xl font-bold text-red-600 mt-1">
                    {analyzedData.amount.toLocaleString()}원
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">카테고리</span>
                  <div className="text-lg font-medium mt-1">{analyzedData.category}</div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">품목</span>
                  {analyzedData.items && analyzedData.items.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">품목 목록</h4>
                      <ul className="list-none p-0 space-y-2">
                        {analyzedData.items.map((item, index) => {
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
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="flex-1"
                >
                  다시 업로드
                </Button>
                <Button 
                  onClick={handleConfirm}
                  className="flex-1 bg-black text-white hover:bg-black/90"
                >
                  가계부에 저장
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}