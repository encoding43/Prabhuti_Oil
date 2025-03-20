import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { id } = req.query;
    const { amount, method, date } = req.body;

    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Get current sale
        const sale = await db.collection('sales').findOne({
          _id: new ObjectId(id as string)
        });

        if (!sale) throw new Error('Sale not found');

        // Calculate new remaining amount
        const newRemainingAmount = sale.remainingAmount - Number(amount);
        const paymentDate = new Date(date);

        const newPayment = {
          _id: new ObjectId(),
          method: method,
          amount: Number(amount),
          date: new Date(date)
        };

        // Add new payment and update status
        const result = await db.collection('sales').findOneAndUpdate(
          { _id: new ObjectId(id as string) },
          {
            $push: { payments: newPayment },
            $set: {
              remainingAmount: newRemainingAmount,
              status: newRemainingAmount <= 0 ? 'completed' : 'pending',
              updatedAt: new Date()
            }
          },
          { returnDocument: 'after' }
        );

        // Get original sale date and set to midnight
        const originalSaleDate = new Date(sale.date);
        originalSaleDate.setHours(0, 0, 0, 0);

        // Update daily summary for the ORIGINAL SALE DATE
        await db.collection('dailysummary').updateOne(
          { 
            date: originalSaleDate
          },
          {
            $inc: {
              [`${method}Amount`]: Number(amount),
              pendingAmount: -Number(amount)
            }
          },
          { upsert: true }
        );

        res.status(200).json(result);
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
