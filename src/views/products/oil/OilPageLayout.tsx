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

interface Oil {
  id: string
  name: string
  recoveryRate: number
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
  width: 800, // Increased from 400 to 800
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 1,
  maxHeight: '90vh', // Add max height
  overflow: 'auto' // Add scrolling if content is too long
}

const OilPageLayout = () => {
  // State for products and materials
  const [oils, setOils] = useState<Oil[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([])

  // States
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOil, setSelectedOil] = useState<Oil | null>(null)
  const [newOilModal, setNewOilModal] = useState(false)
  const [rateModal, setRateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)

  const [newOilForm, setNewOilForm] = useState({
    name: '',
    recoveryRate: 0,
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

  // Modified to fetch products with material names
  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/products')

      if (!response.ok) throw new Error('Failed to fetch products')

      const data = await response.json()

      // Filter for oil products
      const oilProducts = data.filter((product: any) => product.type === 'oil')

      // Format the data to match our interface
      const formattedOils = oilProducts.map((product: any) => ({
        id: product._id,
        name: product.name,
        recoveryRate: product.recoveryRate,
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

      setOils(formattedOils)
    } catch (error) {
      console.error('Error fetching products:', error)
      // Don't set any default products here
      setOils([])
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

  // Handlers
  const handleAddRate = () => {
    if (rateInput.packingMaterialId && rateInput.rate > 0) {
      // Check for duplicates
      if (isPackingMaterialAlreadyAdded(rateInput.packingMaterialId, newOilForm.rates)) {
        alert('This packing material is already added. Please select a different one.')
        return
      }

      setNewOilForm(prev => ({
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
    setNewOilForm(prev => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index)
    }))
  }

  const handleNewOilSubmit = async () => {
    try {
      if (!newOilForm.name || !newOilForm.rawMaterialId || newOilForm.recoveryRate <= 0) {
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
          type: 'oil',
          name: newOilForm.name,
          rawMaterialId: newOilForm.rawMaterialId,
          recoveryRate: newOilForm.recoveryRate,
          quantities: newOilForm.rates.map(rate => ({
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

      setNewOilModal(false)
      setNewOilForm({
        name: '',
        recoveryRate: 0,
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

  const handleUpdateOil = async (oilId: string, updates: Partial<Oil>) => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: oilId,
          recoveryRate: updates.recoveryRate,
          quantities: updates.rates?.map(rate => ({
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
      console.error('Error updating oil:', error)
      alert('Failed to update oil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditRate = (oilId: string, rateIndex: number, updates: Partial<Rate>) => {
    // Fix: Update selectedOil instead of oils
    if (selectedOil && selectedOil.id === oilId) {
      const updatedRates = [...selectedOil.rates]
      updatedRates[rateIndex] = { ...updatedRates[rateIndex], ...updates }

      // If qty was updated, update the display name too
      if (updates.qty !== undefined) {
        const packingMaterial = getPackingMaterial(updatedRates[rateIndex].packingMaterialId)
        updatedRates[rateIndex].displayName = createPackageDisplayName(updates.qty, packingMaterial)
      }

      setSelectedOil({
        ...selectedOil,
        rates: updatedRates
      })
    }
  }

  const handleDeleteRate = (oilId: string, rateIndex: number) => {
    // Fix: Update selectedOil instead of oils
    if (selectedOil && selectedOil.id === oilId) {
      const updatedRates = selectedOil.rates.filter((_, index) => index !== rateIndex)

      setSelectedOil({
        ...selectedOil,
        rates: updatedRates
      })
    }
  }

  // Helper to find packing material by ID
  const getPackingMaterial = (id: string) => {
    return packingMaterials.find(m => m._id === id)
  }

  // Helper to check if packing material is already used
  const isPackingMaterialAlreadyAdded = (packingMaterialId: string, rates: Rate[], currentIndex: number = -1) => {
    return rates.some((rate, index) => rate.packingMaterialId === packingMaterialId && index !== currentIndex)
  }

  // Add rate to an existing oil during editing
  const handleAddRateToExistingOil = () => {
    if (!selectedOil) return

    if (editRateInput.packingMaterialId && editRateInput.rate > 0) {
      // Check if this packing material is already used
      if (isPackingMaterialAlreadyAdded(editRateInput.packingMaterialId, selectedOil.rates)) {
        alert('This packing material is already added. Please select a different one.')
        return
      }

      const selectedMaterial = packingMaterials.find(m => m._id === editRateInput.packingMaterialId)
      const displayName = createPackageDisplayName(editRateInput.qty, selectedMaterial)

      const updatedOil = {
        ...selectedOil,
        rates: [
          ...selectedOil.rates,
          {
            ...editRateInput,
            displayName
          }
        ]
      }

      setSelectedOil(updatedOil)

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
    if (!material) return 'ml' // Default to ml for oil products
    return material.type.toLowerCase().includes('g') && !material.type.toLowerCase().includes('ml') ? 'g' : 'ml'
  }

  // Helper to get formatted display text for packing materials
  const getPackingMaterialDisplayText = (material: PackingMaterial | undefined) => {
    if (!material) return 'Unknown'
    const unit = getPackingMaterialUnit(material)
    return `${material.name} (${material.capacity}${unit})`
  }

  // Add a function to create consistent display names for packaging
  const createPackageDisplayName = (qty: number, packingMaterial: PackingMaterial | undefined) => {
    if (!packingMaterial) return `${qty}ml`
    const unit = getPackingMaterialUnit(packingMaterial)
    return `${qty}${unit} - ${packingMaterial.name}`
  }

  return (
    <Card>
      <CardHeader
        title='Oil Products'
        action={
          <Button variant='contained' onClick={() => setNewOilModal(true)}>
            Add New Oil
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
                  <TableCell>Oil Name</TableCell>
                  <TableCell>Recovery Rate (%)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {oils.map((oil, index) => (
                  <TableRow key={oil.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{oil.name}</TableCell>
                    <TableCell>{oil.recoveryRate}%</TableCell>
                    <TableCell>
                      <Button
                        size='small'
                        onClick={() => {
                          setSelectedOil(oil)
                          setRateModal(true)
                        }}
                      >
                        Rates
                      </Button>
                      <Button
                        size='small'
                        onClick={() => {
                          setSelectedOil(oil)
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

        {/* New Oil Modal */}
        <Modal open={newOilModal} onClose={() => setNewOilModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Add New Oil
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Name'
                  value={newOilForm.name}
                  onChange={e => setNewOilForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label='Raw Material'
                  value={newOilForm.rawMaterialId}
                  onChange={e => setNewOilForm(prev => ({ ...prev, rawMaterialId: e.target.value }))}
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Recovery Rate (%)'
                  value={newOilForm.recoveryRate === 0 ? '' : newOilForm.recoveryRate}
                  onChange={e => setNewOilForm(prev => ({ ...prev, recoveryRate: Number(e.target.value) }))}
                />
              </Grid>

              {/* Updated Rate inputs with simplified UI */}
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
                      value={rateInput.rate === 0 ? '' : rateInput.rate}
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

              {/* Display added rates */}
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
                      {newOilForm.rates.map((rate, index) => {
                        const packingMaterial = getPackingMaterial(rate.packingMaterialId)
                        return (
                          <TableRow key={index}>
                            <TableCell>{packingMaterial ? packingMaterial.name : 'Unknown'}</TableCell>
                            <TableCell>
                              {rate.qty}
                              {getPackingMaterialUnit(packingMaterial)}
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
                <Button fullWidth variant='contained' onClick={handleNewOilSubmit} disabled={isLoading}>
                  Submit
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>

        {/* Rate Modal */}
        <Modal open={rateModal} onClose={() => setRateModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Rates - {selectedOil?.name}
            </Typography>
            {selectedOil && selectedOil.rates && selectedOil.rates.length > 0 ? (
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
                    {selectedOil.rates.map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {rate.qty}
                          {getPackingMaterialUnit(getPackingMaterial(rate.packingMaterialId))}
                        </TableCell>
                        <TableCell>{rate.displayName}</TableCell>
                        <TableCell>₹{rate.rate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant='body1' sx={{ textAlign: 'center', my: 2 }}>
                No rates available for this oil.
              </Typography>
            )}
          </Box>
        </Modal>

        {/* Edit Modal */}
        <Modal open={editModal} onClose={() => setEditModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Edit Oil
            </Typography>
            {selectedOil && (
              <div>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField fullWidth label='Oil Name' value={selectedOil.name} disabled />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label='Raw Material' value={selectedOil.rawMaterial} disabled />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type='number'
                      label='Recovery Rate (%)'
                      value={selectedOil.recoveryRate === 0 ? '' : selectedOil.recoveryRate}
                      onChange={e =>
                        selectedOil && setSelectedOil({ ...selectedOil, recoveryRate: Number(e.target.value) })
                      }
                    />
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
                              setEditRateInput({
                                packingMaterialId: e.target.value,
                                qty: selectedMaterial.capacity,
                                displayName: `${selectedMaterial.capacity}${getPackingMaterialUnit(selectedMaterial)}`,
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
                          value={editRateInput.rate === 0 ? '' : editRateInput.rate}
                          onChange={e => setEditRateInput(prev => ({ ...prev, rate: Number(e.target.value) }))}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <Button fullWidth variant='contained' onClick={handleAddRateToExistingOil}>
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
                          {selectedOil.rates && selectedOil.rates.length > 0 ? (
                            selectedOil.rates.map((rate, index) => {
                              const packingMaterial = getPackingMaterial(rate.packingMaterialId)
                              return (
                                <TableRow key={index}>
                                  <TableCell>{packingMaterial ? packingMaterial.name : 'Unknown'}</TableCell>
                                  <TableCell>
                                    <TextField
                                      size='small'
                                      type='number'
                                      value={rate.qty === 0 ? '' : rate.qty}
                                      onChange={e =>
                                        handleEditRate(selectedOil.id, index, { qty: Number(e.target.value) })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      size='small'
                                      value={rate.displayName}
                                      onChange={e =>
                                        handleEditRate(selectedOil.id, index, { displayName: e.target.value })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      size='small'
                                      type='number'
                                      value={rate.rate === 0 ? '' : rate.rate}
                                      onChange={e =>
                                        handleEditRate(selectedOil.id, index, { rate: Number(e.target.value) })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <IconButton size='small' onClick={() => handleDeleteRate(selectedOil.id, index)}>
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
                      onClick={() =>
                        handleUpdateOil(selectedOil.id, {
                          recoveryRate: selectedOil.recoveryRate,
                          rates: selectedOil.rates
                        })
                      }
                      disabled={isLoading}
                    >
                      {isLoading ? 'Updating...' : 'Update'}
                    </Button>
                  </Grid>
                </Grid>
              </div>
            )}
          </Box>
        </Modal>
      </CardContent>
    </Card>
  )
}

export default OilPageLayout
