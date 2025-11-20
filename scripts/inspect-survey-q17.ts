import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';

async function inspectSurvey() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('survey_apps'); // Assuming this is the correct DB based on server/index.ts
    const surveys = await db.collection('surveys').find({}).toArray();
    
    let found = false;
    for (const survey of surveys) {
      const q17 = survey.questions?.find((q: any) => q.text?.includes('성인용 기저귀를 사용하고 계신가요'));
      if (q17) {
        console.log(`Found Survey: ${survey.title} (ID: ${survey.id || survey._id})`);
        console.log('Question 17:', JSON.stringify(q17, null, 2));
        found = true;
        
        // Also check Q18 to see what it is
        const q17Index = survey.questions.findIndex((q: any) => q === q17);
        if (q17Index !== -1 && q17Index + 1 < survey.questions.length) {
            console.log('Next Question (Q18):', JSON.stringify(survey.questions[q17Index+1], null, 2));
        }
      }
    }
    
    if (!found) {
        console.log('Question not found in any survey.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

inspectSurvey();
