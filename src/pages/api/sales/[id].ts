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

        const session = client.startSession();

        try {
          await session.withTransaction(async () => {
            // Get original sale
            const originalSale = await db.collection('sales').findOne({
              _id: new ObjectId(id as string)
            });

            if (!originalSale) {
              throw new Error('Sale not found');
            }

            // Get original and new sale dates (normalized to midnight)
            const originalSaleDate = new Date(originalSale.date);
            originalSaleDate.setHours(0, 0, 0, 0);
            
            const newSaleDate = new Date(updateData.date);
            newSaleDate.setHours(0, 0, 0, 0);

            // Check if we should skip material usage updates
            const skipMaterialUsageUpdate = updateData.skipMaterialUsageUpdate === true;
            
            // Remove the flag from the data before saving to database
            if (updateData.skipMaterialUsageUpdate !== undefined) {
              delete updateData.skipMaterialUsageUpdate;
            }

            // Always perform material updates unless explicitly skipped
            if (!skipMaterialUsageUpdate) {
              // First: Restore original stock for all original products
              // This ensures we have a clean slate to work with
              for (const product of originalSale.products) {
                const productDoc = await db.collection('products').findOne({
                  _id: new ObjectId(product.productId)
                });

                if (productDoc) {
                  // Calculate and restore raw material
                  const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                  await db.collection('rawmaterials').updateOne(
                    { _id: productDoc.rawMaterialId },
                    { $inc: { currentStock: rawMaterialUsed } }
                  );

                  // Restore packing material
                  if (product.isPackagingMaterialUsed) {
                    const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                    if (quantityInfo?.packingMaterialId) {
                      await db.collection('packingmaterials').updateOne(
                        { _id: quantityInfo.packingMaterialId },
                        { $inc: { currentStock: product.nos } }
                      );
                    }
                  }
                }
              }

              // Second: Process all updated products to deduct new usage amounts
              for (const product of updateData.products) {
                const productDoc = await db.collection('products').findOne({
                  _id: new ObjectId(product.productId)
                });

                if (productDoc) {
                  // Calculate and deduct new raw material usage
                  const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                  await db.collection('rawmaterials').updateOne(
                    { _id: productDoc.rawMaterialId },
                    { $inc: { currentStock: -rawMaterialUsed } }
                  );

                  // Update packing material stock
                  if (product.isPackagingMaterialUsed) {
                    const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                    if (quantityInfo?.packingMaterialId) {
                      await db.collection('packingmaterials').updateOne(
                        { _id: quantityInfo.packingMaterialId },
                        { $inc: { currentStock: -product.nos } }
                      );
                    }
                  }
                }
              }
            }

            // Calculate payment amounts by method
            const calculatePaymentsByMethod = (payments: { method: string, amount: number }[]) => {
              return payments.reduce((acc: { [key: string]: number }, payment) => {
                acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
                return acc;
              }, {});
            };
            
            const originalPayments = calculatePaymentsByMethod(originalSale.payments || []);
            const newPayments = calculatePaymentsByMethod(updateData.payments || []);
            
            // Prepare usage data for daily summary
            let rawMaterialUsage: any[] = [];
            let packingMaterialUsage: any[] = [];
            let oilSales: any[] = [];

            // Always generate material usage data even if skipping updates
            // This ensures we have accurate material data for daily summary
            // if date has changed or for edit operations that affect dailysummary
            for (const product of updateData.products) {
              const productDoc = await db.collection('products').findOne({
                _id: new ObjectId(product.productId)
              });

              if (productDoc) {
                // Track oil sales
                if (productDoc.type === 'oil') {
                  oilSales.push({
                    productId: new ObjectId(product.productId),
                    productName: product.name,
                    quantity: product.qty * product.nos,
                    amount: product.finalPrice
                  });
                }

                // Track raw material usage
                const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
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

                // Track packing material usage
                if (product.isPackagingMaterialUsed) {
                  const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                  if (quantityInfo?.packingMaterialId) {
                    const packingMaterial = await db.collection('packingmaterials').findOne({
                      _id: quantityInfo.packingMaterialId
                    });
                    
                    if (packingMaterial) {
                      packingMaterialUsage.push({
                        materialId: quantityInfo.packingMaterialId,
                        materialName: packingMaterial.name,
                        quantity: product.nos,
                        price: 0
                      });
                    }
                  }
                }
              }
            }

            // Calculate original usage for adjustment
            const originalRawMaterialUsage = [];
            const originalPackingMaterialUsage = [];
            const originalOilSales = [];
            
            for (const product of originalSale.products) {
              const productDoc = await db.collection('products').findOne({
                _id: new ObjectId(product.productId)
              });
              
              if (productDoc) {
                // Track oil sales for original
                if (productDoc.type === 'oil') {
                  originalOilSales.push({
                    productId: new ObjectId(product.productId),
                    productName: product.name,
                    quantity: -(product.qty * product.nos), // Negative to subtract
                    amount: -product.finalPrice // Negative to subtract
                  });
                }
                
                // Track raw material usage for original
                const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                originalRawMaterialUsage.push({
                  materialId: productDoc.rawMaterialId,
                  materialName: productDoc.rawMaterialName || 'Unknown',
                  quantity: -rawMaterialUsed, // Negative to subtract
                  price: 0
                });
                
                // Track packing material usage for original
                if (product.isPackagingMaterialUsed) {
                  const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                  if (quantityInfo?.packingMaterialId) {
                    originalPackingMaterialUsage.push({
                      materialId: quantityInfo.packingMaterialId,
                      materialName: 'Unknown',
                      quantity: -product.nos, // Negative to subtract
                      price: 0
                    });
                  }
                }
              }
            }
            
            // If date has changed, handle updating two different daily summaries
            if (originalSaleDate.getTime() !== newSaleDate.getTime()) {
              // For original date's summary: remove sales amounts AND adjust material usage counters
              // We need to subtract the original material usage from the original date
              const originalRawMaterialUsage = [];
              const originalPackingMaterialUsage = [];
              const originalOilSales = [];
              
              // Calculate original material usage to subtract from the original date
              for (const product of originalSale.products) {
                const productDoc = await db.collection('products').findOne({
                  _id: new ObjectId(product.productId)
                });
                
                if (productDoc) {
                  // Track oil sales for original date
                  if (productDoc.type === 'oil') {
                    originalOilSales.push({
                      productId: new ObjectId(product.productId),
                      productName: product.name,
                      quantity: -(product.qty * product.nos), // Negative to subtract
                      amount: -product.finalPrice // Negative to subtract
                    });
                  }
                  
                  // Track raw material usage for original date
                  const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                  originalRawMaterialUsage.push({
                    materialId: productDoc.rawMaterialId,
                    materialName: 'Unknown', // Not needed for adjustment
                    quantity: -rawMaterialUsed, // Negative to subtract
                    price: 0
                  });
                  
                  // Track packing material usage for original date
                  if (product.isPackagingMaterialUsed) {
                    const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                    if (quantityInfo?.packingMaterialId) {
                      originalPackingMaterialUsage.push({
                        materialId: quantityInfo.packingMaterialId,
                        materialName: 'Unknown', // Not needed for adjustment
                        quantity: -product.nos, // Negative to subtract
                        price: 0
                      });
                    }
                  }
                }
              }
              
              // Remove financial impact from original date
              await db.collection('dailysummary').updateOne(
                { date: originalSaleDate },
                {
                  $inc: {
                    totalSales: -originalSale.totalAmount,
                    pendingAmount: -originalSale.remainingAmount,
                    onlineAmount: -(originalPayments.online || 0),
                    cashAmount: -(originalPayments.cash || 0)
                  },
                  $push: {
                    // Add adjustment entries to counter the original usage
                    rawMaterialUsage: { $each: originalRawMaterialUsage },
                    packingMaterialUsage: { $each: originalPackingMaterialUsage },
                    oilSales: { $each: originalOilSales }
                  }
                }
              );
              
              // For new date: add new material usage - only if not skipping updates
              const dailySummaryUpdate: any = {
                $inc: {
                  totalSales: updateData.totalAmount,
                  pendingAmount: updateData.remainingAmount,
                  onlineAmount: newPayments.online || 0,
                  cashAmount: newPayments.cash || 0
                },
                $setOnInsert: {
                  createdAt: new Date()
                }
              };
              
              // Only add new material usage if not skipping updates
              if (!skipMaterialUsageUpdate && rawMaterialUsage.length > 0) {
                dailySummaryUpdate.$push = {
                  rawMaterialUsage: { $each: rawMaterialUsage },
                  packingMaterialUsage: { $each: packingMaterialUsage },
                  oilSales: { $each: oilSales }
                };
              }
              
              await db.collection('dailysummary').updateOne(
                { date: newSaleDate },
                dailySummaryUpdate,
                { upsert: true }
              );
            } else {
              // If date is unchanged, just update the financial amounts
              // Also add material usage adjustment entries if needed
              
              if (!skipMaterialUsageUpdate) {
                // We need to create negative adjustment entries for the original material usage
                const originalRawMaterialUsage = [];
                const originalPackingMaterialUsage = [];
                const originalOilSales = [];
                
                // Calculate original material usage to subtract
                for (const product of originalSale.products) {
                  const productDoc = await db.collection('products').findOne({
                    _id: new ObjectId(product.productId)
                  });
                  
                  if (productDoc) {
                    // Track oil sales 
                    if (productDoc.type === 'oil') {
                      originalOilSales.push({
                        productId: new ObjectId(product.productId),
                        productName: product.name,
                        quantity: -(product.qty * product.nos), // Negative to subtract
                        amount: -product.finalPrice // Negative to subtract
                      });
                    }
                    
                    // Track raw material usage
                    const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                    originalRawMaterialUsage.push({
                      materialId: productDoc.rawMaterialId,
                      materialName: 'Unknown', // Not needed for adjustment
                      quantity: -rawMaterialUsed, // Negative to subtract
                      price: 0
                    });
                    
                    // Track packing material usage
                    if (product.isPackagingMaterialUsed) {
                      const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                      if (quantityInfo?.packingMaterialId) {
                        originalPackingMaterialUsage.push({
                          materialId: quantityInfo.packingMaterialId,
                          materialName: 'Unknown', // Not needed for adjustment
                          quantity: -product.nos, // Negative to subtract
                          price: 0
                        });
                      }
                    }
                  }
                }
                
                // Update with adjustments for same date
                await db.collection('dailysummary').updateOne(
                  { date: newSaleDate },
                  {
                    $inc: {
                      totalSales: updateData.totalAmount - originalSale.totalAmount,
                      pendingAmount: updateData.remainingAmount - originalSale.remainingAmount,
                      onlineAmount: (newPayments.online || 0) - (originalPayments.online || 0),
                      cashAmount: (newPayments.cash || 0) - (originalPayments.cash || 0)
                    },
                    $push: {
                      // First add negative adjustments to counter original usage
                      rawMaterialUsage: { 
                        $each: [
                          ...originalRawMaterialUsage,  // Negative adjustments
                          ...rawMaterialUsage           // New positive entries
                        ] 
                      },
                      packingMaterialUsage: { 
                        $each: [
                          ...originalPackingMaterialUsage,  // Negative adjustments
                          ...packingMaterialUsage           // New positive entries
                        ] 
                      },
                      oilSales: { 
                        $each: [
                          ...originalOilSales,  // Negative adjustments
                          ...oilSales           // New positive entries
                        ] 
                      }
                    }
                  }
                );
              } else {
                // If skipping material updates, just update financial amounts
                await db.collection('dailysummary').updateOne(
                  { date: newSaleDate },
                  {
                    $inc: {
                      totalSales: updateData.totalAmount - originalSale.totalAmount,
                      pendingAmount: updateData.remainingAmount - originalSale.remainingAmount,
                      onlineAmount: (newPayments.online || 0) - (originalPayments.online || 0),
                      cashAmount: (newPayments.cash || 0) - (originalPayments.cash || 0)
                    }
                  }
                );
              }
            }

            const { _id, ...updateDataWithoutId } = updateData;

            const finalUpdateData = {
              ...updateDataWithoutId,
              // Don't override payments unless they were explicitly provided
              payments: updateData.payments || originalSale.payments || []
            };

            // Update sale record
            const result = await db.collection('sales').findOneAndUpdate(
              { _id: new ObjectId(id as string) },
              {
                $set: {
                  ...finalUpdateData,
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
        res.status(500).json({ error: 'Failed to update sale' });
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

            // Restore materials stock
            for (const product of sale.products) {
              const productDoc = await db.collection('products').findOne({
                _id: new ObjectId(product.productId)
              });

              if (productDoc) {
                const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                
                // Restore raw material stock
                await db.collection('rawmaterials').updateOne(
                  { _id: productDoc.rawMaterialId },
                  { $inc: { currentStock: rawMaterialUsed } }
                );

                // Restore packing material stock
                if (product.isPackagingMaterialUsed) {
                  const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                  if (quantityInfo?.packingMaterialId) {
                    await db.collection('packingmaterials').updateOne(
                      { _id: quantityInfo.packingMaterialId },
                      { $inc: { currentStock: product.nos } }
                    );
                  }
                }
              }
            }

            // Create adjustment entries for material usage in daily summary
            const materialUsageAdjustments = [];
            const packingMaterialAdjustments = [];
            const oilSaleAdjustments = [];
            
            // Calculate negative adjustments for all materials used in this sale
            for (const product of sale.products) {
              const productDoc = await db.collection('products').findOne({
                _id: new ObjectId(product.productId)
              });
              
              if (productDoc) {
                // Generate negative oil sales adjustments
                if (productDoc.type === 'oil') {
                  oilSaleAdjustments.push({
                    productId: new ObjectId(product.productId),
                    productName: product.name,
                    quantity: -(product.qty * product.nos), // Negative to remove
                    amount: -product.finalPrice // Negative to remove
                  });
                }
                
                // Generate negative raw material adjustments
                const rawMaterialUsed = ((product.qty/1000) * product.nos) / (productDoc.recoveryRate / 100);
                materialUsageAdjustments.push({
                  materialId: productDoc.rawMaterialId,
                  materialName: 'Adjustment', // Not important for deletion
                  quantity: -rawMaterialUsed, // Negative to remove
                  price: 0
                });
                
                // Generate negative packing material adjustments
                if (product.isPackagingMaterialUsed) {
                  const quantityInfo = productDoc.quantities.find((q: { qty: number }) => q.qty === product.qty);
                  if (quantityInfo?.packingMaterialId) {
                    packingMaterialAdjustments.push({
                      materialId: quantityInfo.packingMaterialId,
                      materialName: 'Adjustment', // Not important for deletion
                      quantity: -product.nos, // Negative to remove
                      price: 0
                    });
                  }
                }
              }
            }
            
            // Remove financial impact AND add adjustment entries for material usage
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
                  // Add adjustment entries to counter the material usage
                  rawMaterialUsage: { $each: materialUsageAdjustments },
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
