import type { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../../lib/mongodb.js';
import { TargetAudience } from '../../../types.js';

const DB_NAME = process.env.MONGODB_DB || 'survey_apps';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const id = req.query.id as string;
    const { shouldBeActive, audience } = req.body;
    
    if (shouldBeActive) {
      const allSurveys = await db.collection('surveys').find({}).toArray();
      const updates: Promise<any>[] = [];
      
      for (const s of allSurveys) {
        const surveyId = s.id || s._id?.toString();
        if (surveyId === id) {
            updates.push(
              db.collection('surveys').updateOne(
                {
                  $or: [
                    { id: id as string },
                    { _id: id as any }
                  ] as any
                },
                { $set: { isActive: true, targetAudience: audience, id } }
              )
            );
        } else {
          const isConflict = 
            audience === TargetAudience.ALL || 
            s.targetAudience === TargetAudience.ALL || 
            s.targetAudience === audience;

          if (isConflict) {
              updates.push(
                db.collection('surveys').updateOne(
                  {
                    $or: [
                      { id: surveyId },
                      { _id: surveyId as any }
                    ] as any
                  },
                  { $set: { isActive: false } }
                )
              );
          }
        }
      }
      
      await Promise.all(updates);
    } else {
      await db.collection('surveys').updateOne(
        {
          $or: [
            { id: id as string },
            { _id: id as any }
          ] as any
        },
        { $set: { isActive: false, targetAudience: audience, id } }
      );
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

