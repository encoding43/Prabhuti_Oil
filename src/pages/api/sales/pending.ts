import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');

    const pendingBills = await db.collection('sales')
      .find({ 
        status: 'pending',
        remainingAmount: { $gt: 0 }
      })
      .project({
        date: 1,
        customerName: 1,
        customerMobile: 1,
        customerAddress: 1,
        products: 1,
        totalAmount: 1,
        remainingAmount: 1,
        payments: {
          $ifNull: ['$payments', []]
        }
      })
      .sort({ date: -1 })
      .toArray();

    // Ensure all required fields are present
    const formattedBills = pendingBills.map(bill => ({
      ...bill,
      payments: bill.payments || [],
      products: (bill.products || []).map((product: any) => ({
        ...product,
        price: product.price || 0,
        quantity: product.quantity || 0
      }))
    }));

    res.status(200).json(formattedBills);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
