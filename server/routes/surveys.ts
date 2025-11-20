import { Router } from 'express';
import { Survey, TargetAudience } from '../../types';

const router = Router();

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
        // 빈 문자열, null, undefined는 null로 정규화
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

// 모든 설문 조회
router.get('/', async (req, res) => {
  try {
    const db = (req as any).db;
    const surveys = await db.collection('surveys')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    const transformed = surveys.map(transformSurveyFromDB);
    res.json(transformed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 설문 조회
router.get('/:id', async (req, res) => {
  try {
    const db = (req as any).db;
    // id 또는 _id로 검색
    const survey = await db.collection('surveys').findOne({ 
      $or: [
        { id: req.params.id },
        { _id: req.params.id }
      ]
    });
    if (!survey) {
      return res.status(404).json({ error: '설문을 찾을 수 없습니다.' });
    }
    const transformed = transformSurveyFromDB(survey);
    res.json(transformed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 설문 생성/수정
router.post('/', async (req, res) => {
  try {
    const db = (req as any).db;
    const survey: Survey = req.body;
    
    // 프론트엔드 형식을 MongoDB에 저장할 때도 id 필드 유지
    const surveyToSave = {
      ...survey,
      // _id는 제외하고 저장 (id 필드 사용)
    };
    
    // id 또는 _id로 검색하여 업데이트
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
    
    // upsert 후 id 필드가 없으면 추가
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
    
    res.json({ success: true, survey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 설문 상태 업데이트 (활성화/비활성화)
router.patch('/:id/status', async (req, res) => {
  try {
    const db = (req as any).db;
    const { shouldBeActive, audience } = req.body;
    const id = req.params.id;
    
    if (shouldBeActive) {
      // 활성화 시 충돌하는 설문 비활성화
      const allSurveys = await db.collection('surveys').find({}).toArray();
      
      const updates: Promise<any>[] = [];
      
      for (const s of allSurveys) {
        const surveyId = s.id || s._id?.toString();
        if (surveyId === id) {
          updates.push(
            db.collection('surveys').updateOne(
              { 
                $or: [
                  { id },
                  { _id: id }
                ]
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
                    { _id: surveyId }
                  ]
                },
                { $set: { isActive: false } }
              )
            );
          }
        }
      }
      
      await Promise.all(updates);
    } else {
      // 비활성화
      await db.collection('surveys').updateOne(
        { 
          $or: [
            { id },
            { _id: id }
          ]
        },
        { $set: { isActive: false, targetAudience: audience, id } }
      );
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 설문 삭제
router.delete('/:id', async (req, res) => {
  try {
    const db = (req as any).db;
    await db.collection('surveys').deleteOne({ 
      $or: [
        { id: req.params.id },
        { _id: req.params.id }
      ]
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

