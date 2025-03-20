import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const collection = db.collection('packingmaterials');

    switch (req.method) {
      case 'GET':
        const materials = await collection.find({}).toArray();
        res.status(200).json(materials);
        break;

      case 'POST':
        const { name, type, capacity } = req.body;
        if (!name || !type || !capacity) {
          return res.status(400).json({ error: 'Name, type and capacity are required' });
        }

        // Always create material with currentStock of 0, let transactions handle stock updates
        const newMaterial = {
          name,
          type,
          capacity,
          currentStock: 0, // Always start with 0 stock regardless of what's sent in the request
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await collection.insertOne(newMaterial);
        res.status(201).json(result);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error connecting to the database' });
  }
}
