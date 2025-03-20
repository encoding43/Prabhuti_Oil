import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const collection = db.collection('miscincome');

    switch (req.method) {
      case 'GET':
        // Add filtering by date range if provided
        const { startDate, endDate } = req.query;
        let query = {};
        
        if (startDate && endDate) {
          query = {
            date: {
              $gte: new Date(startDate as string),
              $lte: new Date(endDate as string)
            }
          };
        }
        
        const incomes = await collection.find(query).sort({ date: -1 }).toArray();
        res.status(200).json(incomes);
        break;

      case 'POST':
        const newIncome = {
          ...req.body,
          date: new Date(req.body.date),
          amount: Number(req.body.amount),
          createdAt: new Date()
        };

        const result = await collection.insertOne(newIncome);
        res.status(201).json(result);
        break;

      case 'PUT':
        const { id, ...updateData } = req.body;
        const updated = await collection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { 
            $set: {
              ...updateData,
              date: new Date(updateData.date),
              amount: Number(updateData.amount),
              updatedAt: new Date()
            }
          },
          { returnDocument: 'after' }
        );
        res.status(200).json(updated);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        await collection.deleteOne({ _id: new ObjectId(deleteId as string) });
        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
