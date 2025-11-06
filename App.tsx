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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { launchImageLibrary, launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions, Platform, Image } from 'react-native';

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

export default function App() {
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

  useEffect(() => {
    loadExpenses();
  }, []);

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
    Alert.alert(
      '삭제 확인',
      '정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const newExpenses = expenses.filter(exp => exp.id !== expenseId);
            saveExpenses(newExpenses);
          }
        }
      ]
    );
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

  const handleImagePicker = (useCamera: boolean = false) => {
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

    // 모바일에서는 react-native-image-picker 사용
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: false,
      selectionLimit: 1,
    };

    const callback = (response: ImagePickerResponse) => {
      console.log('ImagePicker Response:', response);
      
      if (response.didCancel) {
        console.log('사용자가 취소했습니다.');
        return;
      }
      
      if (response.errorCode) {
        let errorMessage = '이미지를 가져오는 중 오류가 발생했습니다.';
        switch (response.errorCode) {
          case 'camera_unavailable':
            errorMessage = '카메라를 사용할 수 없습니다.';
            break;
          case 'permission':
            errorMessage = '카메라/갤러리 접근 권한이 필요합니다.';
            break;
          case 'others':
            errorMessage = response.errorMessage || '알 수 없는 오류가 발생했습니다.';
            break;
        }
        Alert.alert('오류', errorMessage);
        return;
      }
      
      if (response.errorMessage) {
        Alert.alert('오류', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        const imageUri = asset.uri || null;
        if (imageUri) {
          console.log('이미지 URI:', imageUri);
          setReceiptImage(imageUri);
        } else {
          Alert.alert('오류', '이미지 URI를 가져올 수 없습니다.');
        }
      } else {
        Alert.alert('오류', '이미지를 선택할 수 없습니다.');
      }
    };

    try {
      if (useCamera) {
        launchCamera(options, callback);
      } else {
        launchImageLibrary(options, callback);
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
        formData.append('image_file', {
          uri: Platform.OS === 'android' ? receiptImage : receiptImage.replace('file://', ''),
          type: 'image/jpeg',
          name: 'receipt.jpg',
        } as any);
      }
      
      formData.append('user_id', 'anonymous');

      // MCP 서버 주소 (기존 웹 버전과 동일한 주소 사용)
      const apiUrl = 'http://127.0.0.1:8000/analyze_receipt';
      
      console.log('MCP 서버 요청:', apiUrl);
      console.log('플랫폼:', Platform.OS);
      console.log('이미지 URI:', receiptImage?.substring(0, 50) + '...');

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        // FormData를 사용할 때는 Content-Type을 명시하지 않아야 브라우저가 자동으로 boundary를 설정함
      });

      const responseText = await response.text();

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
        throw new Error('서버 응답 형식이 올바르지 않습니다.');
      }

      console.log('API 응답 데이터:', data);

      // amount 처리
      let parsedAmount = 0;
      if (typeof data.amount === 'number') {
        parsedAmount = data.amount;
      } else if (typeof data.amount === 'string') {
        const cleaned = data.amount.replace(/[^0-9]/g, '');
        parsedAmount = parseInt(cleaned, 10) || 0;
      } else if (data.amount) {
        parsedAmount = Number(data.amount) || 0;
      }

      // items 처리
      let itemsArray: (string | ExpenseItem)[] = [];
      if (Array.isArray(data.items)) {
        itemsArray = data.items.map(item => {
          if (typeof item === 'object' && item !== null) {
            return {
              name: item.name || item.item || item.product || item.title || item.품목 || item.상품명 || '품목',
              price: item.price || item.가격 || (typeof item.price === 'string' ? parseInt(item.price.replace(/[^0-9]/g, ''), 10) : undefined),
              quantity: item.quantity || item.수량 || item.qty || undefined
            };
          }
          return String(item);
        }).filter(item => {
          if (typeof item === 'object' && !item.name) return false;
          return Boolean(item);
        });
      } else if (typeof data.items === 'string') {
        itemsArray = data.items.split(',').map((item: string) => item.trim()).filter(Boolean);
      } else if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
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
        itemsArray = [String(data.items)];
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
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'MCP 서버에 연결할 수 없습니다.\n서버가 실행 중인지 확인해주세요.\n(http://127.0.0.1:8000)';
      } else if (err instanceof Error) {
        errorMessage = err.message;
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
      date: format(new Date(), 'yyyy-MM-dd'),
      storeName: analyzedData.storeName,
      amount: analyzedData.amount,
      category: analyzedData.category,
      items: analyzedData.items
    };

    const newExpenses = [...expenses, expense];
    saveExpenses(newExpenses);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    
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

    return { labels, data };
  };

  const selectedDateExpenses = getDayExpenses(selectedDate);
  const selectedDateTotal = getDayTotal(selectedDate);
  const chartData = getMonthlyChartData();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>가계부</Text>
            <Text style={styles.subtitle}>
              이번 달 총 지출: <Text style={styles.totalAmount}>{getMonthlyTotal().toLocaleString()}원</Text>
            </Text>
          </View>
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
                      {dayTotal > 9999 ? `${Math.floor(dayTotal / 10000)}만` : dayTotal.toLocaleString()}
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
                                {item.price && <Text style={styles.itemPrice}> {item.price.toLocaleString()}원</Text>}
                                {item.quantity && <Text style={styles.itemQuantity}> (수량: {item.quantity})</Text>}
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
            bezier
            style={styles.chart}
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
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
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
  totalAmount: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
