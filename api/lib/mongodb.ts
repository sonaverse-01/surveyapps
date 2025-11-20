import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
  throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
}

// MongoDB 연결 옵션 (Vercel 서버리스 환경에 최적화)
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 5000, // 5초 타임아웃
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Vercel 서버리스 환경에서는 전역 변수를 사용하여 연결 재사용
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
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
        uri: uri ? `${uri.substring(0, 20)}...` : 'undefined'
      });
      global._mongoClientPromise = undefined;
      throw err;
    });
  } catch (err: any) {
    console.error('MongoDB 클라이언트 생성 실패:', err);
    throw err;
  }
}
clientPromise = global._mongoClientPromise;

export default clientPromise;

