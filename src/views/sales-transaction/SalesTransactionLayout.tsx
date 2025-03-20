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
import IconButton from '@mui/material/IconButton'
import Modal from '@mui/material/Modal'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'

interface Product {
  _id: string
  name: string
  type: 'oil' | 'other'
  quantities: Array<{ qty: number; price: number }>
}

// Add this utility function at the top of the file
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Import the form structure from AddSaleLayouts
interface ProductItem {
  type: 'oil' | 'other'
  productId?: number
  name: string
  qty: number
  nos: number
  isPackagingMaterialUsed: boolean
  totalPrice: number
  discount: number
  finalPrice: number
}

interface SaleTransaction {
  _id: string
  date: string
  customerName: string
  customerMobile: string
  customerAddress: string
  products: Array<{
    type?: 'oil' | 'other'
    productId: string
    name: string
    quantity: number
    price: number
    finalPrice: number
    qty?: number
    nos?: number
    isPackagingMaterialUsed?: boolean
    totalPrice?: number
    discount?: number
  }>
  totalAmount: number
  onlineAmount: number
  cashAmount: number
  remainingAmount: number
  courierPrice?: number
  status: 'completed' | 'pending'
  payments?: Array<{
    date: string
    method: 'online' | 'cash'
    amount: number
  }>
  saleType?: 'direct' | 'courier'
}

const SalesTransactionLayout = () => {
  const [transactions, setTransactions] = useState<SaleTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [viewModal, setViewModal] = useState<{ open: boolean; data: SaleTransaction | null }>({
    open: false,
    data: null
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<SaleTransaction | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const queryParams = new URLSearchParams()
        if (filter !== 'all') {
          queryParams.append('filter', filter)
        }

        const response = await fetch(`/api/sales/transactions?${queryParams}`)
        if (!response.ok) throw new Error('Failed to fetch transactions')

        const data = await response.json()
        console.log(data)
        setTransactions(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [filter])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const data = await response.json()

        setAvailableProducts(data)
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }

    fetchProducts()
  }, [])

  // Add this function after existing state declarations
  const fetchTransactionDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/details/${id}`)
      if (!response.ok) throw new Error('Failed to fetch transaction details')
      return await response.json()
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  // Update handleViewTransaction function
  const handleViewTransaction = async (transaction: SaleTransaction) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/pending-details?id=${transaction._id}`)
      if (!response.ok) throw new Error('Failed to fetch transaction details')

      const details = await response.json()
      setViewModal({ open: true, data: details })
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to fetch transaction details')
    } finally {
      setLoading(false)
    }
  }

  // Fix the handleEditTransaction function
  const handleEditTransaction = async (transaction: SaleTransaction) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/pending-details?id=${transaction._id}`)
      if (!response.ok) throw new Error('Failed to fetch transaction details')

      const details = await response.json()
      // Format data for editing
      const formattedDetails = {
        ...details,
        products: details.products.map((product: any) => ({
          ...product,
          productId: product.productId,
          type: product.type || 'oil',
          name: product.name,
          qty: product.qty || 0,
          nos: product.nos || 1,
          totalPrice: product.totalPrice || 0,
          discount: product.discount || 0,
          finalPrice: product.finalPrice || 0,
          isPackagingMaterialUsed: product.isPackagingMaterialUsed || false
        })),
        // Ensure these values are properly set for editing
        courierPrice: details.courierPrice || 0,
        saleType: details.saleType || 'direct',
        onlineAmount:
          details.payments
            ?.filter((p: { method: string; amount: number }) => p.method === 'online')
            .reduce((sum: number, p: { method: string; amount: number }) => sum + p.amount, 0) || 0,
        cashAmount:
          details.payments
            ?.filter((p: { method: string; amount: number }) => p.method === 'cash')
            .reduce((sum: number, p: { method: string; amount: number }) => sum + p.amount, 0) || 0
      }

      setEditData(formattedDetails)
      setEditMode(true)
      setViewModal({ open: true, data: formattedDetails })
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to fetch transaction details')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete transaction')
      }

      // Refresh both transactions and pending bills
      const [transactionsResponse, pendingResponse] = await Promise.all([
        fetch('/api/sales/transactions'),
        fetch('/api/sales/pending')
      ])

      if (transactionsResponse.ok) {
        const newData = await transactionsResponse.json()
        setTransactions(newData)
      }

      setDeleteDialog({ open: false, id: null })
      alert('Transaction deleted successfully')
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        alert(error.message || 'Failed to delete transaction')
      } else {
        alert('Failed to delete transaction')
      }
    } finally {
      setLoading(false)
    }
  }

  // Add function to recalculate totals
  const recalculateTotals = (products: any[]) => {
    const subtotal = products.reduce((sum, product) => sum + (product.finalPrice || 0), 0)
    const courierPrice = editData?.courierPrice || 0
    const total = subtotal + courierPrice
    return { subtotal, total }
  }

  // Fix the handleProductChange function to correctly update remaining amount
  const handleProductChange = (productIndex: number, field: keyof ProductItem, value: any) => {
    if (!editData) return

    const updatedProducts = [...editData.products]
    const product = { ...updatedProducts[productIndex] }

    if (field === 'productId') {
      const selectedProduct = availableProducts.find(p => p._id === value)
      if (selectedProduct) {
        product.productId = value
        product.name = selectedProduct.name
        product.type = selectedProduct.type
        // Reset other values when product changes
        product.qty = 0
        product.nos = 1
        product.totalPrice = 0
        product.discount = 0
        product.finalPrice = 0
      }
    } else if (field === 'type') {
      product.type = value
      // Reset product selection when type changes
      product.productId = ''
      product.name = ''
    } else if (field === 'qty' || field === 'nos') {
      product[field] = Number(value)

      // Recalculate price based on quantity and nos
      if (product.productId) {
        const selectedProduct = availableProducts.find(p => p._id === product.productId)
        const qtyPrice = selectedProduct?.quantities.find(q => q.qty === Number(product.qty))

        if (qtyPrice) {
          product.totalPrice = qtyPrice.price * (product.nos || 1)
          product.finalPrice = product.totalPrice - (product.discount || 0)
        }
      }
    } else if (field === 'discount') {
      product.discount = Number(value)
      product.finalPrice = (product.totalPrice || 0) - product.discount
    } else if (field === 'isPackagingMaterialUsed') {
      product.isPackagingMaterialUsed = value === 'true' || value === true
    } else {
      ;(product as any)[field] = value
    }

    updatedProducts[productIndex] = product

    // Calculate total amount and remaining amount
    const totalAmount = updatedProducts.reduce((sum, p) => sum + (p.finalPrice || 0), 0) + (editData.courierPrice || 0)

    // Get the total payments from the original payment records
    const totalPayments = (editData.payments || []).reduce((sum, payment) => sum + payment.amount, 0)

    // Calculate the correct remaining amount
    const remainingAmount = totalAmount - totalPayments

    setEditData({
      ...editData,
      products: updatedProducts,
      totalAmount,
      remainingAmount
    })
  }

  // Fix the handleSaveEdit function to properly track material usage updates
  const handleSaveEdit = async () => {
    if (!editData) return

    try {
      setLoading(true)

      // Calculate totals from products
      const productsTotalAmount = editData.products.reduce((sum, product) => sum + (product.finalPrice || 0), 0)
      const courierAmount = editData.courierPrice || 0
      const totalAmount = productsTotalAmount + courierAmount

      // Calculate payments - preserve the original payment history
      const originalPayments = viewModal.data?.payments || []

      // Calculate remaining amount
      const paidAmount = originalPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const remainingAmount = totalAmount - paidAmount

      // Compare products to determine if material usage should be updated
      // We need material updates if:
      // 1. Products were added or removed
      // 2. Quantities (qty or nos) changed for any product
      const originalProducts = viewModal.data?.products || []
      const productsChanged =
        originalProducts.length !== editData.products.length ||
        editData.products.some((product, index) => {
          // If we have more products than original, consider it a change
          if (index >= originalProducts.length) return true

          const original = originalProducts[index]
          // Check if product ID, quantity, or number changed
          return (
            product.productId !== original.productId ||
            product.qty !== original.qty ||
            product.nos !== original.nos ||
            product.isPackagingMaterialUsed !== original.isPackagingMaterialUsed
          )
        })

      const updateData = {
        ...editData,
        totalAmount,
        remainingAmount,
        status: remainingAmount > 0 ? 'pending' : 'completed',
        payments: originalPayments,
        products: editData.products.map(product => ({
          productId: product.productId,
          type: product.type,
          name: product.name,
          qty: product.qty,
          nos: product.nos,
          isPackagingMaterialUsed: product.isPackagingMaterialUsed,
          totalPrice: product.totalPrice,
          discount: product.discount || 0,
          finalPrice: product.finalPrice
        })),
        // Only skip material updates if products haven't changed
        skipMaterialUsageUpdate: !productsChanged
      }

      const response = await fetch(`/api/sales/${editData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      // ...existing code for handling response...
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update transaction')
      }

      // Refresh transactions list
      const refreshResponse = await fetch('/api/sales/transactions')
      if (refreshResponse.ok) {
        const newData = await refreshResponse.json()
        setTransactions(newData)
      }

      setViewModal({ open: false, data: null })
      setEditMode(false)
      setEditData(null)
      alert('Transaction updated successfully')
    } catch (error) {
      // ...existing error handling...
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Failed to update transaction')
    } finally {
      // ...existing code...
      setLoading(false)
    }
  }

  const handleAddProduct = () => {
    if (!editData) return

    const newProduct = {
      productId: '',
      type: 'oil',
      name: '',
      qty: 0,
      nos: 1,
      price: 0,
      totalPrice: 0,
      discount: 0,
      finalPrice: 0,
      isPackagingMaterialUsed: true
    }

    setEditData({
      ...editData,
      products: [...editData.products, newProduct]
    })
  }

  const handlePageNavigation = (pageNumber: number) => {
    setPage(pageNumber - 1)
  }

  const PaginationControls = () => {
    const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage)
    return (
      <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
        <Button size='small' onClick={() => setPage(0)} disabled={page === 0}>
          <i className='ri-skip-back-line' />
        </Button>
        {[...Array(totalPages)].map((_, index) => (
          <Button
            key={index}
            size='small'
            variant={page === index ? 'contained' : 'outlined'}
            onClick={() => handlePageNavigation(index + 1)}
            sx={{ minWidth: 40 }}
          >
            {index + 1}
          </Button>
        ))}
        <Button size='small' onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}>
          <i className='ri-skip-forward-line' />
        </Button>
      </Box>
    )
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customerMobile.includes(searchTerm)
    const matchesFilter = filter === 'all' || transaction.status === filter
    return matchesSearch && matchesFilter
  })

  // Add a function to handle courier price changes
  const handleCourierPriceChange = (value: string) => {
    if (!editData) return

    const newCourierPrice = Number(value) || 0
    const totalAmount = editData.products.reduce((sum, p) => sum + (p.finalPrice || 0), 0) + newCourierPrice

    setEditData({
      ...editData,
      courierPrice: newCourierPrice,
      totalAmount: totalAmount
    })
  }

  // Add a function to handle sale type changes
  const handleSaleTypeChange = (value: string) => {
    if (!editData) return

    const newType = value as 'direct' | 'courier'
    let newCourierPrice = editData.courierPrice || 0

    // If changing from courier to direct, reset courier price
    if (newType === 'direct') {
      newCourierPrice = 0
    }

    const totalAmount = editData.products.reduce((sum, p) => sum + (p.finalPrice || 0), 0) + newCourierPrice

    setEditData({
      ...editData,
      saleType: newType,
      courierPrice: newCourierPrice,
      totalAmount: totalAmount
    })
  }

  return (
    <Card>
      <CardHeader
        title='Sales Transactions'
        titleTypographyProps={{ sx: { color: 'primary.main' } }}
        action={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              size='small'
              value={filter}
              onChange={e => setFilter(e.target.value as typeof filter)}
              sx={{ width: 150 }}
            >
              <MenuItem value='all'>All Transactions</MenuItem>
              <MenuItem value='completed'>Completed</MenuItem>
              <MenuItem value='pending'>Pending</MenuItem>
            </TextField>
            <TextField
              size='small'
              placeholder='Search customer...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ width: 200 }}
            />
          </Box>
        }
      />
      <CardContent>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell align='right'>Total Amount</TableCell>
                <TableCell align='right'>Paid Amount</TableCell>
                <TableCell align='right'>Remaining</TableCell>
                <TableCell align='center'>Status</TableCell>
                <TableCell align='center'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(transaction => (
                  <TableRow key={transaction._id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.customerName}</TableCell>
                    <TableCell>{transaction.customerMobile}</TableCell>
                    <TableCell align='right'>₹{(transaction.totalAmount || 0).toLocaleString()}</TableCell>
                    <TableCell align='right'>
                      ₹{((transaction.totalAmount || 0) - (transaction.remainingAmount || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell align='right'>₹{(transaction.remainingAmount || 0).toLocaleString()}</TableCell>
                    <TableCell align='center'>
                      <Typography
                        sx={{
                          color: transaction.status === 'completed' ? 'success.main' : 'warning.main',
                          textTransform: 'capitalize'
                        }}
                      >
                        {transaction.status || 'pending'}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton onClick={() => handleViewTransaction(transaction)}>
                        <i className='ri-eye-line' />
                      </IconButton>
                      <IconButton color='primary' onClick={() => handleEditTransaction(transaction)}>
                        <i className='ri-edit-line' />
                      </IconButton>
                      <IconButton color='error' onClick={() => setDeleteDialog({ open: true, id: transaction._id })}>
                        <i className='ri-delete-bin-line' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationControls />
        <TablePagination
          component='div'
          count={filteredTransactions.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
        {/* Modal Content - Update to match AddSaleLayout fields */}
        <Modal
          open={viewModal.open}
          onClose={() => {
            setViewModal({ open: false, data: null })
            setEditMode(false)
            setEditData(null)
          }}
          aria-labelledby='transaction-modal'
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              maxWidth: 900,
              bgcolor: 'background.paper',
              boxShadow: 24,
              p: 4,
              maxHeight: '90vh',
              overflow: 'auto',
              borderRadius: 1
            }}
          >
            {viewModal.data && (
              <Grid container spacing={3}>
                {/* Header */}
                <Grid
                  item
                  xs={12}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
                >
                  <Typography variant='h6'>{editMode ? 'Edit Transaction' : 'Transaction Details'}</Typography>
                  <Box>
                    {!editMode && (
                      <Button
                        variant='contained'
                        onClick={() => handleEditTransaction(viewModal.data!)}
                        startIcon={<i className='ri-edit-line' />}
                        sx={{ mr: 2 }}
                      >
                        Edit
                      </Button>
                    )}
                    <IconButton onClick={() => setViewModal({ open: false, data: null })}>
                      <i className='ri-close-line' />
                    </IconButton>
                  </Box>
                </Grid>
                {/* Customer Details Section */}
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className='ri-user-line' />
                    Customer Information
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Date'
                        value={editMode ? editData?.date?.split('T')[0] : viewModal.data.date.split('T')[0]}
                        onChange={e => editMode && setEditData(prev => ({ ...prev!, date: e.target.value }))}
                        disabled={!editMode}
                        type='date'
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Customer Name'
                        value={editMode ? editData?.customerName : viewModal.data.customerName}
                        onChange={e => editMode && setEditData(prev => ({ ...prev!, customerName: e.target.value }))}
                        disabled={!editMode}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Mobile Number'
                        value={editMode ? editData?.customerMobile : viewModal.data.customerMobile}
                        onChange={e => editMode && setEditData(prev => ({ ...prev!, customerMobile: e.target.value }))}
                        disabled={!editMode}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Address'
                        value={editMode ? editData?.customerAddress : viewModal.data.customerAddress}
                        onChange={e => editMode && setEditData(prev => ({ ...prev!, customerAddress: e.target.value }))}
                        disabled={!editMode}
                        multiline
                        rows={1}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Sale Type Section */}
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className='ri-truck-line' />
                    Delivery Details
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {editMode ? (
                        <TextField
                          select
                          fullWidth
                          label='Sale Type'
                          value={editData?.saleType || 'direct'}
                          onChange={e => handleSaleTypeChange(e.target.value)}
                        >
                          <MenuItem value='direct'>Direct</MenuItem>
                          <MenuItem value='courier'>Courier</MenuItem>
                        </TextField>
                      ) : (
                        <TextField
                          fullWidth
                          label='Sale Type'
                          value={viewModal.data.saleType === 'courier' ? 'Courier' : 'Direct'}
                          disabled
                        />
                      )}
                    </Grid>
                    {(editMode ? editData?.saleType === 'courier' : viewModal.data.saleType === 'courier') && (
                      <Grid item xs={12} md={6}>
                        {editMode ? (
                          <TextField
                            fullWidth
                            type='number'
                            label='Courier Price'
                            value={editData?.courierPrice || 0}
                            onChange={e => handleCourierPriceChange(e.target.value)}
                            InputProps={{ startAdornment: <span>₹</span> }}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            label='Courier Price'
                            value={`₹${viewModal.data.courierPrice || 0}`}
                            disabled
                          />
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Grid>

                {/* Products Section */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant='subtitle1' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <i className='ri-shopping-basket-line' />
                      Products
                    </Typography>
                    {editMode && (
                      <Button variant='contained' size='small' onClick={handleAddProduct}>
                        Add Product
                      </Button>
                    )}
                  </Box>
                  {(editMode ? editData?.products : viewModal.data?.products)?.map((product, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Grid container spacing={2}>
                        {editMode ? (
                          <>
                            <Grid item xs={12} sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant='subtitle2'>Product #{index + 1}</Typography>
                              <IconButton
                                color='error'
                                onClick={() => {
                                  if (!editData) return
                                  const updatedProducts = editData.products.filter((_, i) => i !== index)
                                  setEditData({ ...editData, products: updatedProducts })
                                }}
                              >
                                <i className='ri-delete-bin-line' />
                              </IconButton>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                select
                                fullWidth
                                label='Type'
                                value={product.type}
                                onChange={e => handleProductChange(index, 'type', e.target.value)}
                              >
                                <MenuItem value='oil'>Oil</MenuItem>
                                <MenuItem value='other'>Other</MenuItem>
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                select
                                fullWidth
                                label='Product Name'
                                value={product.productId || ''}
                                onChange={e => handleProductChange(index, 'productId', e.target.value)}
                              >
                                {availableProducts
                                  .filter(p => p.type === product.type)
                                  .map(p => (
                                    <MenuItem key={p._id} value={p._id}>
                                      {p.name}
                                    </MenuItem>
                                  ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                select
                                fullWidth
                                label='Quantity'
                                value={product.qty}
                                onChange={e => handleProductChange(index, 'qty', e.target.value)}
                              >
                                {availableProducts
                                  .find(p => p._id === product.productId)
                                  ?.quantities.map(({ qty }: { qty: number }) => (
                                    <MenuItem key={qty} value={qty}>{`${qty}ml`}</MenuItem>
                                  ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                type='number'
                                label='Nos'
                                value={product.nos}
                                onChange={e => handleProductChange(index, 'nos', e.target.value)}
                              />
                            </Grid>
                            {product.type === 'oil' && (
                              <Grid item xs={12} md={3}>
                                <TextField
                                  select
                                  fullWidth
                                  label='Packaging Material'
                                  value={product.isPackagingMaterialUsed}
                                  onChange={e => handleProductChange(index, 'isPackagingMaterialUsed', e.target.value)}
                                >
                                  <MenuItem value='true'>Yes</MenuItem>
                                  <MenuItem value='false'>No</MenuItem>
                                </TextField>
                              </Grid>
                            )}
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                disabled
                                label='Total Price'
                                value={product.totalPrice}
                                InputProps={{ startAdornment: <span>₹</span> }}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                type='number'
                                label='Discount'
                                value={product.discount}
                                onChange={e => handleProductChange(index, 'discount', e.target.value)}
                                InputProps={{ startAdornment: <span>₹</span> }}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                disabled
                                label='Final Price'
                                value={product.finalPrice}
                                InputProps={{ startAdornment: <span>₹</span> }}
                              />
                            </Grid>
                          </>
                        ) : (
                          <>
                            <Grid item xs={12} md={3}>
                              <TextField fullWidth label='Type' value={product.type} disabled />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField fullWidth label='Product Name' value={product.name} disabled />
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <TextField
                                fullWidth
                                label='Quantity'
                                value={`${product.qty}ml x ${product.nos}`}
                                disabled
                              />
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <TextField fullWidth label='Total Price' value={`₹${product.totalPrice}`} disabled />
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <TextField fullWidth label='Discount' value={`₹${product.discount}`} disabled />
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <TextField fullWidth label='Final Price' value={`₹${product.finalPrice}`} disabled />
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Box>
                  ))}
                </Grid>
                {/* Payment Section */}
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className='ri-money-dollar-circle-line' />
                    Payment Details
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        disabled
                        label='Total Amount'
                        value={
                          (editMode
                            ? (editData?.products?.reduce((sum, p) => sum + p.finalPrice, 0) || 0) +
                              (editData?.courierPrice || 0)
                            : viewModal.data.totalAmount) || 0
                        }
                        InputProps={{ startAdornment: <span>₹</span> }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        disabled
                        label='Paid Amount'
                        value={(viewModal.data.totalAmount || 0) - (viewModal.data.remainingAmount || 0)}
                        InputProps={{ startAdornment: <span>₹</span> }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        disabled
                        label='Remaining Amount'
                        value={viewModal.data.remainingAmount || 0}
                        InputProps={{ startAdornment: <span>₹</span> }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                {/* Payment History Section */}
                {!editMode && (
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
                          {viewModal.data.payments?.map((payment, index) => (
                            <TableRow key={index}>
                              <TableCell>{formatDate(payment.date)}</TableCell>
                              <TableCell>{payment.method === 'online' ? 'Online Payment' : 'Cash Payment'}</TableCell>
                              <TableCell align='right'>{payment.amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {!viewModal.data.payments?.length && (
                            <TableRow>
                              <TableCell colSpan={3} align='center'>
                                No payment records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
                {/* Action Buttons */}
                {editMode && (
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                    <Button
                      variant='outlined'
                      onClick={() => {
                        setEditMode(false)
                        setEditData(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant='contained' onClick={handleSaveEdit} startIcon={<i className='ri-save-line' />}>
                      Save Changes
                    </Button>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        </Modal>
        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-delete-bin-line' style={{ color: 'red' }} />
            Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this transaction? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancel</Button>
            <Button
              color='error'
              variant='contained'
              onClick={() => deleteDialog.id && handleDeleteTransaction(deleteDialog.id)}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default SalesTransactionLayout
