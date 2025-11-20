import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
  throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Vercel 서버리스 환경에서는 전역 변수를 사용하여 연결 재사용
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // 개발 환경: 전역 변수에 저장하여 재사용
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
      console.error('MongoDB 연결 실패:', err);
      global._mongoClientPromise = undefined;
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // 프로덕션 환경: 전역 변수에 저장하여 재사용 (Vercel 서버리스)
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
      console.error('MongoDB 연결 실패:', err);
      global._mongoClientPromise = undefined;
      throw err;
    });
  }
  clientPromise = global._mongoClientPromise;
}

export default clientPromise;

