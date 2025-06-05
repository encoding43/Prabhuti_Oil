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
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import { RawMaterial, RawMaterialTransaction } from '@/models/RawMaterial'

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 1
}

const RawMaterialLayout = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [transactions, setTransactions] = useState<RawMaterialTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)

  // Modal states
  const [newMaterialModal, setNewMaterialModal] = useState(false)
  const [addStockModal, setAddStockModal] = useState(false)
  const [detailsModal, setDetailsModal] = useState(false)
  const [editModal, setEditModal] = useState(false)

  // Form states
  const [newMaterialForm, setNewMaterialForm] = useState({
    name: '',
    stock: 0,
    date: new Date().toISOString().split('T')[0],
    price: 0
  })

  const [addStockForm, setAddStockForm] = useState({
    date: new Date().toISOString().split('T')[0],
    stock: 0,
    price: 0
  })

  const [editForm, setEditForm] = useState({
    operation: 'add' as 'add' | 'subtract',
    date: new Date().toISOString().split('T')[0],
    stock: 0,
    price: 0
  })

  useEffect(() => {
    fetchMaterials()
    fetchTransactions()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials')
      const data = await response.json()
      setMaterials(data)
    } catch (error) {
      console.error('Error fetching materials:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/raw-material-transactions')
      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleNewMaterialSubmit = async () => {
    try {
      setIsLoading(true)

      // Set currentStock to 0 initially, will be updated through transaction
      const response = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMaterialForm.name,
          currentStock: 0 // Start with 0 and let transaction update it
        })
      })

      if (!response.ok) throw new Error('Failed to create material')
      const material = await response.json()

      // Create transaction to add initial stock instead of setting it directly
      if (newMaterialForm.stock > 0) {
        await fetch('/api/raw-material-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialId: material.insertedId,
            quantity: newMaterialForm.stock,
            price: newMaterialForm.price,
            date: newMaterialForm.date,
            note: 'Initial stock'
          })
        })
      }

      await fetchMaterials()
      await fetchTransactions()
      setNewMaterialModal(false)
      setNewMaterialForm({
        name: '',
        stock: 0,
        date: new Date().toISOString().split('T')[0],
        price: 0
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStock = async (materialId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/raw-material-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          quantity: addStockForm.stock,
          price: addStockForm.price,
          date: addStockForm.date,
          note: 'Stock added'
        })
      })

      if (!response.ok) throw new Error('Failed to update stock')

      await fetchMaterials()
      await fetchTransactions()
      setAddStockModal(false)
      setAddStockForm({
        date: new Date().toISOString().split('T')[0],
        stock: 0,
        price: 0
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSubmit = async () => {
    try {
      setIsLoading(true)
      if (!selectedMaterial?._id) return

      // Remove validation for non-zero values
      // Allow quantity to be zero or negative

      const response = await fetch('/api/raw-material-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: selectedMaterial._id.toString(),
          type: editForm.operation,
          quantity: editForm.operation === 'subtract' ? -Math.abs(editForm.stock) : editForm.stock,
          price: editForm.price || 0, // Default to 0 if not provided
          date: editForm.date,
          note: `Stock ${editForm.operation}ed`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update stock')
      }

      await fetchMaterials()
      await fetchTransactions()
      setEditModal(false)
      setEditForm({
        operation: 'add',
        date: new Date().toISOString().split('T')[0],
        stock: 0,
        price: 0
      })
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title='Raw Material Inventory'
        action={
          <Button variant='contained' onClick={() => setNewMaterialModal(true)}>
            Add New Raw Material
          </Button>
        }
      />
      <CardContent>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sr. No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Stock (KG)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.map((material, index) => (
                <TableRow key={material._id?.toString()}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>{material.currentStock}</TableCell>
                  <TableCell>
                    <Button
                      size='small'
                      onClick={() => {
                        setSelectedMaterial(material)
                        setAddStockModal(true)
                      }}
                    >
                      +Add
                    </Button>
                    <Button
                      size='small'
                      onClick={() => {
                        setSelectedMaterial(material)
                        setDetailsModal(true)
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      size='small'
                      onClick={() => {
                        setSelectedMaterial(material)
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

        {/* New Material Modal */}
        <Modal open={newMaterialModal} onClose={() => setNewMaterialModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Add New Raw Material
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Name'
                  value={newMaterialForm.name}
                  onChange={e => setNewMaterialForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Incoming Stock (KG)'
                  value={newMaterialForm.stock === 0 ? '' : newMaterialForm.stock}
                  onChange={e => setNewMaterialForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='date'
                  label='Date'
                  value={newMaterialForm.date}
                  onChange={e => setNewMaterialForm(prev => ({ ...prev, date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Price Total'
                  value={newMaterialForm.price === 0 ? '' : newMaterialForm.price}
                  onChange={e => setNewMaterialForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  InputProps={{ startAdornment: <span>₹</span> }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant='contained'
                  onClick={handleNewMaterialSubmit}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : null}
                >
                  {isLoading ? 'Submitting...' : 'Submit'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>

        {/* Add Stock Modal */}
        <Modal open={addStockModal} onClose={() => setAddStockModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Add Stock
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='date'
                  label='Date'
                  value={addStockForm.date}
                  onChange={e => setAddStockForm(prev => ({ ...prev, date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Incoming Stock (KG)'
                  value={addStockForm.stock === 0 ? '' : addStockForm.stock}
                  onChange={e => setAddStockForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Price'
                  value={addStockForm.price === 0 ? '' : addStockForm.price}
                  onChange={e => setAddStockForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  InputProps={{ startAdornment: <span>₹</span> }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant='contained'
                  onClick={() => selectedMaterial && handleAddStock(selectedMaterial._id?.toString() || '')}
                  disabled={isLoading}
                >
                  Submit
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>

        {/* Details Modal */}
        <Modal open={detailsModal} onClose={() => setDetailsModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              Transaction History
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Sr. No</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Stock (KG)</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions
                    .filter(t => t.materialId.toString() === selectedMaterial?._id?.toString())
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Most recent first
                    .map((transaction, index) => (
                      <TableRow key={transaction._id?.toString()}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell>{Math.abs(transaction.quantity)}</TableCell>
                        <TableCell>₹{transaction.price}</TableCell>
                        <TableCell
                          sx={{
                            color: transaction.type === 'add' ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {transaction.type === 'add' ? '+Add' : '-Subtract'}
                        </TableCell>
                        <TableCell>{transaction.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Modal>

        {/* Edit Modal */}
        <Modal open={editModal} onClose={() => setEditModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
              {editForm.operation === 'add' ? 'Add Stock' : 'Subtract Stock'}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label='Operation'
                  value={editForm.operation}
                  onChange={e => setEditForm(prev => ({ ...prev, operation: e.target.value as 'add' | 'subtract' }))}
                >
                  <MenuItem value='add'>Add</MenuItem>
                  <MenuItem value='subtract'>Subtract</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='date'
                  label='Date'
                  value={editForm.date}
                  onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Stock (KG)'
                  value={editForm.stock === 0 ? '' : editForm.stock}
                  onChange={e => setEditForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type='number'
                  label='Price'
                  value={editForm.price === 0 ? '' : editForm.price}
                  onChange={e => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  InputProps={{ startAdornment: <span>₹</span> }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant='contained'
                  onClick={handleEditSubmit}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : null}
                  color={editForm.operation === 'add' ? 'primary' : 'error'}
                >
                  {isLoading ? 'Processing...' : `${editForm.operation === 'add' ? 'Add' : 'Subtract'} Stock`}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>
      </CardContent>
    </Card>
  )
}

export default RawMaterialLayout
