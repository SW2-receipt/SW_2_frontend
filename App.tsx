import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions, Platform, Image, Linking } from 'react-native';
import Constants from 'expo-constants';

interface ExpenseItem {
  name: string;
  price?: number;
  quantity?: number;
}

interface Expense {
  id: string;
  date: string;
  storeName: string;
  amount: number;
  category: string;
  items: (string | ExpenseItem)[];
}

const STORAGE_KEY = '@expenses';
const LOGIN_STORAGE_KEY = '@isLoggedIn';

interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  provider: string;
  createdAt: string;
}

export default function App() {
  // 로그인 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<{
    storeName: string;
    amount: number;
    category: string;
    items: (string | ExpenseItem)[];
  } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    storeName: '',
    amount: '',
    category: '식료품',
    memo: ''
  });

  const categories = ['식료품', '카페', '식당', '교통', '생활용품', '의류', '기타'];

  // 백엔드에서 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/users/me', {
        method: 'GET',
        credentials: 'include', // 쿠키 포함 (세션 인증)
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUserInfo(userData);
        setIsLoggedIn(true);
        return true;
      } else {
        // 로그인 안 된 상태
        setUserInfo(null);
        setIsLoggedIn(false);
        return false;
      }
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      setUserInfo(null);
      setIsLoggedIn(false);
      return false;
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 엔드포인트 호출 (필요시)
      // await fetch('http://localhost:8080/logout', { method: 'POST', credentials: 'include' });
      
      setUserInfo(null);
      setIsLoggedIn(false);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // 로그인 페이지로 리다이렉트
        window.location.href = window.location.origin;
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  useEffect(() => {
    // 앱 시작 시 로그인 상태 확인
    loadExpenses();
    
    // 웹 환경에서 URL 파라미터 확인 (카카오 로그인 성공 후 리다이렉트)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const loginStatus = urlParams.get('login');
      
      if (loginStatus === 'success') {
        // 로그인 성공 - 백엔드에서 사용자 정보 가져오기
        fetchUserInfo();
        // URL에서 파라미터 제거 (깔끔한 URL 유지)
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        // URL 파라미터가 없으면 백엔드에서 로그인 상태 확인
        fetchUserInfo();
      }
    } else {
      // 모바일 환경에서는 기본적으로 로그인 안 된 상태
      setIsLoggedIn(false);
    }
  }, []);

  // 임시로 홈 화면 이동
  const handleTemporaryLogin = () => {
    setIsLoggedIn(true);
  };

  // 카카오 로그인
  const handleKakaoLogin = async () => {
    // 백엔드 OAuth2 엔드포인트로 리다이렉트
    const backendUrl = 'http://localhost:8080/oauth2/authorization/kakao';
    
    console.log('카카오 로그인 시작 - 리다이렉트 URL:', backendUrl);
    
    // 먼저 백엔드가 실행 중인지 확인
    try {
      const healthCheck = await fetch('http://localhost:8080/health', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!healthCheck.ok) {
        Alert.alert('오류', '백엔드 서버에 연결할 수 없습니다.\n백엔드가 실행 중인지 확인해주세요.');
        console.error('백엔드 health check 실패:', healthCheck.status);
        return;
      }
      
      console.log('백엔드 서버 연결 확인됨');
    } catch (error) {
      console.error('백엔드 서버 연결 실패:', error);
      Alert.alert('오류', '백엔드 서버에 연결할 수 없습니다.\n\n백엔드가 실행 중인지 확인해주세요.\n(포트 8080)');
      return;
    }
    
    if (Platform.OS === 'web') {
      // 웹 환경에서는 window.location 사용
      if (typeof window !== 'undefined') {
        console.log('리다이렉트 시작:', backendUrl);
        try {
          window.location.href = backendUrl;
        } catch (error) {
          console.error('리다이렉트 실패:', error);
          Alert.alert('오류', '리다이렉트 중 오류가 발생했습니다.');
        }
      }
    } else {
      // 모바일 환경에서는 Linking 사용
      Linking.openURL(backendUrl).catch(err => {
        console.error('카카오 로그인 리다이렉트 실패:', err);
        Alert.alert('오류', '카카오 로그인 페이지를 열 수 없습니다.');
      });
    }
  };

  // 아이디/비밀번호 로그인 (임시 구현)
  const handleIdPasswordLogin = () => {
    if (!loginForm.username || !loginForm.password) {
      Alert.alert('알림', '아이디와 비밀번호를 입력해주세요.');
      return;
    }
    // 실제 구현 시 서버 인증 필요
    Alert.alert('알림', '로그인 기능은 준비 중입니다.\n임시로 홈 화면 이동 버튼을 사용해주세요.');
  };

  const loadExpenses = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setExpenses(JSON.parse(data));
      } else {
        // 초기 데이터
        const initialData: Expense[] = [{
          id: '1',
          date: format(new Date(), 'yyyy-MM-dd'),
          storeName: 'GS25',
          amount: 8500,
          category: '식료품',
          items: ['삼각김밥', '바나나우유']
        }];
        setExpenses(initialData);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    }
  };

  const saveExpenses = async (newExpenses: Expense[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newExpenses));
      setExpenses(newExpenses);
    } catch (error) {
      console.error('데이터 저장 오류:', error);
    }
  };

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

  const getDayExpenses = (date: string) => {
    return expenses.filter(expense => expense.date === date);
  };

  const getDayTotal = (date: string) => {
    const dayExpenses = getDayExpenses(date);
    return dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getMarkedDates = () => {
    const marked: any = {};
    const today = format(new Date(), 'yyyy-MM-dd');
    
    expenses.forEach(expense => {
      if (!marked[expense.date]) {
        marked[expense.date] = {
          marked: true,
          dotColor: '#ef4444',
        };
      }
    });
    
    // 선택된 날짜 검은색 배경으로 표시
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#000000'
    };
    
    return marked;
  };

  const handleSaveExpense = () => {
    if (!formData.storeName || !formData.amount || !formData.category) {
      Alert.alert('알림', '모든 필드를 입력해주세요.');
      return;
    }

    const expense: Expense = {
      id: editingExpense ? editingExpense.id : Date.now().toString(),
      date: formData.date,
      storeName: formData.storeName,
      amount: Number(formData.amount),
      category: formData.category,
      items: formData.memo ? formData.memo.split(',').map(item => item.trim()).filter(Boolean) : []
    };

    const newExpenses = editingExpense
      ? expenses.map(exp => exp.id === editingExpense.id ? expense : exp)
      : [...expenses, expense];

    saveExpenses(newExpenses);
    setIsAddModalVisible(false);
    setEditingExpense(null);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      storeName: '',
      amount: '',
      category: '식료품',
      memo: ''
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    const deleteExpense = async () => {
      try {
        const newExpenses = expenses.filter(exp => exp.id !== expenseId);
        await saveExpenses(newExpenses);
      } catch (error) {
        console.error('삭제 오류:', error);
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            window.alert('삭제 중 오류가 발생했습니다.');
          }
        } else {
          Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
        }
      }
    };

    if (Platform.OS === 'web') {
      // 웹 환경에서는 confirm 사용
      if (typeof window !== 'undefined' && window.confirm('정말 삭제하시겠습니까?')) {
        deleteExpense();
      }
    } else {
      // 모바일 환경에서는 Alert 사용
      Alert.alert(
        '삭제 확인',
        '정말 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: deleteExpense
          }
        ]
      );
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      storeName: expense.storeName,
      amount: expense.amount.toString(),
      category: expense.category,
      memo: expense.items.map(item => typeof item === 'string' ? item : item.name).join(', ')
    });
    setIsAddModalVisible(true);
  };

  const handleReceiptUpload = () => {
    setIsReceiptModalVisible(true);
  };

  const handleImagePicker = async (useCamera: boolean = false) => {
    // 웹에서는 HTML input 사용
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setReceiptImage(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
      return;
    }

    // 모바일에서는 expo-image-picker 사용
    try {
      // 권한 요청
      if (useCamera) {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
          return;
        }
      } else {
        const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaLibraryPermission.granted) {
          Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
          return;
        }
      }

      // 이미지 선택/촬영
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync();
      } else {
        result = await ImagePicker.launchImageLibraryAsync();
      }

      console.log('ImagePicker Result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (imageUri) {
          console.log('이미지 URI:', imageUri);
          setReceiptImage(imageUri);
        } else {
          Alert.alert('오류', '이미지 URI를 가져올 수 없습니다.');
        }
      } else {
        console.log('사용자가 취소했습니다.');
      }
    } catch (error) {
      console.error('ImagePicker 실행 오류:', error);
      Alert.alert('오류', '이미지 선택기를 실행할 수 없습니다.');
    }
  };

  const analyzeImage = async () => {
    if (!receiptImage) return;

    setIsAnalyzing(true);
    setAnalyzedData(null);

    // MCP 서버 주소 설정 (에러 메시지에서 사용하기 위해 함수 상단에서 선언)
    let apiUrl: string;
    if (Platform.OS === 'web') {
      apiUrl = 'http://127.0.0.1:8000/analyze_receipt';
    } else {
      // Expo 개발 서버 URL에서 PC IP 추출
      const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
      if (debuggerHost) {
        // debuggerHost 형식: "192.168.x.x:8081" -> "192.168.x.x" 추출
        const hostIP = debuggerHost.split(':')[0];
        apiUrl = `http://${hostIP}:8000/analyze_receipt`;
      } else {
        // fallback: localhost (개발 시 직접 수정 필요)
        apiUrl = 'http://127.0.0.1:8000/analyze_receipt';
      }
    }

    try {
      // FormData를 사용하여 이미지 업로드
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // 웹: base64를 blob으로 변환
        const response = await fetch(receiptImage);
        const blob = await response.blob();
        formData.append('image_file', blob, 'receipt.jpg');
      } else {
        // 모바일: uri 사용
        // iOS는 file:// 제거, Android는 그대로 사용
        let imageUri = receiptImage;
        if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
          imageUri = imageUri.replace('file://', '');
        }
        console.log('이미지 URI (처리 후):', imageUri);
        formData.append('image_file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'receipt.jpg',
        } as any);
      }
      
      formData.append('user_id', 'anonymous');
      
      console.log('MCP 서버 요청:', apiUrl);
      console.log('플랫폼:', Platform.OS);
      console.log('Debugger Host:', Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost);
      console.log('이미지 URI:', receiptImage?.substring(0, 50) + '...');

      // 타임아웃 설정 (30초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 서버가 응답하지 않습니다.')), 30000);
      });

      // 모바일에서는 mode: 'cors'를 사용하지 않음
      const fetchOptions: any = {
        method: 'POST',
        body: formData,
      };
      
      // 웹에서만 cors 모드 사용
      if (Platform.OS === 'web') {
        fetchOptions.mode = 'cors';
      }
      
      // FormData를 사용할 때는 Content-Type을 명시하지 않아야 브라우저가 자동으로 boundary를 설정함

      const fetchPromise = fetch(apiUrl, fetchOptions);
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      const responseText = await response.text();

      console.log('서버 응답 상태:', response.status);
      console.log('서버 응답 텍스트 (처음 500자):', responseText.substring(0, 500));

      if (!response.ok) {
        console.error('서버 오류 응답:', responseText);
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`서버 오류 (${response.status}): ${errorData.message || errorData.detail || JSON.stringify(errorData)}`);
        } catch {
          throw new Error(`서버 오류 (${response.status}): ${responseText || '알 수 없는 오류'}`);
        }
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        console.error('응답 텍스트 전체:', responseText);
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
      }

      console.log('API 응답 데이터 (전체):', JSON.stringify(data, null, 2));
      console.log('API 응답 데이터 타입:', typeof data);
      console.log('amount 원본 값:', data.amount, '타입:', typeof data.amount);
      console.log('amount 키 존재 여부:', 'amount' in data);
      console.log('모든 키:', Object.keys(data));

      // amount 처리 - 더 강화된 파싱
      let parsedAmount = 0;
      if (data.amount !== undefined && data.amount !== null) {
        if (typeof data.amount === 'number') {
          parsedAmount = data.amount > 0 ? data.amount : 0;
          console.log('amount가 숫자로 파싱됨:', parsedAmount);
        } else if (typeof data.amount === 'string') {
          const cleaned = data.amount.replace(/[^0-9]/g, '');
          parsedAmount = cleaned ? parseInt(cleaned, 10) : 0;
          console.log('amount가 문자열에서 파싱됨:', data.amount, '->', parsedAmount);
        } else {
          // 다른 타입인 경우 Number로 변환 시도
          const numValue = Number(data.amount);
          parsedAmount = isNaN(numValue) ? 0 : (numValue > 0 ? numValue : 0);
          console.log('amount를 Number로 변환:', data.amount, '->', parsedAmount);
        }
      } else {
        console.warn('amount가 undefined이거나 null입니다. data:', data);
        // amount가 없을 경우 total_amount나 다른 필드 확인
        if (data.total_amount !== undefined && data.total_amount !== null) {
          if (typeof data.total_amount === 'number') {
            parsedAmount = data.total_amount > 0 ? data.total_amount : 0;
          } else if (typeof data.total_amount === 'string') {
            const cleaned = data.total_amount.replace(/[^0-9]/g, '');
            parsedAmount = cleaned ? parseInt(cleaned, 10) : 0;
          }
          console.log('total_amount를 사용:', parsedAmount);
        }
      }
      
      console.log('최종 파싱된 amount (파싱 후):', parsedAmount);

      // items 처리
      let itemsArray: (string | ExpenseItem)[] = [];
      
      // 불필요한 항목 필터링 함수
      const isUnnecessaryItem = (itemName: string): boolean => {
        if (!itemName) return true;
        
        const normalizedName = itemName.trim();
        const lowerName = normalizedName.toLowerCase();
        
        // *로 시작하는 항목 (영수증 요약 정보)
        if (normalizedName.startsWith('*')) {
          return true;
        }
        
        // "-"로 시작하는 항목 (옵션, 부가 정보, 예: "- HOT")
        if (normalizedName.startsWith('-')) {
          return true;
        }
        
        // 숫자만 있는 경우 (가격 정보일 가능성)
        if (/^[\d,\s]+$/.test(normalizedName)) {
          return true;
        }
        
        // 단말기 번호, 승인번호 등이 포함된 항목 필터링
        const systemKeywords = [
          '단말기', '번호', '승인번호', '카드번호', '승인일시',
          '매입사', '카드', '승인', '결제정보', '서비스제공사',
          '문의', 'tel', '대표자', '주소', '매장명', '영수증',
          '주문번호', '주문형태', '매출일', '영수증번호'
        ];
        
        for (const keyword of systemKeywords) {
          if (lowerName.includes(keyword.toLowerCase())) {
            return true;
          }
        }
        
        // "번호: 숫자원" 같은 패턴 필터링
        if (/번호\s*[:：]\s*\d+원?/i.test(normalizedName)) {
          return true;
        }
        
        // 필터링할 키워드 목록 (정확한 매칭)
        const filterKeywords = [
          '결제금액', '결 제 금 액', '결제 금액', '결제금액',
          '과세금액', '과세 금액', '과세액',
          '부가세', 'vat', '부가세액', '부가세 금액',
          '합계', '총액', '소계', '총계',
          '공급가액', '공급 가액', '공급가',
          '합계금액', '합계 금액',
          '총합계', '총 합계',
          '소비자부담세액', '소비자 부담 세액'
        ];
        
        // 키워드가 정확히 포함되는지 확인 (너무 광범위한 필터링 방지)
        for (const keyword of filterKeywords) {
          // 정확히 일치하거나, 키워드가 이름의 대부분을 차지하는 경우
          if (lowerName === keyword.toLowerCase() || 
              (lowerName.includes(keyword.toLowerCase()) && keyword.length >= 3)) {
            // 단, 실제 상품명일 가능성 체크 (예: "과세상품" 같은 경우는 제외)
            if (normalizedName.length > keyword.length + 5) {
              // 키워드 외에 추가 텍스트가 많으면 실제 상품명일 수 있음
              continue;
            }
            return true;
          }
        }
        
        // 숫자가 이름의 대부분을 차지하는 경우 (예: "23,636원" 같은 가격 정보)
        const numberPattern = /[\d,]+원?/g;
        const numbers = normalizedName.match(numberPattern);
        if (numbers) {
          const totalNumberLength = numbers.join('').length;
          // 숫자가 전체 이름의 50% 이상을 차지하면 필터링
          if (totalNumberLength >= normalizedName.length * 0.5) {
            return true;
          }
        }
        
        return false;
      };
      
      // price 파싱 헬퍼 함수
      const parsePrice = (priceValue: any): number | undefined => {
        console.log(`    parsePrice 호출: 입력값="${priceValue}", 타입=${typeof priceValue}`);
        
        if (priceValue === undefined || priceValue === null || priceValue === '') {
          console.log(`    parsePrice: undefined/null/빈문자열 -> undefined`);
          return undefined;
        }
        
        if (typeof priceValue === 'number') {
          // 0 이상의 숫자는 모두 반환 (0도 유효한 가격일 수 있음)
          const result = priceValue >= 0 ? priceValue : undefined;
          console.log(`    parsePrice: 숫자 ${priceValue} -> ${result}`);
          return result;
        }
        
        if (typeof priceValue === 'string') {
          const cleaned = priceValue.replace(/[^0-9]/g, '');
          console.log(`    parsePrice: 문자열 "${priceValue}" -> cleaned="${cleaned}"`);
          if (!cleaned) {
            console.log(`    parsePrice: cleaned가 빈 문자열 -> undefined`);
            return undefined;
          }
          const parsed = parseInt(cleaned, 10);
          console.log(`    parsePrice: cleaned="${cleaned}" -> parsed=${parsed}, isNaN=${isNaN(parsed)}, >=0=${parsed >= 0}`);
          const result = !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
          console.log(`    parsePrice: 최종 결과=${result}`);
          return result;
        }
        
        // 다른 타입인 경우 Number로 변환 시도
        const numValue = Number(priceValue);
        const result = !isNaN(numValue) && numValue >= 0 ? numValue : undefined;
        console.log(`    parsePrice: 다른 타입 ${priceValue} -> Number(${numValue}) -> ${result}`);
        return result;
      };
      
      console.log('items 원본 데이터:', JSON.stringify(data.items, null, 2));
      console.log('items 타입:', typeof data.items, 'isArray:', Array.isArray(data.items));
      
      if (Array.isArray(data.items)) {
        itemsArray = data.items.map((item, index) => {
          if (typeof item === 'object' && item !== null) {
            console.log(`Item ${index}:`, JSON.stringify(item, null, 2));
            
            // price 파싱 - 여러 필드 확인 (순서대로 시도)
            let parsedPrice: number | undefined = undefined;
            
            // 가능한 모든 price 필드명 확인
            const priceFields = ['price', '가격', 'amount', '금액', 'cost', '단가'];
            for (const field of priceFields) {
              if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
                parsedPrice = parsePrice(item[field]);
                if (parsedPrice !== undefined) {
                  console.log(`  item.${field} 파싱: ${item[field]} -> ${parsedPrice}`);
                  break;
                }
              }
            }
            
            if (parsedPrice === undefined) {
              console.log(`  price를 찾을 수 없음. item의 모든 키:`, Object.keys(item));
            }
            
            const result = {
              name: item.name || item.item || item.product || item.title || item.품목 || item.상품명 || '품목',
              price: parsedPrice,
              quantity: item.quantity !== undefined && item.quantity !== null 
                ? (typeof item.quantity === 'number' ? item.quantity : parseInt(String(item.quantity), 10) || undefined)
                : (item.수량 !== undefined && item.수량 !== null 
                    ? (typeof item.수량 === 'number' ? item.수량 : parseInt(String(item.수량), 10) || undefined)
                    : (item.qty !== undefined && item.qty !== null 
                        ? (typeof item.qty === 'number' ? item.qty : parseInt(String(item.qty), 10) || undefined)
                        : undefined))
            };
            
            console.log(`  최종 파싱된 item:`, result);
            return result;
          }
          return String(item);
        }).filter(item => {
          if (typeof item === 'object' && !item.name) return false;
          
          // 불필요한 항목 필터링
          const itemName = typeof item === 'object' ? item.name : String(item);
          if (isUnnecessaryItem(itemName)) {
            console.log(`  불필요한 항목 필터링: ${itemName}`);
            return false;
          }
          
          return Boolean(item);
        });
      } else if (typeof data.items === 'string') {
        itemsArray = data.items.split(',').map((item: string) => item.trim()).filter(item => {
          return Boolean(item) && !isUnnecessaryItem(item);
        });
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        try {
          const values = Object.values(data.items);
          itemsArray = values.map(val => {
            if (typeof val === 'object' && val !== null) {
              let parsedPrice: number | undefined = undefined;
              
              // 가능한 모든 price 필드명 확인
              const priceFields = ['price', '가격', 'amount', '금액', 'cost', '단가'];
              for (const field of priceFields) {
                if (val[field] !== undefined && val[field] !== null && val[field] !== '') {
                  parsedPrice = parsePrice(val[field]);
                  if (parsedPrice !== undefined) {
                    break;
                  }
                }
              }
              
              return {
                name: val.name || val.item || '품목',
                price: parsedPrice,
                quantity: val.quantity !== undefined && val.quantity !== null 
                  ? (typeof val.quantity === 'number' ? val.quantity : parseInt(String(val.quantity), 10) || undefined)
                  : undefined
              };
            }
            return String(val);
          }).filter(item => {
            if (!item) return false;
            const itemName = typeof item === 'object' ? item.name : String(item);
            return !isUnnecessaryItem(itemName);
          });
        } catch {
          itemsArray = [JSON.stringify(data.items)];
        }
      } else if (data.items) {
        const itemStr = String(data.items);
        if (!isUnnecessaryItem(itemStr)) {
          itemsArray = [itemStr];
        }
      }
      
      console.log('최종 파싱된 items:', JSON.stringify(itemsArray, null, 2));

      // amount가 0이거나 없을 경우, items의 총합을 계산
      if (parsedAmount === 0 && itemsArray.length > 0) {
        const itemsTotal = itemsArray.reduce((sum, item) => {
          if (typeof item === 'object' && item.price !== undefined && item.price !== null) {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            return sum + itemTotal;
          }
          return sum;
        }, 0);
        
        if (itemsTotal > 0) {
          console.log('amount가 0이므로 items 총합을 사용:', itemsTotal);
          parsedAmount = itemsTotal;
        }
      }

      const analyzed = {
        storeName: data.store_name || data.storeName || '알 수 없음',
        amount: parsedAmount,
        category: data.category || '기타',
        items: itemsArray
      };

      setAnalyzedData(analyzed);
    } catch (err) {
      console.error('분석 오류:', err);
      let errorMessage = '분석 중 오류가 발생했습니다.';
      
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
        errorMessage = 'MCP 서버에 연결할 수 없습니다.\n\n서버가 실행 중인지 확인해주세요.\n서버 주소: ' + apiUrl;
      } else if (err instanceof Error) {
        if (err.message.includes('시간이 초과')) {
          errorMessage = '요청 시간이 초과되었습니다.\n\n서버가 응답하지 않거나 네트워크 연결에 문제가 있을 수 있습니다.\n서버 주소: ' + apiUrl;
        } else {
          errorMessage = err.message;
        }
      }
      
      Alert.alert('오류', errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmReceipt = () => {
    if (!analyzedData) return;

    const expense: Expense = {
      id: Date.now().toString(),
      date: selectedDate, // 선택된 날짜 사용
      storeName: analyzedData.storeName,
      amount: analyzedData.amount,
      category: analyzedData.category,
      items: analyzedData.items
    };

    const newExpenses = [...expenses, expense];
    saveExpenses(newExpenses);
    // selectedDate는 변경하지 않음 (사용자가 선택한 날짜 유지)
    
    // 초기화
    setReceiptImage(null);
    setAnalyzedData(null);
    setIsReceiptModalVisible(false);
  };

  const handleResetReceipt = () => {
    setReceiptImage(null);
    setAnalyzedData(null);
    setIsAnalyzing(false);
  };

  const getMonthlyChartData = () => {
    const today = new Date();
    const monthlyData: { [key: string]: number } = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = format(date, 'yyyy-MM');
      monthlyData[monthKey] = 0;
    }

    expenses.forEach(expense => {
      const monthKey = format(new Date(expense.date), 'yyyy-MM');
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += expense.amount;
      }
    });

    const labels = Object.keys(monthlyData).map(key => {
      const [year, month] = key.split('-');
      return `${month}월`;
    });

    const data = Object.values(monthlyData);
    
    // 최고 지출액 기준으로 Y축 최대값 계산 (100000 단위로 올림)
    const maxExpense = Math.max(...data, 0);
    const maxYValue = maxExpense > 0 ? Math.ceil(maxExpense / 100000) * 100000 : 100000;
    // segments는 최소 2 이상이어야 Y축 레이블이 제대로 표시됨
    const segments = Math.max(2, Math.floor(maxYValue / 100000));

    return { labels, data, maxYValue, segments };
  };

  const selectedDateExpenses = getDayExpenses(selectedDate);
  const selectedDateTotal = getDayTotal(selectedDate);
  const chartData = getMonthlyChartData();

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loginContainer}>
          {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" />}
          <View style={styles.loginContent}>
            {/* 앱 로고/이름 */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>가계부</Text>
              <Text style={styles.loginSubtitle}>영수증으로 간편하게 가계부를 관리하세요</Text>
            </View>

            {/* 로그인 버튼들 */}
            <View style={styles.loginButtonsContainer}>
              {/* 아이디/비밀번호 입력 */}
              <View style={styles.idPasswordContainer}>
                <TextInput
                  style={styles.loginInput}
                  placeholder="아이디"
                  placeholderTextColor="#999"
                  value={loginForm.username}
                  onChangeText={(text) => setLoginForm({ ...loginForm, username: text })}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.loginInput}
                  placeholder="비밀번호"
                  placeholderTextColor="#999"
                  value={loginForm.password}
                  onChangeText={(text) => setLoginForm({ ...loginForm, password: text })}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.idPasswordLoginButton}
                  onPress={handleIdPasswordLogin}
                >
                  <Text style={styles.idPasswordLoginText}>로그인</Text>
                </TouchableOpacity>
              </View>

              {/* 카카오 로그인 */}
              <TouchableOpacity
                style={styles.kakaoLoginButton}
                onPress={handleKakaoLogin}
              >
                <View style={styles.loginButtonContent}>
                  <Image
                    source={{ uri: 'https://tse3.mm.bing.net/th/id/OIP.CpAAgH6tP1hmWm4gS7evKgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3' }}
                    style={styles.kakaoIconImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.kakaoLoginText}>카카오로 로그인</Text>
                </View>
              </TouchableOpacity>

              {/* 임시로 홈 화면 이동 */}
              <TouchableOpacity
                style={styles.temporaryLoginButton}
                onPress={handleTemporaryLogin}
              >
                <Text style={styles.temporaryLoginText}>임시로 홈 화면 이동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 홈 화면 (기존 가계부 화면)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" />}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>가계부</Text>
            <Text style={styles.subtitle}>
              이번 달 총 지출: <Text style={styles.totalAmount}>{getMonthlyTotal().toLocaleString()}원</Text>
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* 사용자 정보와 로그아웃 버튼 */}
            {userInfo && (
              <View style={styles.userInfoContainer}>
                <Text style={styles.userInfoText}>
                  👤 {userInfo.name}
                </Text>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutButtonText}>로그아웃</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setEditingExpense(null);
                  setFormData({
                    date: selectedDate,
                    storeName: '',
                    amount: '',
                    category: '식료품',
                    memo: ''
                  });
                  setIsAddModalVisible(true);
                }}
              >
                <Text style={styles.iconButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleReceiptUpload}
              >
                <Text style={styles.uploadButtonText}>📷 영수증</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 달력 */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            onMonthChange={(month) => setCurrentMonth(format(new Date(month.year, month.month - 1, 1), 'yyyy-MM'))}
            markedDates={getMarkedDates()}
            monthFormat={'yyyy년 M월'}
            theme={{
              selectedDayBackgroundColor: '#000000',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#ef4444',
              arrowColor: '#000000',
              textDisabledColor: '#d3d3d3',
              textInactiveColor: '#d3d3d3',
            }}
            dayComponent={({ date, state }) => {
              const dayTotal = getDayTotal(date.dateString);
              const dateMonth = format(new Date(date.year, date.month - 1, 1), 'yyyy-MM');
              const isOtherMonth = dateMonth !== currentMonth;
              const isToday = date.dateString === format(new Date(), 'yyyy-MM-dd');
              // selectedDate와 비교하여 선택 상태 확인
              const isSelected = date.dateString === selectedDate;
              // 선택된 날짜만 검은색 배경
              const shouldShowBackground = isSelected && !isOtherMonth;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.dayContainer,
                    shouldShowBackground && styles.selectedContainer
                  ]}
                  onPress={() => setSelectedDate(date.dateString)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText,
                    isOtherMonth && styles.otherMonthDayText,
                    shouldShowBackground && styles.selectedDayText,
                  ]}>
                    {date.day}
                  </Text>
                  {dayTotal > 0 && !isOtherMonth && (
                    <Text style={[
                      styles.dayAmount,
                      shouldShowBackground && styles.selectedDayAmount
                    ]}>
                      {dayTotal.toLocaleString()}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* 지출 내역 */}
        <View style={styles.expensesCard}>
          <Text style={styles.cardTitle}>
            {format(new Date(selectedDate), 'yyyy년 M월 d일')} 지출 내역
          </Text>
          {selectedDateExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>이날 기록된 지출이 없습니다.</Text>
            </View>
          ) : (
            <>
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>{selectedDateTotal.toLocaleString()}원</Text>
              </View>
              {selectedDateExpenses.map(expense => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseContent}>
                    <Text style={styles.expenseStore}>{expense.storeName}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{expense.category}</Text>
                    </View>
                    {expense.items.length > 0 && (
                      <View style={styles.itemsContainer}>
                        <Text style={styles.itemsTitle}>품목 목록</Text>
                        {expense.items.map((item, index) => (
                          <View key={index} style={styles.itemRow}>
                            {typeof item === 'string' ? (
                              <Text style={styles.itemText}>{item}</Text>
                            ) : (
                              <Text style={styles.itemText}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                {item.price !== undefined && item.price !== null && <Text style={styles.itemPrice}> {item.price.toLocaleString()}원</Text>}
                                {item.quantity !== undefined && item.quantity !== null && <Text style={styles.itemQuantity}> (수량: {item.quantity})</Text>}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.expenseActions}>
                    <Text style={styles.expenseAmount}>-{expense.amount.toLocaleString()}원</Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditExpense(expense)}
                      >
                        <Text style={styles.actionButtonText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteExpense(expense.id)}
                      >
                        <Text style={styles.actionButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* 월별 차트 */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>월별 지출 추이</Text>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [{
                data: chartData.data,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                strokeWidth: 2
              }]
            }}
            width={Dimensions.get('window').width - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#000000'
              }
            }}
            segments={chartData.segments}
            fromZero={true}
            yAxisInterval={100000}
            formatYLabel={(value) => {
              const numValue = parseInt(value);
              if (isNaN(numValue)) return value;
              // 100000 단위로 표시
              if (numValue >= 100000) {
                return `${Math.floor(numValue / 100000)}0만`;
              } else if (numValue >= 10000) {
                return `${Math.floor(numValue / 10000)}만`;
              }
              return numValue.toString();
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />
        </View>
      </ScrollView>

      {/* 추가/수정 모달 */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingExpense ? '지출 수정' : '지출 입력'}
            </Text>
            <ScrollView>
              <Text style={styles.label}>날짜</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                placeholder="yyyy-MM-dd"
              />

              <Text style={styles.label}>상호명</Text>
              <TextInput
                style={styles.input}
                value={formData.storeName}
                onChangeText={(text) => setFormData({ ...formData, storeName: text })}
                placeholder="예: 스타벅스"
              />

              <Text style={styles.label}>금액</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.label}>카테고리</Text>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      formData.category === cat && styles.categoryOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      formData.category === cat && styles.categoryOptionTextSelected
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>메모 (선택)</Text>
              <TextInput
                style={styles.input}
                value={formData.memo}
                onChangeText={(text) => setFormData({ ...formData, memo: text })}
                placeholder="메모를 입력하세요"
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsAddModalVisible(false);
                    setEditingExpense(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveExpense}
                >
                  <Text style={styles.saveButtonText}>{editingExpense ? '수정' : '저장'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          </View>
        </Modal>

      {/* 영수증 업로드 모달 */}
      <Modal
        visible={isReceiptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>영수증 업로드</Text>
            <Text style={styles.modalDescription}>영수증 이미지를 업로드하면 자동으로 분석합니다</Text>

            <ScrollView>
              {/* 이미지 업로드 영역 */}
              {!receiptImage && (
                <View style={styles.imageUploadArea}>
                  <TouchableOpacity
                    style={styles.imageUploadButton}
                    onPress={() => handleImagePicker(false)}
                  >
                    <Text style={styles.imageUploadButtonText}>
                      {Platform.OS === 'web' ? '📁 파일 선택' : '📁 갤러리에서 선택'}
                    </Text>
                  </TouchableOpacity>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={styles.imageUploadButton}
                      onPress={() => handleImagePicker(true)}
                    >
                      <Text style={styles.imageUploadButtonText}>📷 카메라로 촬영</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* 이미지 미리보기 */}
              {receiptImage && !isAnalyzing && !analyzedData && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: receiptImage }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleResetReceipt}
                  >
                    <Text style={styles.removeImageButtonText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={analyzeImage}
                  >
                    <Text style={styles.analyzeButtonText}>분석 시작</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 분석 중 */}
              {isAnalyzing && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>영수증을 분석하고 있습니다...</Text>
                </View>
              )}

              {/* 분석 결과 */}
              {analyzedData && (
                <View style={styles.analysisResult}>
                  <View style={styles.successBadge}>
                    <Text style={styles.successText}>✓ 분석 완료</Text>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>상호명</Text>
                    <Text style={styles.resultValue}>{analyzedData.storeName}</Text>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>금액</Text>
                    <Text style={styles.resultAmount}>{analyzedData.amount.toLocaleString()}원</Text>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>카테고리</Text>
                    <Text style={styles.resultValue}>{analyzedData.category}</Text>
                  </View>

                  {analyzedData.items.length > 0 && (
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>품목</Text>
                      <View style={styles.itemsList}>
                        {analyzedData.items.map((item, index) => {
                          if (typeof item === 'string') {
                            return (
                              <Text key={index} style={styles.itemText}>{item}</Text>
                            );
                          } else {
                            return (
                              <Text key={index} style={styles.itemText}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                {item.price && <Text style={styles.itemPrice}> {item.price.toLocaleString()}원</Text>}
                                {item.quantity && <Text style={styles.itemQuantity}> (수량: {item.quantity})</Text>}
                              </Text>
                            );
                          }
                        })}
                      </View>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleResetReceipt}
                    >
                      <Text style={styles.cancelButtonText}>다시 업로드</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={handleConfirmReceipt}
                    >
                      <Text style={styles.saveButtonText}>가계부에 저장</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!receiptImage && !isAnalyzing && !analyzedData && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsReceiptModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // 로그인 화면 스타일
  loginContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loginButtonsContainer: {
    gap: 12,
  },
  kakaoLoginButton: {
    backgroundColor: '#FEE500',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#FEE500',
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  kakaoIconImage: {
    width: 24,
    height: 24,
  },
  kakaoLoginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  idPasswordContainer: {
    gap: 12,
    marginTop: 8,
  },
  loginInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  idPasswordLoginButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  idPasswordLoginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  temporaryLoginButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  temporaryLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // 홈 화면 스타일
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userInfoText: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  logoutButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  totalAmount: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconButtonText: {
    fontSize: 24,
    color: '#000',
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 16,
  },
  todayContainer: {
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  selectedContainer: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dayText: {
    fontSize: 14,
    color: '#000',
  },
  otherMonthDayText: {
    color: '#d3d3d3',
    opacity: 0.5,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayAmount: {
    fontSize: 9,
    color: '#ef4444',
    marginTop: 2,
  },
  selectedDayAmount: {
    color: '#fff',
  },
  expensesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  totalContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  expenseItem: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseContent: {
    flex: 1,
  },
  expenseStore: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#475569',
  },
  itemsContainer: {
    marginTop: 8,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  itemRow: {
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#666',
  },
  itemName: {
    fontWeight: '600',
  },
  itemPrice: {
    color: '#666',
  },
  itemQuantity: {
    color: '#999',
  },
  expenseActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 18,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryOptionSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#666',
  },
  categoryOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#000',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  imageUploadArea: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  imageUploadButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  imageUploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  imagePreviewContainer: {
    marginVertical: 20,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analyzeButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  analysisResult: {
    marginTop: 20,
  },
  successBadge: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
  },
  resultItem: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  resultAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  itemsList: {
    marginTop: 8,
  },
});
