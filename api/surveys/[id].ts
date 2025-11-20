import type { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';
import { Survey } from '../../types';

const DB_NAME = process.env.MONGODB_DB || 'survey_apps';

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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const id = req.query.id as string;

    // 특정 설문 조회
    if (req.method === 'GET') {
      const survey = await db.collection('surveys').findOne({
        $or: [
          { id },
          { _id: id }
        ]
      });
      if (!survey) {
        return res.status(404).json({ error: '설문을 찾을 수 없습니다.' });
      }
      const transformed = transformSurveyFromDB(survey);
      res.json(transformed);
      return;
    }

    // 설문 삭제
    if (req.method === 'DELETE') {
      await db.collection('surveys').deleteOne({
        $or: [
          { id },
          { _id: id }
        ]
      });
      res.json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

