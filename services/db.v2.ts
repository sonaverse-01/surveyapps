import { Survey, SurveyResponse, QuestionType, TargetAudience } from '../types';
import clientPromise from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = import.meta.env.VITE_MONGODB_DB || 'survey_app_v2';
const COLLECTIONS = {
  SURVEYS: 'surveys',
  RESPONSES: 'responses',
  ADMIN_AUTH: 'admin_auth'
};

// Helper to get database
const getDb = async () => {
  const client = await clientPromise;
  return client.db(DB_NAME);
};

export const getSurveys = async (): Promise<Survey[]> => {
  try {
    const db = await getDb();
    const surveys = await db.collection<Survey>(COLLECTIONS.SURVEYS)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return surveys;
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return [];
  }
};

export const getSurveyById = async (id: string): Promise<Survey | undefined> => {
  try {
    const db = await getDb();
    const survey = await db.collection<Survey>(COLLECTIONS.SURVEYS).findOne({ id });
    return survey || undefined;
  } catch (error) {
    console.error('Error fetching survey:', error);
    return undefined;
  }
};

export const saveSurvey = async (survey: Survey): Promise<void> => {
  try {
    const db = await getDb();
    await db.collection(COLLECTIONS.SURVEYS).updateOne(
      { id: survey.id },
      { $set: survey },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving survey:', error);
    throw error;
  }
};

// Special function to handle exclusive activation
export const updateSurveyStatus = async (
  id: string, 
  shouldBeActive: boolean, 
  audience: TargetAudience
): Promise<void> => {
  try {
    const db = await getDb();
    const surveysCollection = db.collection<Survey>(COLLECTIONS.SURVEYS);
    
    if (shouldBeActive) {
      // If activating, we need to deactivate conflicting surveys
      const allSurveys = await surveysCollection.find({}).toArray();
      
      const updates: Promise<any>[] = [];
      
      for (const s of allSurveys) {
        if (s.id === id) {
          updates.push(
            surveysCollection.updateOne(
              { id },
              { $set: { isActive: true, targetAudience: audience } }
            )
          );
        } else {
          // Conflict Rules:
          // 1. If new survey is ALL, it conflicts with EVERYTHING.
          // 2. If existing survey is ALL, it conflicts with EVERYTHING.
          // 3. If existing survey has SAME audience, it conflicts.
          const isConflict = 
            audience === TargetAudience.ALL || 
            s.targetAudience === TargetAudience.ALL || 
            s.targetAudience === audience;

          if (isConflict) {
            updates.push(
              surveysCollection.updateOne(
                { id: s.id },
                { $set: { isActive: false } }
              )
            );
          }
        }
      }
      
      await Promise.all(updates);
    } else {
      // Simply deactivate
      await surveysCollection.updateOne(
        { id },
        { $set: { isActive: false, targetAudience: audience } }
      );
    }
  } catch (error) {
    console.error('Error updating survey status:', error);
    throw error;
  }
};

export const deleteSurvey = async (id: string): Promise<void> => {
  try {
    const db = await getDb();
    await db.collection(COLLECTIONS.SURVEYS).deleteOne({ id });
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
};

export const saveResponse = async (response: SurveyResponse): Promise<void> => {
  try {
    const db = await getDb();
    await db.collection(COLLECTIONS.RESPONSES).insertOne(response);
  } catch (error) {
    console.error('Error saving response:', error);
    throw error;
  }
};

export const getResponses = async (surveyId: string): Promise<SurveyResponse[]> => {
  try {
    const db = await getDb();
    const responses = await db.collection<SurveyResponse>(COLLECTIONS.RESPONSES)
      .find({ surveyId })
      .sort({ submittedAt: -1 })
      .toArray();
    return responses;
  } catch (error) {
    console.error('Error fetching responses:', error);
    return [];
  }
};

// Admin Auth Helpers (using localStorage as fallback, can be moved to MongoDB later)
export const checkAdminAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COLLECTIONS.ADMIN_AUTH) === 'true';
};

export const setAdminAuth = (isRemembered: boolean) => {
  if (typeof window === 'undefined') return;
  if (isRemembered) {
    localStorage.setItem(COLLECTIONS.ADMIN_AUTH, 'true');
  } else {
    localStorage.removeItem(COLLECTIONS.ADMIN_AUTH);
  }
};

