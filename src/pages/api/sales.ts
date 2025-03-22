import { NextApiRequest, NextApiResponse } from 'next';

interface QuantityInfo {
  qty: number;
  packingMaterialId: ObjectId;
  price: number;
}
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface Product {
  productId: ObjectId;
  type: string;
  name: string;
  qty: number;
  nos: number;
  isPackagingMaterialUsed: boolean;
  totalPrice: number;
  discount: number;
  finalPrice: number;
  packingMaterialId: ObjectId | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let session;
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    session = client.startSession();

    switch (req.method) {
      case 'GET':
        const sales = await db.collection('sales').find({}).toArray();
        res.status(200).json(sales);
        break;

      case 'POST':
        await session.withTransaction(async () => {
          const saleData = req.body;
          
          if (!saleData.customerName || !saleData.products || !saleData.totalAmount) {
            return res.status(400).json({ error: 'Required fields missing' });
          }

          // Process products before inserting
          const processedProducts = await Promise.all(saleData.products.map(async (product: any) => {
            const productDoc = await db.collection('products').findOne({
              _id: new ObjectId(product.productId)
            });

            if (!productDoc) {
              throw new Error(`Product not found: ${product.productId}`);
            }

            // Validate quantity info matches with product
            const quantityInfo = productDoc.quantities.find(
              (q: QuantityInfo) => 
                q.qty === product.qty && 
                q.packingMaterialId.toString() === product.packingMaterialId
            );

            if (!quantityInfo) {
              throw new Error(`Invalid quantity configuration for product: ${product.name}`);
            }

            return {
              ...product,
              productId: new ObjectId(product.productId),
              packingMaterialId: product.packingMaterialId ? new ObjectId(product.packingMaterialId) : null,
              qty: Number(product.qty),
              nos: Number(product.nos),
              totalPrice: Number(product.totalPrice),
              discount: Number(product.discount || 0),
              finalPrice: Number(product.finalPrice)
            };
          }));

          const newSale = {
            date: new Date(saleData.date || Date.now()),
            customerName: saleData.customerName,
            customerMobile: saleData.customerMobile || '',
            customerAddress: saleData.customerAddress || '',
            saleType: saleData.saleType,
            courierPrice: Number(saleData.courierPrice || 0),
            products: processedProducts,
            totalAmount: Number(saleData.totalAmount),
            payments: saleData.onlineAmount > 0 || saleData.cashAmount > 0 ? [
              ...(saleData.onlineAmount > 0 ? [{
                _id: new ObjectId(),
                method: 'online',
                amount: Number(saleData.onlineAmount),
                date: new Date(saleData.date || Date.now())
              }] : []),
              ...(saleData.cashAmount > 0 ? [{
                _id: new ObjectId(),
                method: 'cash',
                amount: Number(saleData.cashAmount),
                date: new Date(saleData.date || Date.now())
              }] : [])
            ] : [],
            remainingAmount: Number(saleData.remainingAmount),
            status: Number(saleData.remainingAmount) > 0 ? 'pending' : 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const saleResult = await db.collection('sales').insertOne(newSale);

          const saleDateMidnight = new Date(newSale.date);
          saleDateMidnight.setHours(0, 0, 0, 0);
          
          const rawMaterialUsage: any[] = [];
          const packingMaterialUsage: any[] = [];
          const oilSales: any[] = [];
          
          for (const product of processedProducts) {
            const productDoc = await db.collection('products').findOne({
              _id: product.productId
            });

            if (productDoc) {
              const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
              await db.collection('rawmaterials').updateOne(
                { _id: productDoc.rawMaterialId },
                { $inc: { currentStock: -rawMaterialUsed } }
              );

              if (product.isPackagingMaterialUsed && product.packingMaterialId) {
                await db.collection('packingmaterials').updateOne(
                  { _id: product.packingMaterialId },
                  { $inc: { currentStock: -product.nos } }
                );
              }

              if (productDoc.type === 'oil') {
                oilSales.push({
                  productId: product.productId,
                  productName: product.name,
                  quantity: product.qty * product.nos,
                  amount: product.finalPrice,
                  packingMaterialId: product.packingMaterialId
                });
              }

              if (product.isPackagingMaterialUsed && product.packingMaterialId) {
                const packingMaterial = await db.collection('packingmaterials').findOne({
                  _id: product.packingMaterialId
                });

                if (packingMaterial) {
                  packingMaterialUsage.push({
                    materialId: product.packingMaterialId,
                    materialName: packingMaterial.name,
                    quantity: product.nos,
                    price: 0
                  });
                }
              }

              const rawMaterial = await db.collection('rawmaterials').findOne({
                _id: productDoc.rawMaterialId
              });
              
              if (rawMaterial) {
                rawMaterialUsage.push({
                  materialId: productDoc.rawMaterialId,
                  materialName: rawMaterial.name,
                  quantity: rawMaterialUsed,
                  price: 0
                });
              }
            }
          }
          
          await db.collection('dailysummary').updateOne(
            { date: saleDateMidnight },
            {
              $inc: {
                totalSales: newSale.totalAmount,
                pendingAmount: newSale.remainingAmount,
                onlineAmount: saleData.onlineAmount || 0,
                cashAmount: saleData.cashAmount || 0
              },
              $push: {
                rawMaterialUsage: { $each: rawMaterialUsage as any[] },
                packingMaterialUsage: { $each: packingMaterialUsage as any[] },
                oilSales: { $each: oilSales as any[] }
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );

          res.status(201).json({ success: true, saleId: saleResult.insertedId });
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request', details: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    session?.endSession();
  }
}
