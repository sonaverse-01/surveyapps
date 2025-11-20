import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
}

const uri = process.env.MONGODB_URI;
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
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // 프로덕션 환경: 새 클라이언트 생성
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

