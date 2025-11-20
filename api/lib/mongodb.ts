import { MongoClient, MongoClientOptions } from 'mongodb';

// Vercel 서버리스 환경에서는 전역 변수를 사용하여 연결 재사용
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const error = new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
    console.error(error.message);
    return Promise.reject(error);
  }

  // MongoDB 연결 옵션 (Vercel 서버리스 환경에 최적화)
  const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 10000, // 10초 타임아웃
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 1,
  };

  // 전역 변수에 연결이 없으면 새로 생성
  if (!global._mongoClientPromise) {
    try {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect().catch((err) => {
        console.error('MongoDB 연결 실패:', {
          message: err.message,
          name: err.name,
          code: err.code,
          uriPrefix: uri ? `${uri.substring(0, 30)}...` : 'undefined'
        });
        // 연결 실패 시 전역 변수 초기화
        global._mongoClientPromise = undefined;
        throw err;
      });
    } catch (err: any) {
      console.error('MongoDB 클라이언트 생성 실패:', err);
      global._mongoClientPromise = undefined;
      return Promise.reject(err);
    }
  }

  return global._mongoClientPromise;
}

export default getMongoClient();

