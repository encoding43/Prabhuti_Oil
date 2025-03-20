import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { filter = 'all' } = req.query;

    let query = {};
    if (filter === 'completed') {
      query = { status: 'completed' };
    } else if (filter === 'pending') {
      query = { status: 'pending' };
    }

    const transactions = await db.collection('sales')
      .aggregate([
        { $match: query },
        {
          $project: {
            _id: 1,
            date: 1,
            customerName: 1,
            customerMobile: 1,
            customerAddress: 1,
            products: 1,
            totalAmount: 1,
            onlineAmount: { $ifNull: ['$onlineAmount', 0] },
            cashAmount: { $ifNull: ['$cashAmount', 0] },
            remainingAmount: 1,
            status: 1
          }
        },
        { $sort: { date: -1 } }
      ]).toArray();

    // Format the response data
    const formattedTransactions = transactions.map(t => ({
      ...t,
      onlineAmount: t.onlineAmount || 0,
      cashAmount: t.cashAmount || 0,
      remainingAmount: t.remainingAmount || 0,
      status: t.status || 'pending'
    }));

    res.status(200).json(formattedTransactions);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
