import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';

async function testConnection() {
    console.log('Testing MongoDB connection...');
    console.log('URI:', MONGODB_URI);

    try {
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        await client.connect();
        console.log('✅ Successfully connected to MongoDB!');

        const db = client.db('survey_apps');
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        await client.close();
    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
}

testConnection();
