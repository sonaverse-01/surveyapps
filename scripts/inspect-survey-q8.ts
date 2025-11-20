import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';

async function inspectSurvey() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('survey_apps');
        const surveys = await db.collection('surveys').find({}).toArray();

        for (const survey of surveys) {
            const q8 = survey.questions?.find((q: any) => q.text?.includes('할인 행사 때 문자를 보내드려도 될까요'));
            if (q8) {
                console.log(`Found Survey: ${survey.title}`);
                const q8Index = survey.questions.indexOf(q8);
                console.log(`Q8 Index: ${q8Index}`);
                console.log('Q8:', JSON.stringify(q8, null, 2));

                // Find the target of "Yes"
                const yesOpt = q8.options?.find((o: any) => o.text === '네');
                if (yesOpt && yesOpt.nextQuestionId) {
                    const targetId = yesOpt.nextQuestionId;
                    const targetQ = survey.questions.find((q: any) => q.id === targetId);
                    const targetIndex = survey.questions.indexOf(targetQ);
                    console.log(`Target Question Index: ${targetIndex}`);
                    console.log('Target Question:', JSON.stringify(targetQ, null, 2));

                    // Check what's after the target
                    if (targetIndex + 1 < survey.questions.length) {
                        console.log(`Question after Target (Index ${targetIndex + 1}):`, JSON.stringify(survey.questions[targetIndex + 1], null, 2));
                    } else {
                        console.log('Target is the last question.');
                    }

                    // Check what's after Q8
                    if (q8Index + 1 < survey.questions.length) {
                        console.log(`Question after Q8 (Index ${q8Index + 1}):`, JSON.stringify(survey.questions[q8Index + 1], null, 2));
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

inspectSurvey();
