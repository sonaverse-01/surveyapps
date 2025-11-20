# MongoDB 연동 가이드

## 설정 방법

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```
MONGODB_URI=mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster
MONGODB_DB=survey_apps
PORT=5000
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 서버 실행

#### 개발 환경
```bash
npm run dev
```
하나의 포트(기본 5000)에서 프론트엔드와 백엔드가 모두 실행됩니다.

#### 프로덕션 빌드 및 실행
```bash
# 빌드
npm run build

# 실행
npm run start
```

또는 한 번에:
```bash
npm run preview
```

### 4. MongoDB 데이터베이스 구조

프로젝트는 다음 컬렉션을 사용합니다:

- **surveys**: 설문조사 데이터
- **responses**: 설문 응답 데이터

서버가 처음 실행될 때 자동으로 컬렉션이 생성됩니다.

### 5. API 엔드포인트

- `GET /api/surveys` - 모든 설문 조회
- `GET /api/surveys/:id` - 특정 설문 조회
- `POST /api/surveys` - 설문 생성/수정
- `PATCH /api/surveys/:id/status` - 설문 상태 업데이트
- `DELETE /api/surveys/:id` - 설문 삭제
- `POST /api/surveys/init` - Seed 데이터 초기화
- `POST /api/responses` - 응답 저장
- `GET /api/responses/survey/:surveyId` - 특정 설문의 응답 조회
- `GET /api/health` - 서버 상태 확인

### 6. 단일 포트 통합

- **개발 환경**: Express 서버가 Vite dev server를 미들웨어로 통합하여 하나의 포트에서 실행됩니다.
- **프로덕션**: Express 서버가 빌드된 정적 파일을 서빙합니다.
- 프론트엔드는 상대 경로(`/api`)로 API를 호출하므로 별도의 프록시 설정이 필요 없습니다.

## 문제 해결

### MongoDB 연결 실패
- `.env` 파일의 `MONGODB_URI`가 올바른지 확인하세요
- MongoDB Atlas의 네트워크 접근 설정을 확인하세요 (IP 화이트리스트)

### 포트 충돌
- 서버는 기본적으로 포트 5000을 사용합니다 (프론트엔드와 백엔드 통합)
- 포트가 사용 중이면 `.env` 파일에서 `PORT` 값을 변경하세요

