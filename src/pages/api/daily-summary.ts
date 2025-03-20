import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');

    switch (req.method) {
      case 'GET':
        const { date: queryDate, startDate, endDate } = req.query;
        
        let query = {};
        
        if (queryDate) {
          // Single date query
          query = { date: new Date(queryDate as string) };
        } else if (startDate && endDate) {
          // Date range query
          query = {
            date: {
              $gte: new Date(startDate as string),
              $lte: new Date(endDate as string)
            }
          };
        }
        
        const summaries = await db.collection('dailysummary')
          .find(query)
          .sort({ date: -1 })
          .toArray();
        
        res.status(200).json(summaries);
        break;

      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
