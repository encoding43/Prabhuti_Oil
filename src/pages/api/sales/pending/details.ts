import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { id } = req.query;

    const bill = await db.collection('sales').aggregate([
      { 
        $match: { _id: new ObjectId(id as string) }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'p',
              in: {
                $mergeObjects: [
                  '$$p',
                  { 
                    finalPrice: { $subtract: ['$$p.totalPrice', { $ifNull: ['$$p.discount', 0] }] }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          payments: {
            $ifNull: ['$payments', []]
          }
        }
      },
      {
        $sort: { 'payments.date': -1 }
      }
    ]).next();

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.status(200).json(bill);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
