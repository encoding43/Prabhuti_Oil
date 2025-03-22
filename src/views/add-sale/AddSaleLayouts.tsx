'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'

interface Product {
  _id: string
  type: 'oil' | 'other'
  name: string
  rawMaterialId: string
  recoveryRate: number
  quantities: {
    qty: number
    price: number
    packingMaterialId?: string
  }[]
}

interface ProductItem {
  type: 'oil' | 'other'
  productId?: string
  name: string
  qty: number
  nos: number
  isPackagingMaterialUsed: boolean
  totalPrice: number
  discount: number
  finalPrice: number
  packingMaterialId?: string
}

interface FormData {
  date: string
  customerName: string
  customerMobile: string
  customerAddress: string
  products: ProductItem[]
  saleType: 'direct' | 'courier'
  courierPrice: number
  onlineAmount: number
  cashAmount: number
  remainingAmount: number
  payments: Array<{
    method: 'online' | 'cash'
    amount: number
    date: string
  }>
}

const AddSaleLayouts = () => {
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    customerName: '',
    customerMobile: '',
    customerAddress: '',
    products: [],
    saleType: 'direct',
    courierPrice: 0,
    onlineAmount: 0,
    cashAmount: 0,
    remainingAmount: 0,
    payments: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [packingMaterials, setPackingMaterials] = useState<any[]>([])

  // Fetch products when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Fetch packing materials when component mounts
  useEffect(() => {
    const fetchPackingMaterials = async () => {
      try {
        const response = await fetch('/api/packing-materials')
        if (!response.ok) throw new Error('Failed to fetch packing materials')
        const data = await response.json()
        setPackingMaterials(data)
      } catch (error) {
        console.error('Error fetching packing materials:', error)
      }
    }

    fetchPackingMaterials()
  }, [])

  const handleAddProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          type: 'oil',
          name: '',
          qty: 0,
          nos: 1,
          isPackagingMaterialUsed: true,
          totalPrice: 0,
          discount: 0,
          finalPrice: 0
        }
      ]
    }))
  }

  const handleDeleteProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }))
  }

  const calculateProductPrice = (product: ProductItem) => {
    const productData = products.find(p => p._id === product.productId)
    if (!productData) return 0

    const qtyPrice = productData.quantities.find(
      q => q.qty === product.qty && q.packingMaterialId === product.packingMaterialId
    )
    if (!qtyPrice) return 0

    return qtyPrice.price * product.nos
  }

  const handleProductChange = (index: number, field: keyof ProductItem, value: any) => {
    const updatedProducts = [...formData.products]
    const currentProduct = { ...updatedProducts[index] }

    if (field === 'productId') {
      const productData = products.find(p => p._id === value)
      if (productData) {
        currentProduct.type = productData.type
        currentProduct.name = productData.name
        currentProduct.productId = value
        // Reset other values when product changes
        currentProduct.qty = 0
        currentProduct.packingMaterialId = ''
        currentProduct.totalPrice = 0
        currentProduct.discount = 0
        currentProduct.finalPrice = 0
      }
    } else if (field === 'quantity') {
      // Handle combined qty and packingMaterialId change
      const [qty, packingMaterialId] = (value as string).split('-')
      currentProduct.qty = Number(qty)
      currentProduct.packingMaterialId = packingMaterialId

      // Recalculate price
      currentProduct.totalPrice = calculateProductPrice({
        ...currentProduct,
        qty: Number(qty),
        packingMaterialId
      })
      currentProduct.finalPrice = currentProduct.totalPrice - (currentProduct.discount || 0)
    } else if (field === 'nos') {
      currentProduct.nos = Number(value)
      currentProduct.totalPrice = calculateProductPrice(currentProduct)
      currentProduct.finalPrice = currentProduct.totalPrice - (currentProduct.discount || 0)
    } else if (field === 'discount') {
      currentProduct.discount = Number(value)
      currentProduct.finalPrice = currentProduct.totalPrice - Number(value)
    } else {
      currentProduct[field] = value
    }

    updatedProducts[index] = currentProduct
    setFormData(prev => ({ ...prev, products: updatedProducts }))
  }

  // Calculate total and remaining amounts
  useEffect(() => {
    const totalAmount = formData.products.reduce((sum, product) => sum + product.finalPrice, 0)
    const finalTotal = totalAmount + formData.courierPrice
    const remaining = finalTotal - formData.onlineAmount - formData.cashAmount

    setFormData(prev => ({ ...prev, remainingAmount: remaining }))
  }, [formData.products, formData.courierPrice, formData.onlineAmount, formData.cashAmount])

  // Handle complete payment
  const handleCompletePayment = (type: 'online' | 'cash') => {
    if (type === 'online') {
      setFormData(prev => ({
        ...prev,
        onlineAmount: prev.remainingAmount,
        cashAmount: 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        cashAmount: prev.remainingAmount,
        onlineAmount: 0
      }))
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Calculate final amounts
      const totalAmount =
        formData.products.reduce((sum, product) => sum + product.finalPrice, 0) + formData.courierPrice
      const paidAmount = formData.onlineAmount + formData.cashAmount
      const remainingAmount = totalAmount - paidAmount

      const submitData = {
        ...formData,
        totalAmount,
        remainingAmount,
        status: remainingAmount > 0 ? 'pending' : 'completed'
        // The payments will be created on the server side based on onlineAmount and cashAmount
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) throw new Error('Failed to submit sale')

      // Success handling
      alert('Sale submitted successfully!')
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        customerMobile: '',
        customerAddress: '',
        products: [],
        saleType: 'direct',
        courierPrice: 0,
        onlineAmount: 0,
        cashAmount: 0,
        remainingAmount: 0,
        payments: []
      })
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to submit sale. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add a helper function for packing material display
  const getQuantityDisplayText = (product: Product | undefined, quantity: any) => {
    if (!product) return ''
    return quantity.displayName || `${quantity.qty}ml - ₹${quantity.price}`
  }

  return (
    <Card>
      <CardHeader title='New Sale Entry' />
      <CardContent>
        <form onSubmit={e => e.preventDefault()}>
          <Grid container spacing={5}>
            {/* Customer Information Section */}
            <Grid item xs={12}>
              <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='ri-user-line' />
                Customer Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type='date'
                    label='Date'
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Customer Name'
                    value={formData.customerName}
                    onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Mobile Number'
                    value={formData.customerMobile}
                    onChange={e => setFormData(prev => ({ ...prev, customerMobile: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={1}
                    label='Address'
                    value={formData.customerAddress}
                    onChange={e => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    sx={{ '& .MuiInputBase-root': { height: '56px' } }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Products Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h6' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='ri-shopping-basket-line' />
                  Products
                </Typography>
                <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={handleAddProduct}>
                  Add Product
                </Button>
              </Box>

              {formData.products.map((product, index) => (
                <Box key={index} sx={{ mb: 3, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Grid container spacing={3}>
                    <Grid
                      item
                      xs={12}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
                    >
                      <Typography variant='subtitle1' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className='ri-price-tag-3-line' />
                        Product #{index + 1}
                      </Typography>
                      <IconButton
                        color='error'
                        onClick={() => handleDeleteProduct(index)}
                        sx={{ '&:hover': { transform: 'scale(1.1)' } }}
                      >
                        <i className='ri-delete-bin-6-line' />
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
                        {loading ? (
                          <MenuItem disabled>Loading products...</MenuItem>
                        ) : (
                          products
                            .filter(p => p.type === product.type)
                            .map(p => (
                              <MenuItem key={p._id} value={p._id}>
                                {p.name}
                              </MenuItem>
                            ))
                        )}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <TextField
                        select
                        fullWidth
                        label='Quantity'
                        value={`${product.qty}-${product.packingMaterialId || ''}`}
                        onChange={e => {
                          const [qty, packingMaterialId] = e.target.value.split('-')
                          handleProductChange(index, 'quantity', e.target.value)
                        }}
                      >
                        {products
                          .find(p => p._id === product.productId)
                          ?.quantities.map(q => (
                            <MenuItem key={`${q.qty}-${q.packingMaterialId}`} value={`${q.qty}-${q.packingMaterialId}`}>
                              {getQuantityDisplayText(
                                products.find(p => p._id === product.productId),
                                q
                              )}
                            </MenuItem>
                          ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        type='number'
                        label='Nos'
                        value={product.nos}
                        onChange={e => handleProductChange(index, 'nos', Number(e.target.value))}
                      />
                    </Grid>

                    {product.type === 'oil' && (
                      <Grid item xs={12} md={3}>
                        <TextField
                          select
                          fullWidth
                          label='Packaging Material'
                          value={product.isPackagingMaterialUsed}
                          onChange={e =>
                            handleProductChange(index, 'isPackagingMaterialUsed', e.target.value === 'true')
                          }
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
                        onChange={e => handleProductChange(index, 'discount', Number(e.target.value))}
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
                  </Grid>
                </Box>
              ))}
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Sale Type Section */}
            <Grid item xs={12}>
              <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='ri-truck-line' />
                Delivery Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label='Sale Type'
                    value={formData.saleType}
                    onChange={e => setFormData(prev => ({ ...prev, saleType: e.target.value as 'direct' | 'courier' }))}
                  >
                    <MenuItem value='direct'>Direct</MenuItem>
                    <MenuItem value='courier'>Courier</MenuItem>
                  </TextField>
                </Grid>
                {formData.saleType === 'courier' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Courier Price'
                      value={formData.courierPrice}
                      onChange={e => setFormData(prev => ({ ...prev, courierPrice: Number(e.target.value) }))}
                      InputProps={{ startAdornment: <span>₹</span> }}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Payment Section */}
            <Grid item xs={12}>
              <Typography variant='h6' sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='ri-money-dollar-circle-line' />
                Payment Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type='number'
                    label='Online Amount'
                    value={formData.onlineAmount}
                    onChange={e => setFormData(prev => ({ ...prev, onlineAmount: Number(e.target.value) }))}
                    InputProps={{
                      startAdornment: <span>₹</span>,
                      endAdornment: (
                        <Button size='small' onClick={() => handleCompletePayment('online')}>
                          Complete
                        </Button>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type='number'
                    label='Cash Amount'
                    value={formData.cashAmount}
                    onChange={e => setFormData(prev => ({ ...prev, cashAmount: Number(e.target.value) }))}
                    InputProps={{
                      startAdornment: <span>₹</span>,
                      endAdornment: (
                        <Button size='small' onClick={() => handleCompletePayment('cash')}>
                          Complete
                        </Button>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    disabled
                    label='Remaining Amount'
                    value={formData.remainingAmount}
                    InputProps={{ startAdornment: <span>₹</span> }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant='contained'
                size='large'
                onClick={handleSubmit}
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? <CircularProgress size={20} color='inherit' /> : <i className='ri-save-line' />
                }
              >
                {isSubmitting ? 'Submitting...' : 'Submit Sale'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  )
}

export default AddSaleLayouts
