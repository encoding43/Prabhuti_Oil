'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'

interface Rate {
  qty: number
  displayName: string
  rate: number
  packingMaterialId: string
}

interface Product {
  id: string
  name: string
  rawMaterial: string
  rawMaterialId: string
  rates: Rate[]
}

interface RawMaterial {
  _id: string
  name: string
  currentStock: number
}

interface PackingMaterial {
  _id: string
  name: string
  type: string
  capacity: number
  currentStock: number
}

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 800,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 1,
  maxHeight: '90vh',
  overflow: 'auto'
}
const getPackingMaterialUnit = (material: PackingMaterial | undefined) => {
  if (!material) return 'ml' // Default to ml for oil products
  return material.type.toLowerCase().includes('g') && !material.type.toLowerCase().includes('ml') ? 'g' : 'ml'
}
// Add a function to create consistent display names for packaging
const createPackageDisplayName = (qty: number, packingMaterial: PackingMaterial | undefined) => {
  if (!packingMaterial) return `${qty}g`
  const unit = getPackingMaterialUnit(packingMaterial)
  return `${qty}${unit} - ${packingMaterial.name}`
}

const OtherPageLayout = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [newProductModal, setNewProductModal] = useState(false)
  const [rateModal, setRateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    rawMaterialId: '',
    rates: [] as Rate[]
  })

  const [rateInput, setRateInput] = useState({
    qty: 0,
    displayName: '',
    rate: 0,
    packingMaterialId: ''
  })

  // Add state for edit rate input
  const [editRateInput, setEditRateInput] = useState({
    qty: 0,
    displayName: '',
    rate: 0,
    packingMaterialId: ''
  })

  // Fetch raw materials from API
  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials')
      if (!response.ok) throw new Error('Failed to fetch raw materials')

      const data = await response.json()
      setRawMaterials(data)
    } catch (error) {
      console.error('Error fetching raw materials:', error)
      setRawMaterials([])
    }
  }

  // Fetch packing materials from API
  const fetchPackingMaterials = async () => {
    try {
      const response = await fetch('/api/packing-materials')
      if (!response.ok) throw new Error('Failed to fetch packing materials')

      const data = await response.json()
      setPackingMaterials(data)
    } catch (error) {
      console.error('Error fetching packing materials:', error)
      setPackingMaterials([])
    }
  }

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/products')

      if (!response.ok) throw new Error('Failed to fetch products')

      const data = await response.json()

      // Filter for other products
      const otherProducts = data.filter((product: any) => product.type === 'other')

      // Format the data to match our interface
      const formattedProducts = otherProducts.map((product: any) => ({
        id: product._id,
        name: product.name,
        rawMaterialId: product.rawMaterialId,
        rawMaterial: product.rawMaterialName || 'Unknown',
        rates:
          product.quantities?.map((q: any) => ({
            qty: q.qty,
            displayName: q.displayName,
            rate: q.price,
            packingMaterialId: q.packingMaterialId
          })) || []
      }))

      setProducts(formattedProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Add useEffect to fetch products and materials on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true)
      await Promise.all([fetchProducts(), fetchRawMaterials(), fetchPackingMaterials()])
      setIsLoading(false)
    }

    fetchAllData()
  }, [])

  // Helper to check if packing material is already used
  const isPackingMaterialAlreadyAdded = (packingMaterialId: string, rates: Rate[], currentIndex: number = -1) => {
    return rates.some((rate, index) => rate.packingMaterialId === packingMaterialId && index !== currentIndex)
  }

  // Add rate to an existing product during editing
  const handleAddRateToExistingProduct = () => {
    if (!selectedProduct) return

    if (editRateInput.packingMaterialId && editRateInput.rate > 0) {
      // Check if this packing material is already used
      if (isPackingMaterialAlreadyAdded(editRateInput.packingMaterialId, selectedProduct.rates)) {
        alert('This packing material is already added. Please select a different one.')
        return
      }

      const selectedMaterial = packingMaterials.find(m => m._id === editRateInput.packingMaterialId)
      const displayName = createPackageDisplayName(editRateInput.qty, selectedMaterial)

      const updatedProduct = {
        ...selectedProduct,
        rates: [
          ...selectedProduct.rates,
          {
            ...editRateInput,
            displayName
          }
        ]
      }

      setSelectedProduct(updatedProduct)

      // Reset the input
      setEditRateInput({
        qty: 0,
        displayName: '',
        rate: 0,
        packingMaterialId: ''
      })
    } else {
      alert('Please select a packing material and enter a rate')
    }
  }

  // Enhanced helper to get the correct display unit based on packing material type
  const getPackingMaterialUnit = (material: PackingMaterial | undefined) => {
    if (!material) return 'g'
    return material.type.toLowerCase().includes('ml') || material.type.toLowerCase().includes('liter') ? 'ml' : 'g'
  }

  // Helper to get formatted display text for packing materials
  const getPackingMaterialDisplayText = (material: PackingMaterial | undefined) => {
    if (!material) return 'Unknown'
    const unit = getPackingMaterialUnit(material)
    return `${material.name} (${material.capacity}${unit})`
  }

  // Validate before adding rate to new form
  const handleAddRate = () => {
    if (rateInput.packingMaterialId && rateInput.rate > 0) {
      // Check for duplicates
      if (isPackingMaterialAlreadyAdded(rateInput.packingMaterialId, newProductForm.rates)) {
        alert('This packing material is already added. Please select a different one.')
        return
      }

      setNewProductForm(prev => ({
        ...prev,
        rates: [...prev.rates, { ...rateInput }]
      }))
      setRateInput({
        qty: 0,
        displayName: '',
        rate: 0,
        packingMaterialId: ''
      })
    } else {
      alert('Please select a packing material and enter a rate')
    }
  }

  const handleRemoveRate = (index: number) => {
    setNewProductForm(prev => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index)
    }))
  }

  const handleNewProductSubmit = async () => {
    try {
      if (!newProductForm.name || !newProductForm.rawMaterialId) {
        alert('Please fill all required fields')
        return
      }

      setIsLoading(true)

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'other',
          name: newProductForm.name,
          rawMaterialId: newProductForm.rawMaterialId,
          recoveryRate: 100, // Default for non-oil products
          quantities: newProductForm.rates.map(rate => ({
            qty: rate.qty,
            displayName: rate.displayName,
            price: rate.rate,
            packingMaterialId: rate.packingMaterialId
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create product')
      }

      // Refresh the products list
      await fetchProducts()

      setNewProductModal(false)
      setNewProductForm({
        name: '',
        rawMaterialId: '',
        rates: []
      })
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Failed to create product')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to find packing material name by ID
  const getPackingMaterialName = (id: string) => {
    const material = packingMaterials.find(m => m._id === id)
    return material ? material.name : 'Unknown'
  }

  // Helper to find packing material by ID
  const getPackingMaterial = (id: string) => {
    return packingMaterials.find(m => m._id === id)
  }

  // Modified function to maintain the original unit
  const getUnitFromProduct = (product: any) => {
    return product?.type === 'oil' ? 'ml' : 'g'
  }

  const handleEditRate = (productId: string, rateIndex: number, updates: Partial<Rate>) => {
    if (selectedProduct && selectedProduct.id === productId) {
      const updatedRates = [...selectedProduct.rates]
      updatedRates[rateIndex] = { ...updatedRates[rateIndex], ...updates }

      // If qty was updated, update the display name too
      if (updates.qty !== undefined) {
        const packingMaterial = getPackingMaterial(updatedRates[rateIndex].packingMaterialId)
        updatedRates[rateIndex].displayName = createPackageDisplayName(updates.qty, packingMaterial)
      }

      setSelectedProduct({
        ...selectedProduct,
        rates: updatedRates
      })
    }
  }

  const handleDeleteRate = (productId: string, rateIndex: number) => {
    // Fix: Update selectedProduct instead of products
    if (selectedProduct && selectedProduct.id === productId) {
      const updatedRates = selectedProduct.rates.filter((_, index) => index !== rateIndex)

      setSelectedProduct({
        ...selectedProduct,
        rates: updatedRates
      })
    }
  }

  // Update product with all changes including rates
  const handleUpdateProduct = async (productId: string) => {
    if (!selectedProduct) return

    try {
      setIsLoading(true)

      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: productId,
          quantities: selectedProduct.rates.map(rate => ({
            qty: rate.qty,
            displayName: rate.displayName,
            price: rate.rate,
            packingMaterialId: rate.packingMaterialId
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update product')
      }

      await fetchProducts()
      setEditModal(false)
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Failed to update product')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title='Other Products'
        action={
          <Button variant='contained' onClick={() => setNewProductModal(true)}>
            Add New Product
          </Button>
        }
      />
      <CardContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sr. No</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Button
                        size='small'
                        onClick={() => {
                          setSelectedProduct(product)
                          setRateModal(true)
                        }}
                      >
                        Rates
                      </Button>
                      <Button
                        size='small'
                        onClick={() => {
                          setSelectedProduct(product)
                          setEditModal(true)
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* New Product Modal - Updated */}
        <Modal open={newProductModal} onClose={() => setNewProductModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Add New Product
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Name'
                  value={newProductForm.name}
                  onChange={e => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label='Raw Material'
                  value={newProductForm.rawMaterialId}
                  onChange={e => setNewProductForm(prev => ({ ...prev, rawMaterialId: e.target.value }))}
                >
                  {rawMaterials && rawMaterials.length > 0 ? (
                    rawMaterials.map(material => (
                      <MenuItem key={material._id} value={material._id}>
                        {material.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value='' disabled>
                      No raw materials available
                    </MenuItem>
                  )}
                </TextField>
              </Grid>

              {/* Updated Rate inputs with correct unit handling */}
              <Grid item xs={12}>
                <Typography variant='subtitle1' sx={{ mb: 2 }}>
                  Add Rates
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={5}>
                    <TextField
                      select
                      fullWidth
                      label='Packing Material'
                      value={rateInput.packingMaterialId}
                      onChange={e => {
                        const selectedMaterial = packingMaterials.find(m => m._id === e.target.value)
                        if (selectedMaterial) {
                          const unit = getPackingMaterialUnit(selectedMaterial)
                          const displayName = createPackageDisplayName(selectedMaterial.capacity, selectedMaterial)

                          setRateInput({
                            packingMaterialId: e.target.value,
                            qty: selectedMaterial.capacity,
                            displayName,
                            rate: 0
                          })
                        }
                      }}
                    >
                      {packingMaterials.map(material => (
                        <MenuItem key={material._id} value={material._id}>
                          {getPackingMaterialDisplayText(material)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Rate (₹)'
                      value={rateInput.rate}
                      onChange={e => setRateInput(prev => ({ ...prev, rate: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button fullWidth variant='contained' onClick={handleAddRate}>
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Grid>

              {/* Display added rates with correct units */}
              <Grid item xs={12}>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Packing Material</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Display Name</TableCell>
                        <TableCell>Rate (₹)</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {newProductForm.rates.map((rate, index) => {
                        const packingMaterial = getPackingMaterial(rate.packingMaterialId)
                        const unit = getPackingMaterialUnit(packingMaterial)
                        return (
                          <TableRow key={index}>
                            <TableCell>{packingMaterial ? packingMaterial.name : 'Unknown'}</TableCell>
                            <TableCell>
                              {rate.qty}
                              {unit}
                            </TableCell>
                            <TableCell>{rate.displayName}</TableCell>
                            <TableCell>₹{rate.rate}</TableCell>
                            <TableCell>
                              <IconButton size='small' onClick={() => handleRemoveRate(index)}>
                                <i className='ri-delete-bin-6-line' />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Button fullWidth variant='contained' onClick={handleNewProductSubmit} disabled={isLoading}>
                  Submit
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>

        {/* Rate Modal - Display with correct units */}
        <Modal open={rateModal} onClose={() => setRateModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Rates - {selectedProduct?.name}
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sr. No</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedProduct?.rates?.map((rate, index) => {
                    const packingMaterial = getPackingMaterial(rate.packingMaterialId)
                    const unit = getPackingMaterialUnit(packingMaterial)
                    return (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {rate.qty}
                          {unit}
                        </TableCell>
                        <TableCell>{rate.displayName}</TableCell>
                        <TableCell>₹{rate.rate}</TableCell>
                      </TableRow>
                    )
                  })}
                  {(!selectedProduct?.rates || selectedProduct.rates.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} align='center'>
                        No rates available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Modal>

        {/* Edit Modal - Also update with correct units */}
        <Modal open={editModal} onClose={() => setEditModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Edit Product
            </Typography>
            {selectedProduct && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField fullWidth label='Product Name' value={selectedProduct.name} disabled />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label='Raw Material' value={selectedProduct.rawMaterial} disabled />
                </Grid>

                {/* Add New Rate Section */}
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ mb: 2 }}>
                    Add New Rate
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={5}>
                      <TextField
                        select
                        fullWidth
                        label='Packing Material'
                        value={editRateInput.packingMaterialId}
                        onChange={e => {
                          const selectedMaterial = packingMaterials.find(m => m._id === e.target.value)
                          if (selectedMaterial) {
                            const unit = getPackingMaterialUnit(selectedMaterial)
                            setEditRateInput({
                              packingMaterialId: e.target.value,
                              qty: selectedMaterial.capacity,
                              displayName: `${selectedMaterial.capacity}${unit}`,
                              rate: 0
                            })
                          }
                        }}
                      >
                        {packingMaterials.map(material => (
                          <MenuItem key={material._id} value={material._id}>
                            {getPackingMaterialDisplayText(material)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        type='number'
                        label='Rate (₹)'
                        value={editRateInput.rate}
                        onChange={e => setEditRateInput(prev => ({ ...prev, rate: Number(e.target.value) }))}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <Button fullWidth variant='contained' onClick={handleAddRateToExistingProduct}>
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Existing Rates Table */}
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ mb: 2 }}>
                    Existing Rates
                  </Typography>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Packing Material</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Display Name</TableCell>
                          <TableCell>Rate (₹)</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedProduct.rates.length > 0 ? (
                          selectedProduct.rates.map((rate, index) => {
                            const packingMaterial = getPackingMaterial(rate.packingMaterialId)
                            const unit = getPackingMaterialUnit(packingMaterial)
                            return (
                              <TableRow key={index}>
                                <TableCell>{packingMaterial ? packingMaterial.name : 'Unknown'}</TableCell>
                                <TableCell>
                                  <TextField
                                    size='small'
                                    type='number'
                                    value={rate.qty}
                                    onChange={e =>
                                      handleEditRate(selectedProduct.id, index, { qty: Number(e.target.value) })
                                    }
                                  />
                                  {unit}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    size='small'
                                    value={rate.displayName}
                                    onChange={e =>
                                      handleEditRate(selectedProduct.id, index, { displayName: e.target.value })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    size='small'
                                    type='number'
                                    value={rate.rate}
                                    onChange={e =>
                                      handleEditRate(selectedProduct.id, index, { rate: Number(e.target.value) })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton size='small' onClick={() => handleDeleteRate(selectedProduct.id, index)}>
                                    <i className='ri-delete-bin-6-line' />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align='center'>
                              No rates available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={() => handleUpdateProduct(selectedProduct.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Update'}
                  </Button>
                </Grid>
              </Grid>
            )}
          </Box>
        </Modal>
      </CardContent>
    </Card>
  )
}

export default OtherPageLayout
