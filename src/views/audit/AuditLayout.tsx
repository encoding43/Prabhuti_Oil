'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

// Interface definitions
interface MaterialUsage {
  _id: string
  name: string
  quantityUsed: number
  unit: string
}

interface OilUsage {
  _id: string
  name: string
  quantityUsed: number
  amount: number
}

interface AuditSummary {
  totalSales: number
  totalMiscIncome: number
  totalExpenses: number
  totalRawMaterialCost: number
  totalPackingMaterialCost: number
  profit: number
}

const AuditLayout = () => {
  // States for date range
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    to: new Date().toISOString().split('T')[0] // Today
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [expenses, setExpenses] = useState<any[]>([])
  const [miscIncomes, setMiscIncomes] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any[]>([])

  // Material usage states
  const [rawMaterialUsage, setRawMaterialUsage] = useState<MaterialUsage[]>([])
  const [packingMaterialUsage, setPackingMaterialUsage] = useState<MaterialUsage[]>([])
  const [oilUsage, setOilUsage] = useState<OilUsage[]>([])
  const [otherProductUsage, setOtherProductUsage] = useState<MaterialUsage[]>([])

  // Summary state
  const [summary, setSummary] = useState<AuditSummary>({
    totalSales: 0,
    totalMiscIncome: 0,
    totalExpenses: 0,
    totalRawMaterialCost: 0,
    totalPackingMaterialCost: 0,
    profit: 0
  })

  // Fetch data when component mounts
  useEffect(() => {
    fetchAuditData()
  }, [])

  // Fetch all required data for the audit
  const fetchAuditData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch daily summaries for the selected date range
      const dailySummaryRes = await fetch(`/api/daily-summary?startDate=${dateRange.from}&endDate=${dateRange.to}`)

      if (!dailySummaryRes.ok) throw new Error('Failed to fetch daily summaries')
      const dailySummaries = await dailySummaryRes.json()

      // Calculate total sales, expenses, etc. from daily summaries
      let totalSales = 0
      let totalMiscIncome = 0
      let pendingAmount = 0
      let onlineAmount = 0
      let cashAmount = 0

      // Collect all material usage across all days
      const rawMaterialUsageMap = new Map()
      const packingMaterialUsageMap = new Map()
      const oilSalesMap = new Map()
      const otherProductsMap = new Map()

      // Process each daily summary
      dailySummaries.forEach((summary: any) => {
        totalSales += summary.totalSales || 0
        totalMiscIncome += summary.totalMiscIncome || 0
        pendingAmount += summary.pendingAmount || 0
        onlineAmount += summary.onlineAmount || 0
        cashAmount += summary.cashAmount || 0

        // Process raw material usage
        if (summary.rawMaterialUsage && Array.isArray(summary.rawMaterialUsage)) {
          summary.rawMaterialUsage.forEach((usage: any) => {
            const materialId = usage.materialId.toString()
            const current = rawMaterialUsageMap.get(materialId) || {
              _id: materialId,
              name: usage.materialName || 'Unknown Material',
              quantityUsed: 0,
              unit: 'kg'
            }

            current.quantityUsed += usage.quantity || 0
            rawMaterialUsageMap.set(materialId, current)
          })
        }

        // Process packing material usage
        if (summary.packingMaterialUsage && Array.isArray(summary.packingMaterialUsage)) {
          summary.packingMaterialUsage.forEach((usage: any) => {
            const materialId = usage.materialId.toString()
            const current = packingMaterialUsageMap.get(materialId) || {
              _id: materialId,
              name: usage.materialName || 'Unknown Material',
              quantityUsed: 0,
              unit: 'pcs'
            }

            current.quantityUsed += usage.quantity || 0
            packingMaterialUsageMap.set(materialId, current)
          })
        }

        // Process oil sales/usage
        if (summary.oilSales && Array.isArray(summary.oilSales)) {
          summary.oilSales.forEach((sale: any) => {
            const productId = sale.productId.toString()
            const current = oilSalesMap.get(productId) || {
              _id: productId,
              name: sale.productName || 'Unknown Oil',
              quantityUsed: 0,
              amount: 0
            }

            current.quantityUsed += sale.quantity || 0
            current.amount += sale.amount || 0
            oilSalesMap.set(productId, current)
          })
        }

        // Process other products usage (if available)
        if (summary.otherProducts && Array.isArray(summary.otherProducts)) {
          summary.otherProducts.forEach((product: any) => {
            const productId = product.productId.toString()
            const current = otherProductsMap.get(productId) || {
              _id: productId,
              name: product.productName || 'Unknown Product',
              quantityUsed: 0,
              unit: 'mg'
            }

            current.quantityUsed += product.quantity || 0
            otherProductsMap.set(productId, current)
          })
        }
      })

      // Convert maps to arrays
      const rawMaterialUsageData = Array.from(rawMaterialUsageMap.values())
      const packingMaterialUsageData = Array.from(packingMaterialUsageMap.values())
      const oilUsageData = Array.from(oilSalesMap.values())
      const otherProductUsageData = Array.from(otherProductsMap.values())

      setRawMaterialUsage(rawMaterialUsageData)
      setPackingMaterialUsage(packingMaterialUsageData)
      setOilUsage(oilUsageData)
      setOtherProductUsage(otherProductUsageData)

      // Fetch expenses
      const expensesRes = await fetch(`/api/expenses?startDate=${dateRange.from}&endDate=${dateRange.to}`)
      if (!expensesRes.ok) throw new Error('Failed to fetch expenses data')
      const expensesData = await expensesRes.json()
      setExpenses(expensesData)

      // Calculate total expenses
      const totalExpenses = expensesData.reduce((sum: number, expense: any) => sum + expense.amount, 0)

      // Fetch miscellaneous income
      const miscIncomeRes = await fetch(`/api/misc-income?startDate=${dateRange.from}&endDate=${dateRange.to}`)
      if (!miscIncomeRes.ok) throw new Error('Failed to fetch misc income data')
      const miscIncomeData = await miscIncomeRes.json()
      setMiscIncomes(miscIncomeData)

      // Calculate total misc income if not already available from daily summary
      const totalMiscIncomeAmount = miscIncomeData.reduce((sum: number, income: any) => sum + income.amount, 0)

      // Fetch material transactions for cost calculation
      const [rawTransactionsRes, packingTransactionsRes] = await Promise.all([
        fetch(`/api/raw-material-transactions?startDate=${dateRange.from}&endDate=${dateRange.to}`),
        fetch(`/api/packing-material-transactions?startDate=${dateRange.from}&endDate=${dateRange.to}`)
      ])

      if (!rawTransactionsRes.ok || !packingTransactionsRes.ok) {
        throw new Error('Failed to fetch material transactions')
      }

      const rawTransactions = await rawTransactionsRes.json()
      const packingTransactions = await packingTransactionsRes.json()

      // Calculate raw material and packing material costs, considering transaction type
      const totalRawMaterialCost = rawTransactions.reduce((sum: number, t: any) => {
        // Add if type is 'add', subtract if type is 'subtract'
        const modifier = t.type === 'add' ? 1 : -1
        return sum + (t.price || 0) * modifier
      }, 0)

      const totalPackingMaterialCost = packingTransactions.reduce((sum: number, t: any) => {
        // Add if type is 'add', subtract if type is 'subtract'
        const modifier = t.type === 'add' ? 1 : -1
        return sum + (t.price || 0) * modifier
      }, 0)

      // Calculate profit
      const totalRevenue = totalSales + totalMiscIncomeAmount
      const totalCosts = totalExpenses + totalRawMaterialCost + totalPackingMaterialCost
      const profit = totalRevenue - totalCosts

      // Update summary
      setSummary({
        totalSales,
        totalMiscIncome: totalMiscIncomeAmount,
        totalExpenses,
        totalRawMaterialCost,
        totalPackingMaterialCost,
        profit
      })

      // Keep the sales data for reference
      setSalesData(dailySummaries)
    } catch (err) {
      console.error('Error fetching audit data:', err)
      setError('Failed to fetch audit data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader title='Audit Report' />
      <CardContent>
        {/* Date Range Selection */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              type='date'
              label='From Date'
              value={dateRange.from}
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              type='date'
              label='To Date'
              value={dateRange.to}
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant='contained' fullWidth onClick={fetchAuditData} sx={{ height: '56px' }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity='error' sx={{ mb: 6 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                  <Typography variant='h6'>Total Sale</Typography>
                  <Typography variant='h4'>
                    ₹{(summary.totalSales + summary.totalMiscIncome).toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, px: 2 }}>
                    <Typography variant='body2'>Sales: ₹{summary.totalSales.toLocaleString()}</Typography>
                    <Typography variant='body2'>Misc Income: ₹{summary.totalMiscIncome.toLocaleString()}</Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
                  <Typography variant='h6'>Total Expense</Typography>
                  <Typography variant='h4'>
                    ₹
                    {(
                      summary.totalExpenses +
                      summary.totalRawMaterialCost +
                      summary.totalPackingMaterialCost
                    ).toLocaleString()}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mt: 2, px: 2, gap: 0.5 }}
                  >
                    <Typography variant='body2'>Expenses: ₹{summary.totalExpenses.toLocaleString()}</Typography>
                    <Typography variant='body2'>
                      Raw Materials: ₹{summary.totalRawMaterialCost.toLocaleString()}
                    </Typography>
                    <Typography variant='body2'>
                      Packing Materials: ₹{summary.totalPackingMaterialCost.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: summary.profit >= 0 ? 'success.light' : 'error.dark',
                    color: 'white'
                  }}
                >
                  <Typography variant='h6'>Total Profit</Typography>
                  <Typography variant='h4'>₹{summary.profit.toLocaleString()}</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant='body2'>
                      {summary.profit >= 0 ? 'Profitable Period' : 'Loss-making Period'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Raw Material Usage */}
            <Typography variant='h6' sx={{ mb: 3 }}>
              Raw Material Usage
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 6 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Material Name</TableCell>
                    <TableCell align='right'>Quantity Used</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rawMaterialUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align='center'>
                        No raw material usage data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    rawMaterialUsage.map(material => (
                      <TableRow key={material._id}>
                        <TableCell>{material.name}</TableCell>
                        <TableCell align='right'>
                          {material.quantityUsed.toLocaleString()} {material.unit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Packing Material Usage */}
            <Typography variant='h6' sx={{ mb: 3 }}>
              Packing Material Usage
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 6 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Material Name</TableCell>
                    <TableCell align='right'>Quantity Used</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packingMaterialUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align='center'>
                        No packing material usage data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    packingMaterialUsage.map(material => (
                      <TableRow key={material._id}>
                        <TableCell>{material.name}</TableCell>
                        <TableCell align='right'>
                          {material.quantityUsed.toLocaleString()} {material.unit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Oil Usage */}
            <Typography variant='h6' sx={{ mb: 3 }}>
              Oil Usage
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 6 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product Name</TableCell>
                    <TableCell align='right'>Quantity Used (ml)</TableCell>
                    <TableCell align='right'>Amount (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {oilUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align='center'>
                        No oil usage data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    oilUsage.map(oil => (
                      <TableRow key={oil._id}>
                        <TableCell>{oil.name}</TableCell>
                        <TableCell align='right'>{oil.quantityUsed.toLocaleString()} ml</TableCell>
                        <TableCell align='right'>₹{oil.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {oilUsage.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align='right' sx={{ fontWeight: 'bold' }}>
                        Total:
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                        ₹{oilUsage.reduce((sum, oil) => sum + oil.amount, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Other Product Usage */}
            {otherProductUsage.length > 0 && (
              <>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  Other Product Usage
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 6 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product Name</TableCell>
                        <TableCell align='right'>Quantity Used (mg)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {otherProductUsage.map(product => (
                        <TableRow key={product._id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell align='right'>
                            {product.quantityUsed.toLocaleString()} {product.unit}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Expenses Breakdown */}
            <Typography variant='h6' sx={{ mb: 3 }}>
              Expenses Breakdown
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 6 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align='right'>Amount (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align='center'>
                        No expenses data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map(expense => (
                      <TableRow key={expense._id}>
                        <TableCell>{expense.name}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell align='right'>{expense.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {expenses.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align='right' sx={{ fontWeight: 'bold' }}>
                        Total:
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                        ₹{expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Miscellaneous Income */}
            <Typography variant='h6' sx={{ mb: 3 }}>
              Miscellaneous Income
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell align='right'>Amount (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {miscIncomes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align='center'>
                        No miscellaneous income data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    miscIncomes.map(income => (
                      <TableRow key={income._id}>
                        <TableCell>{income.title}</TableCell>
                        <TableCell>{new Date(income.date).toLocaleDateString()}</TableCell>
                        <TableCell>{income.paymentMethod}</TableCell>
                        <TableCell align='right'>{income.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {miscIncomes.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align='right' sx={{ fontWeight: 'bold' }}>
                        Total:
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 'bold' }}>
                        ₹{miscIncomes.reduce((sum, income) => sum + income.amount, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default AuditLayout
