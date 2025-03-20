import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const collection = db.collection('rawmaterials');

    switch (req.method) {
      case 'GET':
        const materials = await collection.find({}).toArray();
        res.status(200).json(materials);
        break;

      case 'POST':
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        // Always create material with currentStock of 0, let transactions handle stock updates
        const newMaterial = {
          name,
          currentStock: 0, // Always start with 0 stock regardless of what's sent in the request
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await collection.insertOne(newMaterial);
        res.status(201).json(result);
        break;

      case 'PUT':
        const { id, ...updateData } = req.body;
        const updated = await collection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { ...updateData, updatedAt: new Date() } },
          { returnDocument: 'after' }
        );
        res.status(200).json(updated);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error connecting to the database' });
  }
}
