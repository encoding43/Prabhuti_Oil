import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('prabhutioil');
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get expenses
    const expenses = await db.collection('expenses')
      .find({
        date: { $gte: start, $lte: end }
      })
      .toArray();

    // Get miscellaneous income
    const miscIncome = await db.collection('miscincome')
      .find({
        date: { $gte: start, $lte: end }
      })
      .toArray();

    // Get raw material usage and expenses
    const rawMaterialTransactions = await db.collection('rawmaterialtransactions')
      .find({
        date: { $gte: start, $lte: end }
      })
      .toArray();

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalMiscIncome = miscIncome.reduce((sum, inc) => sum + inc.amount, 0);
    const totalRawMaterialExpense = rawMaterialTransactions
      .filter(t => t.type === 'add')
      .reduce((sum, t) => sum + t.price, 0); // Don't multiply by quantity

    res.status(200).json({
      expenses,
      miscIncome,
      rawMaterialTransactions,
      summary: {
        totalExpenses,
        totalMiscIncome,
        totalRawMaterialExpense
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
}
