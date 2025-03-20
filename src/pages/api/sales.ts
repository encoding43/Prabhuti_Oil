import { NextApiRequest, NextApiResponse } from 'next';

interface QuantityInfo {
  qty: number;
  packingMaterialId?: ObjectId;
}
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

          // Initial payments array
          const initialPayments = [];
          if (saleData.onlineAmount > 0) {
            initialPayments.push({
              _id: new ObjectId(),
              method: 'online',
              amount: Number(saleData.onlineAmount),
              date: new Date(saleData.date || Date.now()) // Use sale date for payment
            });
          }
          if (saleData.cashAmount > 0) {
            initialPayments.push({
              _id: new ObjectId(),
              method: 'cash',
              amount: Number(saleData.cashAmount),
              date: new Date(saleData.date || Date.now()) // Use sale date for payment
            });
          }

          // Use the sale date from request or default to now
          const saleDate = new Date(saleData.date || Date.now());
          
          // Create sale record with structured data
          interface Product {
            productId: ObjectId;
            type: string;
            name: string;
            qty: number;
            nos: number;
            isPackagingMaterialUsed: boolean;
            totalPrice: number;
            discount?: number;
            finalPrice: number;
          }

          interface Payment {
            _id: ObjectId;
            method: string;
            amount: number;
            date: Date;
          }

          interface Sale {
            date: Date;
            customerName: string;
            customerMobile?: string;
            customerAddress?: string;
            saleType: string;
            courierPrice?: number;
            products: Product[];
            totalAmount: number;
            payments: Payment[];
            remainingAmount: number;
            status: string;
            createdAt: Date;
            updatedAt: Date;
          }

          const newSale: Sale = {
            date: saleDate,
            customerName: saleData.customerName,
            customerMobile: saleData.customerMobile || '',
            customerAddress: saleData.customerAddress || '',
            saleType: saleData.saleType,
            courierPrice: saleData.courierPrice || 0,
            products: saleData.products.map((product: any) => ({
              productId: new ObjectId(product.productId),
              type: product.type,
              name: product.name,
              qty: product.qty,
              nos: product.nos,
              isPackagingMaterialUsed: product.isPackagingMaterialUsed,
              totalPrice: product.totalPrice,
              discount: product.discount || 0,
              finalPrice: product.finalPrice
            })),
            totalAmount: saleData.totalAmount,
            payments: initialPayments,
            remainingAmount: saleData.remainingAmount,
            status: saleData.remainingAmount > 0 ? 'pending' : 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          const saleResult = await db.collection('sales').insertOne(newSale);

          // Use the sale date instead of today's date
          const saleDateMidnight = new Date(saleDate);
          saleDateMidnight.setHours(0, 0, 0, 0);
          
          // Track raw material usage and oil sales for daily summary
          const rawMaterialUsage: any[] = [];
          const packingMaterialUsage: any[] = [];
          const oilSales: any[] = [];
          
          // Process each product
          for (const product of saleData.products) {
            // Get product details
            const productDoc = await db.collection('products').findOne({
              _id: new ObjectId(product.productId)
            });

            if (!productDoc) continue;

            // Track oil sales for daily summary
            if (productDoc.type === 'oil') {
              oilSales.push({
                productId: new ObjectId(product.productId),
                productName: product.name,
                quantity: product.qty * product.nos,
                amount: product.finalPrice
              });
            }

            // Update packing material if used
            if (product.isPackagingMaterialUsed) {
              const quantityInfo = productDoc.quantities.find((q: any) => q.qty === product.qty);
              if (quantityInfo?.packingMaterialId) {
                // Update packing material stock
                await db.collection('packingmaterials').updateOne(
                  { _id: quantityInfo.packingMaterialId },
                  { $inc: { currentStock: -product.nos } }
                );
                
                // Get packing material details for daily summary
                const packingMaterial = await db.collection('packingmaterials').findOne({
                  _id: quantityInfo.packingMaterialId
                });
                
                if (packingMaterial) {
                  packingMaterialUsage.push({
                    materialId: quantityInfo.packingMaterialId,
                    materialName: packingMaterial.name,
                    quantity: product.nos,
                    price: 0 // We don't track individual prices here
                  });
                }
              }
            }

            // Calculate and update raw material
            const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
            
            // Update raw material stock
            await db.collection('rawmaterials').updateOne(
              { _id: productDoc.rawMaterialId },
              { $inc: { currentStock: -rawMaterialUsed } }
            );
            
            // Get raw material details for daily summary
            const rawMaterial = await db.collection('rawmaterials').findOne({
              _id: productDoc.rawMaterialId
            });
            
            if (rawMaterial) {
              // Add to raw material usage tracking
              rawMaterialUsage.push({
                materialId: productDoc.rawMaterialId,
                materialName: rawMaterial.name,
                quantity: rawMaterialUsed,
                price: 0 // We don't track individual prices here
              });
            }
          }
          
          // Update daily summary with all the collected data
          await db.collection('dailysummary').updateOne(
            { date: saleDateMidnight },
            {
              $inc: {
                totalSales: saleData.totalAmount,
                pendingAmount: saleData.remainingAmount,
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
        });

        res.status(201).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  } finally {
    session?.endSession();
  }
}
