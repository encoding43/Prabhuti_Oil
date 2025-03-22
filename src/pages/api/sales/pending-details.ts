import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ID provided' });
    }

    const bill = await db.collection('sales').aggregate([
      { 
        $match: { _id: new ObjectId(id) }
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
        $lookup: {
          from: 'packingmaterials',
          localField: 'products.packingMaterialId',
          foreignField: '_id',
          as: 'packingMaterialDetails'
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
                            cond: { $eq: ['$$this._id', { $toObjectId: '$$product.productId' }] }
                          }
                        },
                        0
                      ]
                    },
                    packingMaterial: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$packingMaterialDetails',
                            cond: { $eq: ['$$this._id', { $toObjectId: '$$product.packingMaterialId' }] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]).next();

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Format the response data to include display names
    const formattedBill = {
      ...bill,
      products: bill.products.map((product: any) => ({
        ...product,
        displayName: `${product.qty}ml - ${product.packingMaterial?.name || ''}`,
        name: product.name,
        qty: product.qty || 0,
        nos: product.nos || 0,
        totalPrice: product.totalPrice || 0,
        discount: product.discount || 0,
        finalPrice: product.finalPrice || product.totalPrice || 0
      })),
      totalAmount: bill.totalAmount,
      courierPrice: bill.courierPrice || 0,
      remainingAmount: bill.remainingAmount || 0,
      payments: (bill.payments || []).map((payment: any) => ({
        method: payment.method,
        amount: payment.amount,
        date: payment.date
      }))
    };

    res.status(200).json(formattedBill);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
