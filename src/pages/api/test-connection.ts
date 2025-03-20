import { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('prabhutioil')
    
    // Test database connection by getting collections
    const collections = await db.listCollections().toArray()
    
    res.status(200).json({ 
      status: 'success',
      message: 'Connected to MongoDB successfully!',
      collections: collections.map(col => col.name)
    })
  } catch (error) {
    console.error('Database connection error:', error)
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
