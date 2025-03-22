import { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('prabhutioil')

    switch (req.method) {
      case 'GET':
        // Get all products with raw material names joined
        const products = await db.collection('products').aggregate([
          {
            $lookup: {
              from: 'rawmaterials',
              localField: 'rawMaterialId',
              foreignField: '_id',
              as: 'rawMaterial'
            }
          },
          {
            $unwind: {
              path: '$rawMaterial',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $addFields: {
              rawMaterialName: '$rawMaterial.name'
            }
          }
        ]).toArray()
        
        res.status(200).json(products)
        break

      case 'POST':
        try {
          const { type, name, rawMaterialId, recoveryRate, quantities } = req.body;

          // Validation
          if (!type || !name || !rawMaterialId) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          // Validate unique packing material combinations
          const uniquePackaging = new Set();
          for (const q of quantities) {
            const key = `${q.qty}-${q.packingMaterialId}`;
            if (uniquePackaging.has(key)) {
              return res.status(400).json({ error: 'Duplicate quantity and packaging material combination' });
            }
            uniquePackaging.add(key);
          }

          // Get packing material details
          const packingMaterialIds = quantities.map(q => new ObjectId(q.packingMaterialId));
          const packingMaterials = await db.collection('packingmaterials')
            .find({ _id: { $in: packingMaterialIds } })
            .toArray();

          // Process quantities with packing material details
          const processedQuantities = quantities.map(q => {
            const packingMaterial = packingMaterials.find(p => p._id.toString() === q.packingMaterialId);
            return {
              qty: q.qty,
              price: q.price,
              packingMaterialId: new ObjectId(q.packingMaterialId),
              displayName: `${q.qty}ml - ${packingMaterial?.name || ''}`
            };
          });

          const newProduct = {
            type,
            name,
            rawMaterialId: new ObjectId(rawMaterialId),
            recoveryRate: parseInt(recoveryRate) || 100,
            quantities: processedQuantities,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const insertResult = await db.collection('products').insertOne(newProduct);
          res.status(201).json(insertResult);
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: 'Failed to create product' });
        }
        break

      case 'PUT':
        const { id, ...updateData } = req.body
        
        // Debug logging to help troubleshoot
        console.log('Update request for ID:', id);
        console.log('Update data:', updateData);

        try {
          // Process quantities if present
          if (updateData.quantities) {
            updateData.quantities = updateData.quantities.map((q: any) => ({
              ...q,
              packingMaterialId: q.packingMaterialId ? new ObjectId(q.packingMaterialId) : null
            }))
          }

          // Use updateOne instead of findOneAndUpdate for more reliable updates
          const result = await db.collection('products').updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                ...updateData,
                updatedAt: new Date()
              }
            }
          )
          
          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found' })
          }

          // Fetch the updated product to return
          const updatedProduct = await db.collection('products').findOne({ _id: new ObjectId(id) })
          
          res.status(200).json(updatedProduct)
        } catch (updateError: any) {
          console.error('Update error:', updateError);
          res.status(500).json({ error: 'Failed to update product', details: updateError.message });
        }
        break

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Database Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Error connecting to the database', details: errorMessage })
  }
}
