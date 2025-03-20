import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const collection = db.collection('rawmaterialtransactions');

    switch (req.method) {
      case 'GET':
        // Add date range filtering
        const { startDate, endDate, materialId, type } = req.query;
        let query: any = {};
        
        // Add date range filter if provided
        if (startDate && endDate) {
          query.date = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
          };
        }
        
        // Add material filter if provided
        if (materialId) {
          query.materialId = new ObjectId(materialId as string);
        }
        
        // Add type filter if provided
        if (type) {
          query.type = type;
        }
        
        const transactions = await collection.find(query).sort({ date: -1 }).toArray();
        res.status(200).json(transactions);
        break;

      case 'POST':
        const { materialId: postMaterialId, type: postType = 'add', quantity, price = 0, date, note } = req.body;
        
        if (!postMaterialId || quantity === undefined || !date) {
          return res.status(400).json({ error: 'Required fields missing' });
        }

        // Convert materialId to ObjectId
        let materialObjectId;
        try {
          materialObjectId = new ObjectId(postMaterialId);
        } catch (error) {
          return res.status(400).json({ error: 'Invalid material ID format' });
        }

        // Use the quantity directly as provided in the request
        // Don't reapply any add/subtract logic here since the frontend is already handling it
        const quantityToUse = Number(quantity);
        
        const newTransaction = {
          materialId: materialObjectId,
          type: postType,
          quantity: quantityToUse,
          price: Number(price),
          date: new Date(date),
          note,
          createdAt: new Date()
        };

        const result = await collection.insertOne(newTransaction);
        
        // Update raw material stock - use the quantity as is
        await db.collection('rawmaterials').updateOne(
          { _id: materialObjectId },
          { $inc: { currentStock: quantityToUse } }
        );

        res.status(201).json(result);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
