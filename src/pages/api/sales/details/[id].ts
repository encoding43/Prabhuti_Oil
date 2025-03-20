import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { id } = req.query;

    const sale = await db.collection('sales').aggregate([
      { 
        $match: { _id: new ObjectId(id as string) }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                $mergeObjects: [
                  '$$product',
                  {
                    details: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$productDetails',
                            cond: { $eq: ['$$this._id', '$$product.productId'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          },
          payments: {
            $sortArray: {
              input: '$payments',
              sortBy: { date: -1 }
            }
          }
        }
      }
    ]).next();

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.status(200).json(sale);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
