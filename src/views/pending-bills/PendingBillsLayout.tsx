'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TableFooter from '@mui/material/TableFooter'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

interface PendingBill {
  _id: string
  date: string
  customerName: string
  customerMobile: string
  customerAddress: string
  totalAmount: number
  remainingAmount: number
  products: Array<{
    productId: string
    name: string
    qty: number
    nos: number
    totalPrice: number
    discount?: number
    finalPrice: number
  }>
  payments: Array<{
    method: 'online' | 'cash'
    amount: number
    date: string
  }>
  courierPrice?: number
}

const PendingBillsLayout = () => {
  const calculateOnlineAmount = (bill: PendingBill) => {
    return (bill.payments || [])
      .filter(payment => payment.method === 'online')
      .reduce((sum, payment) => sum + payment.amount, 0)
  }

  const calculateCashAmount = (bill: PendingBill) => {
    return (bill.payments || [])
      .filter(payment => payment.method === 'cash')
      .reduce((sum, payment) => sum + payment.amount, 0)
  }
  const [bills, setBills] = useState<PendingBill[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(15)
  const [purchaseDetailsOpen, setPurchaseDetailsOpen] = useState(false)
  const [transactionsOpen, setTransactionsOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<PendingBill | null>(null)
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    mode: 'cash' as 'cash' | 'online'
  })

  useEffect(() => {
    const fetchPendingBills = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/sales/pending')
        if (!response.ok) throw new Error('Failed to fetch pending bills')
        const data = await response.json()
        setBills(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingBills()
  }, [])

  const fetchBillDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/pending/details?id=${id}`)
      if (!response.ok) throw new Error('Failed to fetch bill details')
      return await response.json()
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  const handlePurchaseDetails = async (bill: PendingBill) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/pending-details?id=${bill._id}`)
      if (!response.ok) throw new Error('Failed to fetch details')

      const details = await response.json()
      // Match the exact field names from database
      const formattedDetails = {
        ...details,
        products: details.products.map((product: any) => ({
          ...product,
          name: product.name,
          qty: product.qty || 0,
          nos: product.nos || 0,
          totalPrice: product.totalPrice || 0,
          discount: product.discount || 0,
          finalPrice: product.finalPrice || 0
        }))
      }
      setSelectedBill(formattedDetails)
      setPurchaseDetailsOpen(true)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to fetch bill details')
    } finally {
      setLoading(false)
    }
  }

  const handleTransactions = async (bill: PendingBill) => {
    try {
      // Fix: Use the same endpoint as purchase details since we need the same data
      const response = await fetch(`/api/sales/pending-details?id=${bill._id}`)
      if (!response.ok) throw new Error('Failed to fetch details')

      const details = await response.json()
      setSelectedBill(details)
      setTransactionsOpen(true)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to fetch transaction details')
    }
  }

  const handleAddPayment = async () => {
    if (!selectedBill || newPayment.amount <= 0) return

    try {
      const response = await fetch(`/api/sales/${selectedBill._id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: newPayment.mode,
          amount: newPayment.amount,
          date: new Date().toISOString()
        })
      })

      if (!response.ok) throw new Error('Failed to add payment')

      // Refresh bill details
      const response2 = await fetch(`/api/sales/pending-details?id=${selectedBill._id}`)
      if (!response2.ok) throw new Error('Failed to fetch updated details')
      const updatedBill = await response2.json()
      setSelectedBill(updatedBill)

      // Refresh bills list
      const response3 = await fetch('/api/sales/pending')
      if (!response3.ok) throw new Error('Failed to fetch updated bills')
      const updatedBills = await response3.json()
      setBills(updatedBills)

      setNewPayment({ amount: 0, mode: 'cash' })

      // Show success message
      alert('Payment added successfully')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to add payment')
    }
  }

  const renderPageNumbers = () => {
    const totalPages = Math.ceil(bills.length / rowsPerPage)
    return Array.from({ length: totalPages }, (_, i) => (
      <Tooltip key={i} title={`Go to page ${i + 1}`}>
        <Button
          size='small'
          variant={page === i ? 'contained' : 'outlined'}
          onClick={() => setPage(i)}
          sx={{ minWidth: '35px', mx: 0.5, p: '5px', height: '30px' }}
        >
          {i + 1}
        </Button>
      </Tooltip>
    ))
  }

  return (
    <Card>
      <CardHeader title='Pending Bills' titleTypographyProps={{ sx: { color: 'primary.main' } }} />
      <CardContent>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sr. No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align='right'>Total Bill (₹)</TableCell>
                <TableCell align='right'>Pending Amount (₹)</TableCell>
                <TableCell align='center'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                bills.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((bill, index) => (
                  <TableRow key={bill._id}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>{formatDate(bill.date)}</TableCell>
                    <TableCell>{bill.customerName}</TableCell>
                    <TableCell>{bill.customerMobile}</TableCell>
                    <TableCell>{bill.customerAddress}</TableCell>
                    <TableCell align='right'>{bill.totalAmount.toLocaleString()}</TableCell>
                    <TableCell align='right'>{bill.remainingAmount.toLocaleString()}</TableCell>
                    <TableCell align='center'>
                      <Button size='small' onClick={() => handlePurchaseDetails(bill)} sx={{ mr: 1 }}>
                        Purchase Details
                      </Button>
                      <Button size='small' onClick={() => handleTransactions(bill)} color='secondary'>
                        Transactions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant='body2' sx={{ mr: 2 }}>
            Jump to page:
          </Typography>
          {renderPageNumbers()}
        </Box>

        {/* Purchase Details Modal */}
        <Dialog open={purchaseDetailsOpen} onClose={() => setPurchaseDetailsOpen(false)} maxWidth='md' fullWidth>
          <DialogTitle>Purchase Details</DialogTitle>
          <DialogContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              selectedBill && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle1'>Customer: {selectedBill.customerName}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant='subtitle1'>Date: {formatDate(selectedBill.date)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Product</TableCell>
                              <TableCell align='right'>Quantity (ml/g)</TableCell>
                              <TableCell align='right'>Nos</TableCell>
                              <TableCell align='right'>Total Price (₹)</TableCell>
                              <TableCell align='right'>Discount (₹)</TableCell>
                              <TableCell align='right'>Final Price (₹)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedBill.products?.map((product, index) => (
                              <TableRow key={index}>
                                <TableCell>{product.name}</TableCell>
                                <TableCell align='right'>{product.qty}</TableCell>
                                <TableCell align='right'>{product.nos}</TableCell>
                                <TableCell align='right'>{product.totalPrice.toLocaleString()}</TableCell>
                                <TableCell align='right'>{(product.discount || 0).toLocaleString()}</TableCell>
                                <TableCell align='right'>{product.finalPrice.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            {(selectedBill.courierPrice ?? 0) > 0 && (
                              <TableRow>
                                <TableCell>Courier Charges</TableCell>
                                <TableCell align='right'>-</TableCell>
                                <TableCell align='right'>-</TableCell>
                                <TableCell align='right'>{(selectedBill.courierPrice ?? 0).toLocaleString()}</TableCell>
                                <TableCell align='right'>0</TableCell>
                                <TableCell align='right'>{(selectedBill.courierPrice ?? 0).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            <TableRow>
                              <TableCell colSpan={4} />
                              <TableCell align='right'>
                                <strong>Total Amount:</strong>
                              </TableCell>
                              <TableCell align='right'>₹{selectedBill.totalAmount.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant='h6' gutterBottom sx={{ mt: 4 }}>
                        Payment History
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Payment Mode</TableCell>
                              <TableCell align='right'>Amount (₹)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedBill.payments?.map((payment, index) => (
                              <TableRow key={index}>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell>{payment.method === 'online' ? 'Online Payment' : 'Cash Payment'}</TableCell>
                                <TableCell align='right'>{payment.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            {!selectedBill.payments?.length && (
                              <TableRow>
                                <TableCell colSpan={3} align='center'>
                                  No payment records found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={2} align='right'>
                                <strong>Total Paid:</strong>
                              </TableCell>
                              <TableCell align='right'>
                                <strong>
                                  ₹{(selectedBill.totalAmount - selectedBill.remainingAmount).toLocaleString()}
                                </strong>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={2} align='right'>
                                <strong>Remaining Amount:</strong>
                              </TableCell>
                              <TableCell align='right'>
                                <strong>₹{selectedBill.remainingAmount.toLocaleString()}</strong>
                              </TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </Box>
              )
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPurchaseDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Transactions Modal */}
        <Dialog open={transactionsOpen} onClose={() => setTransactionsOpen(false)} maxWidth='md' fullWidth>
          <DialogTitle>Transaction History & New Payment</DialogTitle>
          <DialogContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              selectedBill && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography>Payment Summary</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={3}>
                            <Typography>Total Amount: ₹{selectedBill.totalAmount.toLocaleString()}</Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography>
                              Online Paid: ₹{calculateOnlineAmount(selectedBill).toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography>Cash Paid: ₹{calculateCashAmount(selectedBill).toLocaleString()}</Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography>Pending: ₹{selectedBill.remainingAmount.toLocaleString()}</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    {/* New Payment Form */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant='h6' gutterBottom>
                          Add New Payment
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              type='number'
                              label='Amount'
                              value={newPayment.amount === 0 ? '' : newPayment.amount}
                              onChange={e => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              label='Payment Mode'
                              value={newPayment.mode}
                              onChange={e =>
                                setNewPayment(prev => ({ ...prev, mode: e.target.value as 'cash' | 'online' }))
                              }
                            >
                              <MenuItem value='cash'>Cash</MenuItem>
                              <MenuItem value='online'>Online</MenuItem>
                            </TextField>
                          </Grid>
                        </Grid>
                        <Button
                          variant='contained'
                          onClick={handleAddPayment}
                          sx={{ mt: 2 }}
                          disabled={newPayment.amount <= 0}
                        >
                          Add Payment
                        </Button>
                      </Paper>
                    </Grid>

                    {/* Transaction History */}
                    <Grid item xs={12}>
                      <Typography variant='h6' gutterBottom>
                        Transaction History
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell align='right'>Amount (₹)</TableCell>
                              <TableCell>Mode</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(selectedBill.payments || []).map((payment, index) => (
                              <TableRow key={index}>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell align='right'>
                                  {typeof payment.amount === 'number' ? payment.amount.toLocaleString() : '0'}
                                </TableCell>
                                <TableCell>{payment.method}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </Box>
              )
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransactionsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default PendingBillsLayout
