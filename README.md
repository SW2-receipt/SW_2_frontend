# 가계부 모바일 앱

React Native로 만든 가계부 앱입니다.

## 기능

- 📅 달력 기반 지출 관리
- 💰 일별/월별 지출 통계
- 📷 영수증 업로드 (준비 중)
- ✏️ 지출 내역 편집/삭제
- 📊 월별 지출 추이 차트
- 💾 로컬 저장소 (AsyncStorage)

## 설치 및 실행

### 필수 요구사항

- Node.js 18 이상
- Expo CLI 설치: `npm install -g expo-cli`

### 설치

```bash
npm install
```

### 실행

```bash
# 개발 서버 시작
npm start

# iOS 시뮬레이터에서 실행
npm run ios

# Android 에뮬레이터에서 실행
npm run android
```

## 프로젝트 구조

```
├── App.tsx              # 메인 앱 컴포넌트
├── package.json         # 의존성 관리
├── app.json            # Expo 설정
└── tsconfig.json       # TypeScript 설정
```

## 주요 라이브러리

- **react-native-calendars**: 달력 컴포넌트
- **react-native-image-picker**: 이미지 선택
- **@react-native-async-storage/async-storage**: 로컬 저장소
- **react-native-chart-kit**: 차트 표시
- **date-fns**: 날짜 처리

## 개발

이 앱은 Expo를 사용하여 개발되었습니다. 자세한 내용은 [Expo 문서](https://docs.expo.dev/)를 참고하세요.

