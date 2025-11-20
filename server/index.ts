import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import surveysRouter from './routes/surveys';
import responsesRouter from './routes/responses';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isDevelopment = process.env.NODE_ENV !== 'production';

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';
const DB_NAME = process.env.MONGODB_DB || 'survey_apps';

if (!MONGODB_URI) {
  console.error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

let client: MongoClient;
let db: any;

async function connectDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ MongoDB 연결 성공');

    // 컬렉션 초기화 확인
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c: any) => c.name);
    console.log('📊 기존 컬렉션:', collectionNames);

    // 컬렉션이 없으면 생성
    if (!collectionNames.includes('surveys')) {
      await db.createCollection('surveys');
      console.log('✅ surveys 컬렉션 생성');
    }
    if (!collectionNames.includes('responses')) {
      await db.createCollection('responses');
      console.log('✅ responses 컬렉션 생성');
    }
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
}

// 미들웨어
app.use(cors());
app.use(express.json());

// DB를 라우터에 전달하기 위한 미들웨어
app.use((req, res, next) => {
  (req as any).db = db;
  next();
});

// API 라우트 (정적 파일 서빙 전에 위치)
app.use('/api/surveys', surveysRouter);
app.use('/api/responses', responsesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: db ? 'connected' : 'disconnected' });
});

// 서버 시작
async function startServer() {
  await connectDB();

  // 정적 파일 서빙 설정
  if (!isDevelopment) {
    // 프로덕션: 빌드된 정적 파일 서빙
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));

    // 모든 라우트를 index.html로 리다이렉트 (SPA 라우팅)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // 개발 환경: Vite를 미들웨어로 통합
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.join(__dirname, '..'),
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    if (isDevelopment) {
      console.log(`📱 프론트엔드: http://localhost:${PORT}`);
    }
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB 연결 종료');
  }
  process.exit(0);
});

