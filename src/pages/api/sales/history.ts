// import { NextApiRequest, NextApiResponse } from 'next';
// import clientPromise from '@/lib/mongodb';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     const client = await clientPromise;
//     const db = client.db('prabhutioil');
//     const { groupBy = 'day', startDate, endDate } = req.query;

//     let dateMatch = {};
//     if (startDate && endDate) {
//       dateMatch = {
//         date: {
//           $gte: new Date(startDate as string),
//           $lte: new Date(endDate as string)
//         }
//       };
//     }

//     // Modified pipeline to use the sale date (not payment date) for calculations
//     let pipeline = [
//       { $match: dateMatch },
//       {
//         $addFields: {
//           // Ensure date field is a Date object before using dateToString
//           dateObj: { 
//             $cond: {
//               if: { $eq: [{ $type: '$date' }, 'string'] },
//               then: { $dateFromString: { dateString: '$date' } },
//               else: '$date'
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           date: 1,
//           totalAmount: 1,
//           remainingAmount: 1,
//           dateForGrouping: {
//             $dateToString: { 
//               format: groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'month' ? '%Y-%m' : '%Y', 
//               date: '$date' 
//             }
//           },
//           payments: {
//             $map: {
//               input: { $ifNull: ['$payments', []] },
//               as: 'payment',
//               in: {
//                 method: '$$payment.method',
//                 amount: '$$payment.amount'
//               }
//             }
//           }
//         }
//       },
//       {
//         $group: {
//           _id: '$dateForGrouping',
//           date: { $first: '$date' },
//           totalSales: { $sum: '$totalAmount' },
//           totalPaid: { $sum: { $subtract: ['$totalAmount', '$remainingAmount'] } },
//           pendingAmount: { $sum: '$remainingAmount' },
//           onlineAmount: {
//             $sum: {
//               $reduce: {
//                 input: '$payments',
//                 initialValue: 0,
//                 in: {
//                   $cond: [
//                     { $eq: ['$$this.method', 'online'] },
//                     { $add: ['$$value', '$$this.amount'] },
//                     '$$value'
//                   ]
//                 }
//               }
//             }
//           },
//           cashAmount: {
//             $sum: {
//               $reduce: {
//                 input: '$payments',
//                 initialValue: 0,
//                 in: {
//                   $cond: [
//                     { $eq: ['$$this.method', 'cash'] },
//                     { $add: ['$$value', '$$this.amount'] },
//                     '$$value'
//                   ]
//                 }
//               }
//             }
//           }
//         }
//       },
//       { 
//         $project: {
//           _id: 1,
//           date: 1,
//           totalSales: 1,
//           totalPaid: 1,
//           pendingAmount: 1,
//           onlineAmount: 1,
//           cashAmount: 1
//         }
//       },
//       { $sort: { date: -1 } }
//     ];

//     const result = await db.collection('sales').aggregate(pipeline).toArray();
//     res.status(200).json(result);
//   } catch (error) {
//     console.log("api/sales/history error");
//     console.error('Database Error:', error);
//     res.status(500).json({ error: 'Error processing request' });
//   }
// }
import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { groupBy = 'day', startDate, endDate } = req.query;

    let dateMatch = {};
    if (startDate && endDate) {
      dateMatch = {
        date: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    }

    // Modified pipeline to use the sale date (not payment date) for calculations
    let pipeline = [
      { $match: dateMatch },
      {
        $addFields: {
          // Ensure date field is a Date object before using dateToString
          dateObj: { 
            $cond: {
              if: { $eq: [{ $type: '$date' }, 'string'] },
              then: { $dateFromString: { dateString: '$date' } },
              else: '$date'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          originalDate: '$date',  // Keep the original date
          dateObj: 1,             // Keep the converted date
          totalAmount: 1,
          remainingAmount: 1,
          dateForGrouping: {
            $dateToString: { 
              format: groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'month' ? '%Y-%m' : '%Y', 
              date: '$dateObj'  // Use dateObj instead of date
            }
          },
          payments: {
            $map: {
              input: { $ifNull: ['$payments', []] },
              as: 'payment',
              in: {
                method: '$$payment.method',
                amount: { $toDouble: '$$payment.amount' }  // Ensure amount is a number
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$dateForGrouping',
          date: { $first: '$dateObj' },  // Store the date object, not original date
          totalSales: { $sum: '$totalAmount' },
          totalPaid: { $sum: { $subtract: ['$totalAmount', '$remainingAmount'] } },
          pendingAmount: { $sum: '$remainingAmount' },
          onlineAmount: {
            $sum: {
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: {
                  $cond: [
                    { $eq: ['$$this.method', 'online'] },
                    { $add: ['$$value', '$$this.amount'] },
                    '$$value'
                  ]
                }
              }
            }
          },
          cashAmount: {
            $sum: {
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: {
                  $cond: [
                    { $eq: ['$$this.method', 'cash'] },
                    { $add: ['$$value', '$$this.amount'] },
                    '$$value'
                  ]
                }
              }
            }
          }
        }
      },
      { 
        $project: {
          _id: 1,
          date: 1,
          totalSales: 1,
          totalPaid: 1,
          pendingAmount: 1,
          onlineAmount: 1,
          cashAmount: 1
        }
      },
      { $sort: { _id: -1 } }  // Sort by the grouped date string (more reliable)
    ];

    const result = await db.collection('sales').aggregate(pipeline).toArray();
    res.status(200).json(result);
  } catch (error) {
    console.log("api/sales/history error");
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
