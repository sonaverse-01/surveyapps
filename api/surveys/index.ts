import type { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb';
import { Survey, TargetAudience } from '../../types';

const DB_NAME = process.env.MONGODB_DB || 'survey_apps';

// 데이터 변환 함수: MongoDB 형식을 프론트엔드 형식으로 변환
function transformSurveyFromDB(survey: any): Survey {
  return {
    id: survey.id || survey._id?.toString() || '',
    title: survey.title || '',
    description: survey.description || '',
    isActive: survey.isActive || false,
    createdAt: survey.createdAt || Date.now(),
    targetAudience: survey.targetAudience || 'ALL',
    questions: (survey.questions || []).map((q: any) => ({
      id: q.id || '',
      text: q.text || q.title || '',
      type: q.type || 'SINGLE_CHOICE',
      isRequired: q.isRequired !== undefined ? q.isRequired : (q.required !== undefined ? q.required : false),
      options: (q.options || []).map((opt: any) => {
        const nextId = opt.nextQuestionId || opt.next;
        const normalizedNextId = (nextId && String(nextId).trim() !== '') ? String(nextId).trim() : null;
        return {
          id: opt.id || opt.value || '',
          text: opt.text || opt.label || '',
          nextQuestionId: normalizedNextId,
        };
      }),
    })),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 환경 변수 확인
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({ 
        error: 'MONGODB_URI 환경 변수가 설정되지 않았습니다.',
        details: 'Vercel 환경 변수 설정을 확인하세요.',
        env: {
          nodeEnv: process.env.NODE_ENV,
          hasMongoUri: false
        }
      });
    }

    console.log('MongoDB 연결 시도 중...');
    const client = await clientPromise;
    console.log('MongoDB 연결 성공');
    const db = client.db(DB_NAME);

    // 모든 설문 조회
    if (req.method === 'GET') {
      const surveys = await db.collection('surveys')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      const transformed = surveys.map(transformSurveyFromDB);
      return res.json(transformed);
    }

    // 설문 생성/수정
    if (req.method === 'POST') {
      const survey: Survey = req.body;
      const surveyToSave = { ...survey };
      
      const result = await db.collection('surveys').updateOne(
        { 
          $or: [
            { id: survey.id },
            { _id: survey.id }
          ]
        },
        { $set: surveyToSave },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        await db.collection('surveys').updateOne(
          { 
            $or: [
              { id: survey.id },
              { _id: survey.id }
            ]
          },
          { $set: { id: survey.id } }
        );
      }
      
      return res.json({ success: true, survey });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      mongodbUri: process.env.MONGODB_URI ? '설정됨' : '설정 안됨'
    });
    
    const errorMessage = error.message || 'Internal server error';
    const statusCode = error.name === 'MongoServerError' ? 500 : 500;
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

