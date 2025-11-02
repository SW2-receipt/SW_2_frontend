import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, X, Loader2, Check } from 'lucide-react';

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: {
    date: Date;
    storeName: string;
    amount: number;
    category: string;
    items: string[];
  }) => void;
}

export function ReceiptUploadDialog({ open, onOpenChange, onUpload }: ReceiptUploadDialogProps) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<{
    storeName: string;
    amount: number;
    category: string;
    items: string[];
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
    
    // 이미지 분석 시뮬레이션 (실제로는 OCR API를 사용)
    setTimeout(() => {
      // 임시 분석 결과 (실제로는 OCR API 결과)
      const mockData = {
        storeName: 'GS25',
        amount: 8500,
        category: '식료품',
        items: ['삼각김밥', '바나나우유']
      };
      
      setAnalyzedData(mockData);
      setIsAnalyzing(false);
    }, 1500);
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
              <label htmlFor="receipt-upload" className="cursor-pointer">
                <Button 
                  variant="outline"
                  className="mb-2"
                >
                  영수증 이미지 선택
                </Button>
              </label>
              <p className="text-sm text-gray-500">JPG, PNG 형식의 이미지를 업로드하세요</p>
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
                  <div className="text-base mt-1">{analyzedData.items.join(', ')}</div>
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