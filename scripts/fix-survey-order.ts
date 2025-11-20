import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';

async function fixSurveyOrder() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('survey_apps');
        const surveys = await db.collection('surveys').find({}).toArray();

        for (const survey of surveys) {
            // Find Q8
            const q8Index = survey.questions?.findIndex((q: any) => q.text?.includes('할인 행사 때 문자를 보내드려도 될까요'));

            if (q8Index !== -1) {
                const q8 = survey.questions[q8Index];
                const yesOpt = q8.options?.find((o: any) => o.text === '네');

                if (yesOpt && yesOpt.nextQuestionId) {
                    const targetId = yesOpt.nextQuestionId;
                    const targetIndex = survey.questions.findIndex((q: any) => q.id === targetId);

                    // If target is NOT immediately after Q8
                    if (targetIndex !== q8Index + 1) {
                        console.log(`Fixing Survey: ${survey.title}`);
                        console.log(`Moving Q (Index ${targetIndex}) to after Q8 (Index ${q8Index})`);

                        const newQuestions = [...survey.questions];
                        // Remove target from old position
                        const [targetQ] = newQuestions.splice(targetIndex, 1);
                        // Insert target after Q8
                        // Note: If targetIndex > q8Index, removing it doesn't shift q8Index.
                        // If targetIndex < q8Index, q8Index would shift down by 1.
                        // In our case, targetIndex (18) > q8Index (9), so it's safe.

                        const insertIndex = q8Index + 1;
                        newQuestions.splice(insertIndex, 0, targetQ);

                        // Update DB
                        await db.collection('surveys').updateOne(
                            { _id: survey._id },
                            { $set: { questions: newQuestions } }
                        );
                        console.log('✅ Survey order updated.');
                    } else {
                        console.log(`Survey ${survey.title} is already in correct order.`);
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

fixSurveyOrder();
