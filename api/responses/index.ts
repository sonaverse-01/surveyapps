import type { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';
import { SurveyResponse } from '../lib/types.js';

const DB_NAME = process.env.MONGODB_DB || 'survey_apps';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 응답 저장
    if (req.method === 'POST') {
      const response: SurveyResponse = req.body;
      await db.collection('responses').insertOne(response);
      res.json({ success: true, response });
      return;
    }

    // 모든 응답 조회
    if (req.method === 'GET' && !req.query.surveyId) {
      const responses = await db.collection('responses')
        .find({})
        .sort({ submittedAt: -1 })
        .toArray();
      res.json(responses);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

