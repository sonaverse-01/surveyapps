import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const uri = process.env.MONGODB_URI;

    const status = {
        env: {
            NODE_ENV: process.env.NODE_ENV,
            hasMongoUri: !!uri,
            mongoUriLength: uri ? uri.length : 0,
            // 보안을 위해 URI의 일부만 표시
            mongoUriPreview: uri ? `${uri.substring(0, 15)}...` : 'undefined'
        },
        connection: {
            status: 'checking',
            error: null as any
        }
    };

    if (!uri) {
        return res.json(status);
    }

    try {
        const client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });

        await client.connect();
        status.connection.status = 'connected';

        const db = client.db('survey_apps');
        const collections = await db.listCollections().toArray();
        (status.connection as any).collections = collections.map(c => c.name);

        await client.close();
    } catch (error: any) {
        status.connection.status = 'failed';
        status.connection.error = {
            message: error.message,
            name: error.name,
            code: error.code
        };
    }

    res.json(status);
}
