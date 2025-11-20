import type { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../../lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || 'survey_apps';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { surveyId } = req.query;
    
    const responses = await db.collection('responses')
      .find({ surveyId: surveyId as string })
      .sort({ submittedAt: -1 })
      .toArray();
    
    res.json(responses);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

