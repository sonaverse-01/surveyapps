import { Router } from 'express';
import { SurveyResponse } from '../../types';

const router = Router();

// 응답 저장
router.post('/', async (req, res) => {
  try {
    const db = (req as any).db;
    const response: SurveyResponse = req.body;
    
    await db.collection('responses').insertOne(response);
    res.json({ success: true, response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 설문의 응답 조회
router.get('/survey/:surveyId', async (req, res) => {
  try {
    const db = (req as any).db;
    const { surveyId } = req.params;
    
    const responses = await db.collection('responses')
      .find({ surveyId })
      .sort({ submittedAt: -1 })
      .toArray();
    
    res.json(responses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 모든 응답 조회
router.get('/', async (req, res) => {
  try {
    const db = (req as any).db;
    const responses = await db.collection('responses')
      .find({})
      .sort({ submittedAt: -1 })
      .toArray();
    
    res.json(responses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

