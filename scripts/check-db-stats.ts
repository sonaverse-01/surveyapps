import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';
const DB_NAMES = ['survey_app', 'survey_apps', 'survey2'];
const COLLECTION_NAMES = ['survey', 'surveys'];

async function checkDbs() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('Checking databases...');

        for (const dbName of DB_NAMES) {
            const db = client.db(dbName);
            for (const collName of COLLECTION_NAMES) {
                try {
                    const count = await db.collection(collName).countDocuments();
                    if (count > 0) {
                        console.log(`✅ ${dbName}.${collName}: ${count} documents`);
                    } else {
                        console.log(`- ${dbName}.${collName}: 0 documents`);
                    }
                } catch (e) {
                    console.log(`❌ ${dbName}.${collName}: Error accessing`);
                }
            }
        }
    } finally {
        await client.close();
    }
}

checkDbs();
