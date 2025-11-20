import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const { msg } = req.query;
    res.json({ message: msg, timestamp: Date.now() });
}
