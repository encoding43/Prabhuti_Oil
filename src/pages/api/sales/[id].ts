import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  switch (req.method) {
    case 'PUT':
      try {
        const client = await clientPromise;
        const db = client.db('prabhutioil');
        const updateData = req.body;
        
        // Start session for transaction
        const session = client.startSession();

        try {
          await session.withTransaction(async () => {
            // Get original sale
            const originalSale = await db.collection('sales').findOne({
              _id: new ObjectId(id as string)
            });

            if (!originalSale) throw new Error('Sale not found');

            // Format dates
            const saleDate = new Date(updateData.date);
            saleDate.setHours(0, 0, 0, 0);

            const originalDate = new Date(originalSale.date);
            originalDate.setHours(0, 0, 0, 0);

            // ===== MATERIAL HANDLING =====
            if (!updateData.skipMaterialUsageUpdate) {
              // STEP 1: Restore all original materials
              console.log('Restoring original materials');
              
              for (const product of originalSale.products) {
                const productDoc = await db.collection('products').findOne({
                  _id: new ObjectId(product.productId.toString())
                });

                if (productDoc) {
                  // Restore raw material stock
                  const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                  await db.collection('rawmaterials').updateOne(
                    { _id: productDoc.rawMaterialId },
                    { $inc: { currentStock: rawMaterialUsed } }
                  );
                  console.log(`Restored ${rawMaterialUsed} of raw material ${productDoc.rawMaterialId}`);

                  // Restore packing material stock
                  if (product.isPackagingMaterialUsed && product.packingMaterialId) {
                    await db.collection('packingmaterials').updateOne(
                      { _id: new ObjectId(product.packingMaterialId.toString()) },
                      { $inc: { currentStock: product.nos } }
                    );
                    console.log(`Restored ${product.nos} of packing material ${product.packingMaterialId}`);
                  }
                }
              }

              // STEP 2: Deduct new materials
              console.log('Deducting new materials');
              
              for (const product of updateData.products) {
                const productDoc = await db.collection('products').findOne({
                  _id: new ObjectId(product.productId.toString())
                });

                if (productDoc) {
                  // Deduct raw material stock
                  const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                  await db.collection('rawmaterials').updateOne(
                    { _id: productDoc.rawMaterialId },
                    { $inc: { currentStock: -rawMaterialUsed } }
                  );
                  console.log(`Deducted ${rawMaterialUsed} of raw material ${productDoc.rawMaterialId}`);

                  // Deduct packing material stock
                  if (product.isPackagingMaterialUsed && product.packingMaterialId) {
                    await db.collection('packingmaterials').updateOne(
                      { _id: new ObjectId(product.packingMaterialId.toString()) },
                      { $inc: { currentStock: -product.nos } }
                    );
                    console.log(`Deducted ${product.nos} of packing material ${product.packingMaterialId}`);
                  }
                }
              }
            }

            // ===== DAILY SUMMARY UPDATES =====
            
            // Helper function to prepare material adjustment entries
            const prepareMaterialAdjustments = async (products, isNegative = false) => {
              const rawMaterialAdjustments = [];
              const packingMaterialAdjustments = [];
              const oilSaleAdjustments = [];
              
              for (const product of products) {
                const productDoc = await db.collection('products').findOne({
                  _id: new ObjectId(product.productId.toString())
                });
                
                if (productDoc) {
                  // Handle raw material
                  const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                  const multiplier = isNegative ? -1 : 1;
                  
                  const rawMaterial = await db.collection('rawmaterials').findOne({
                    _id: productDoc.rawMaterialId
                  });
                  
                  rawMaterialAdjustments.push({
                    materialId: productDoc.rawMaterialId,
                    materialName: rawMaterial?.name || 'Unknown',
                    quantity: rawMaterialUsed * multiplier,
                    price: 0
                  });
                  
                  // Handle oil sales
                  if (productDoc.type === 'oil') {
                    oilSaleAdjustments.push({
                      productId: new ObjectId(product.productId.toString()),
                      productName: product.name,
                      quantity: (product.qty * product.nos) * multiplier,
                      amount: product.finalPrice * multiplier
                    });
                  }
                  
                  // Handle packing material
                  if (product.isPackagingMaterialUsed && product.packingMaterialId) {
                    const packingMaterial = await db.collection('packingmaterials').findOne({
                      _id: new ObjectId(product.packingMaterialId.toString())
                    });
                    
                    packingMaterialAdjustments.push({
                      materialId: new ObjectId(product.packingMaterialId.toString()),
                      materialName: packingMaterial?.name || 'Unknown',
                      quantity: product.nos * multiplier,
                      price: 0
                    });
                  }
                }
              }
              
              return {
                rawMaterialAdjustments,
                packingMaterialAdjustments,
                oilSaleAdjustments
              };
            };
            
            // If date has changed, handle both dates
            if (originalDate.getTime() !== saleDate.getTime()) {
              console.log('Dates differ, updating both dates');
              
              // For original date: remove the original usage
              const originalAdjustments = await prepareMaterialAdjustments(originalSale.products, true);
              
              // Update original date summary with negative adjustments
              await db.collection('dailysummary').updateOne(
                { date: originalDate },
                {
                  $inc: {
                    totalSales: -originalSale.totalAmount,
                    pendingAmount: -originalSale.remainingAmount
                  },
                  $push: {
                    rawMaterialUsage: { $each: originalAdjustments.rawMaterialAdjustments },
                    packingMaterialUsage: { $each: originalAdjustments.packingMaterialAdjustments },
                    oilSales: { $each: originalAdjustments.oilSaleAdjustments }
                  }
                }
              );
              
              // For new date: add the new usage
              if (!updateData.skipMaterialUsageUpdate) {
                const newAdjustments = await prepareMaterialAdjustments(updateData.products);
                
                // Update new date summary with positive adjustments
                await db.collection('dailysummary').updateOne(
                  { date: saleDate },
                  {
                    $inc: {
                      totalSales: updateData.totalAmount,
                      pendingAmount: updateData.remainingAmount
                    },
                    $push: {
                      rawMaterialUsage: { $each: newAdjustments.rawMaterialAdjustments },
                      packingMaterialUsage: { $each: newAdjustments.packingMaterialAdjustments },
                      oilSales: { $each: newAdjustments.oilSaleAdjustments }
                    },
                    $setOnInsert: { createdAt: new Date() }
                  },
                  { upsert: true }
                );
              } else {
                // Only update financials if skipping material updates
                await db.collection('dailysummary').updateOne(
                  { date: saleDate },
                  {
                    $inc: {
                      totalSales: updateData.totalAmount,
                      pendingAmount: updateData.remainingAmount
                    },
                    $setOnInsert: { createdAt: new Date() }
                  },
                  { upsert: true }
                );
              }
            } else {
              console.log('Same date, updating with adjustments');
              
              // Same date: adjust the differences
              if (!updateData.skipMaterialUsageUpdate) {
                // Get negative adjustments for original products
                const originalAdjustments = await prepareMaterialAdjustments(originalSale.products, true);
                
                // Get positive adjustments for new products
                const newAdjustments = await prepareMaterialAdjustments(updateData.products);
                
                // Update with both sets of adjustments
                await db.collection('dailysummary').updateOne(
                  { date: saleDate },
                  {
                    $inc: {
                      totalSales: updateData.totalAmount - originalSale.totalAmount,
                      pendingAmount: updateData.remainingAmount - originalSale.remainingAmount
                    },
                    $push: {
                      rawMaterialUsage: { 
                        $each: [
                          ...originalAdjustments.rawMaterialAdjustments,
                          ...newAdjustments.rawMaterialAdjustments
                        ]
                      },
                      packingMaterialUsage: { 
                        $each: [
                          ...originalAdjustments.packingMaterialAdjustments,
                          ...newAdjustments.packingMaterialAdjustments
                        ]
                      },
                      oilSales: { 
                        $each: [
                          ...originalAdjustments.oilSaleAdjustments,
                          ...newAdjustments.oilSaleAdjustments
                        ]
                      }
                    }
                  }
                );
              } else {
                // Just update financial data if skipping material updates
                await db.collection('dailysummary').updateOne(
                  { date: saleDate },
                  {
                    $inc: {
                      totalSales: updateData.totalAmount - originalSale.totalAmount,
                      pendingAmount: updateData.remainingAmount - originalSale.remainingAmount
                    }
                  }
                );
              }
            }

            // Clean up updateData before saving
            if (updateData._id) delete updateData._id;
            if (updateData.skipMaterialUsageUpdate) delete updateData.skipMaterialUsageUpdate;

            // Process products to ensure ObjectIds are correctly handled
            if (updateData.products) {
              updateData.products = updateData.products.map((product: any) => ({
                ...product,
                productId: new ObjectId(product.productId.toString()),
                packingMaterialId: product.packingMaterialId ? new ObjectId(product.packingMaterialId.toString()) : null
              }));
            }

            // Update sale record
            const result = await db.collection('sales').findOneAndUpdate(
              { _id: new ObjectId(id as string) },
              {
                $set: {
                  ...updateData,
                  updatedAt: new Date()
                }
              },
              { returnDocument: 'after' }
            );

            res.status(200).json(result);
          });
        } finally {
          await session.endSession();
        }
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update sale', message: error instanceof Error ? error.message : 'Unknown error' });
      }
      break;

    case 'DELETE':
      try {
        const client = await clientPromise;
        const db = client.db('prabhutioil');
        const session = client.startSession();

        try {
          await session.withTransaction(async () => {
            // Get sale details before deletion
            const sale = await db.collection('sales').findOne({ 
              _id: new ObjectId(id as string) 
            });

            if (!sale) {
              throw new Error('Sale not found');
            }

            // Get sale date and normalize to midnight
            const saleDate = new Date(sale.date);
            saleDate.setHours(0, 0, 0, 0);

            // Calculate payment amounts by method
            const paymentsByMethod = (sale.payments || []).reduce((acc: { [key: string]: number }, payment: { method: string, amount: number }) => {
              acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
              return acc;
            }, {});

            // Create adjustment entries for daily summary
            const rawMaterialAdjustments = [];
            const packingMaterialAdjustments = [];
            const oilSaleAdjustments = [];
            
            // Prepare negative adjustments and restore stock
            for (const product of sale.products) {
              // Get the product document first
              const productDoc = await db.collection('products').findOne({
                _id: new ObjectId(product.productId.toString())
              });

              if (productDoc) {
                // Handle raw material
                const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                
                // Restore raw material stock
                await db.collection('rawmaterials').updateOne(
                  { _id: productDoc.rawMaterialId },
                  { $inc: { currentStock: rawMaterialUsed } }
                );
                console.log(`Restored ${rawMaterialUsed} of raw material ${productDoc.rawMaterialId}`);
                
                // Create raw material adjustment
                const rawMaterial = await db.collection('rawmaterials').findOne({
                  _id: productDoc.rawMaterialId
                });
                
                rawMaterialAdjustments.push({
                  materialId: productDoc.rawMaterialId,
                  materialName: rawMaterial?.name || 'Unknown',
                  quantity: -rawMaterialUsed, // Negative to remove from usage
                  price: 0
                });
                
                // Handle oil sales adjustments
                if (productDoc.type === 'oil') {
                  oilSaleAdjustments.push({
                    productId: new ObjectId(product.productId.toString()),
                    productName: product.name,
                    quantity: -(product.qty * product.nos), // Negative to remove
                    amount: -product.finalPrice // Negative to remove
                  });
                }

                // Handle packing material
                if (product.isPackagingMaterialUsed && product.packingMaterialId) {
                  // Get the packing material for the adjustment entry
                  const packingMaterial = await db.collection('packingmaterials').findOne({
                    _id: new ObjectId(product.packingMaterialId.toString())
                  });
                  
                  // Restore stock
                  await db.collection('packingmaterials').updateOne(
                    { _id: new ObjectId(product.packingMaterialId.toString()) },
                    { $inc: { currentStock: product.nos } }
                  );
                  console.log(`Restored ${product.nos} of packing material ${product.packingMaterialId}`);
                  
                  // Create packing material adjustment
                  packingMaterialAdjustments.push({
                    materialId: new ObjectId(product.packingMaterialId.toString()),
                    materialName: packingMaterial?.name || 'Unknown',
                    quantity: -product.nos, // Negative to remove from usage
                    price: 0
                  });
                }
              }
            }
            
            // Update daily summary with all adjustments
            await db.collection('dailysummary').updateOne(
              { date: saleDate },
              {
                $inc: {
                  totalSales: -sale.totalAmount,
                  pendingAmount: -sale.remainingAmount,
                  onlineAmount: -(paymentsByMethod.online || 0),
                  cashAmount: -(paymentsByMethod.cash || 0)
                },
                $push: {
                  rawMaterialUsage: { $each: rawMaterialAdjustments },
                  packingMaterialUsage: { $each: packingMaterialAdjustments },
                  oilSales: { $each: oilSaleAdjustments }
                }
              }
            );

            // Delete the sale
            await db.collection('sales').deleteOne({ 
              _id: new ObjectId(id as string) 
            });

            res.status(200).json({ success: true });
          });
        } finally {
          await session.endSession();
        }
      } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Error processing request' });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
