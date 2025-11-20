// Note: MongoDB client can only be used in server-side code (Node.js)
// For client-side (browser) usage, you need to use API endpoints
// This file is prepared for server-side usage (e.g., Next.js API routes, Express server, etc.)

import { MongoClient } from 'mongodb';

// This will only work in Node.js environment, not in browser
// For Vite client-side app, use API endpoints instead
const uri: string = import.meta.env.VITE_MONGODB_URI || '';

if (!uri) {
  console.warn('VITE_MONGODB_URI is not set. MongoDB operations will fail.');
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Check if we're in a Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node;

if (isNode) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'development') {
    // 개발 환경에서는 전역 변수에 저장하여 재사용
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      try {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect().catch(err => {
          console.error("MongoDB connection promise error:", err);
          throw err;
        });
      } catch (err) {
        console.error("MongoDB client instantiation error:", err);
        throw err;
      }
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // 프로덕션 환경
    try {
      client = new MongoClient(uri, options);
      clientPromise = client.connect().catch(err => {
        console.error("MongoDB connection promise error:", err);
        throw err;
      });
    } catch (err) {
      console.error("MongoDB client instantiation error:", err);
      throw err;
    }
  }
} else {
  // Browser environment - return a rejected promise
  clientPromise = Promise.reject(
    new Error('MongoDB client cannot be used in browser. Use API endpoints instead.')
  );
}

export default clientPromise;

