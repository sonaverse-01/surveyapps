import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  const error = 'MONGODB_URI 환경 변수가 설정되지 않았습니다.';
  console.error(error);
  // 모듈 로드 시점에 에러를 던지지 않고, 연결 시점에 처리
}

// MongoDB 연결 옵션 (Vercel 서버리스 환경에 최적화)
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 10000, // 10초 타임아웃
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Vercel 서버리스 환경에서는 전역 변수를 사용하여 연결 재사용
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.'));
  }

  // 개발 및 프로덕션 모두에서 전역 변수 사용 (Vercel 서버리스)
  if (!global._mongoClientPromise) {
    try {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect().catch((err) => {
        console.error('MongoDB 연결 실패:', {
          message: err.message,
          name: err.name,
          code: err.code,
          uri: uri ? `${uri.substring(0, 30)}...` : 'undefined'
        });
        global._mongoClientPromise = undefined;
        client = null;
        throw err;
      });
    } catch (err: any) {
      console.error('MongoDB 클라이언트 생성 실패:', err);
      global._mongoClientPromise = undefined;
      throw err;
    }
  }
  return global._mongoClientPromise;
}

export default getClientPromise();

