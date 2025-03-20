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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

interface MiscIncome {
  _id?: string
  id?: number
  title: string
  date: string
  amount: number
  paymentMethod: string
  note: string
}

// Add form data interface
interface FormData {
  title: string
  date: string
  amount: string
  paymentMethod: string
  note: string
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 450 },
  maxWidth: 500,
  bgcolor: 'background.paper',
  borderRadius: 1,
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto'
}

const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Check', 'Credit Card']

const MiscellaneousLayout = () => {
  // States
  const [incomes, setIncomes] = useState<MiscIncome[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(15)
  const [filterType, setFilterType] = useState<'month' | 'year'>('month')
  const [selectedPeriod, setSelectedPeriod] = useState('')

  // Modal states
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<MiscIncome | null>(null)

  // Form states with proper typing
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: '',
    note: ''
  })

  // Fetch incomes from API
  const fetchIncomes = async () => {
    try {
      setLoading(true)
      let url = '/api/misc-income'

      if (selectedPeriod && filterType === 'month') {
        const year = selectedPeriod.split('-')[0]
        const month = selectedPeriod.split('-')[1]
        const startDate = `${selectedPeriod}-01`

        // Calculate end date of month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        const endDate = `${selectedPeriod}-${lastDay}`

        url += `?startDate=${startDate}&endDate=${endDate}`
      } else if (selectedPeriod && filterType === 'year') {
        const year = selectedPeriod
        const startDate = `${year}-01-01`
        const endDate = `${year}-12-31`

        url += `?startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch misc incomes')
      }

      const data = await response.json()
      setIncomes(data)
    } catch (error) {
      console.error('Error fetching incomes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load incomes when component mounts or filters change
  useEffect(() => {
    fetchIncomes()
  }, [selectedPeriod, filterType])

  // Add handleInputChange function for fixing cursor issue
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Add period filtering functions
  const getPeriodOptions = () => {
    const uniquePeriods = new Set()

    incomes.forEach(income => {
      const date = new Date(income.date)
      if (filterType === 'month') {
        uniquePeriods.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      } else {
        uniquePeriods.add(date.getFullYear())
      }
    })

    return Array.from(uniquePeriods).sort().reverse()
  }

  // Filter incomes
  const filteredIncomes = incomes.filter(income => {
    if (!selectedPeriod) return true

    const date = new Date(income.date)
    if (filterType === 'month') {
      return income.date.startsWith(selectedPeriod)
    } else {
      return date.getFullYear() === Number(selectedPeriod)
    }
  })

  // Add pagination rendering
  const renderPageNumbers = () => {
    const totalPages = Math.ceil(filteredIncomes.length / rowsPerPage)
    const pages = []

    for (let i = 0; i < totalPages; i++) {
      pages.push(
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
      )
    }
    return pages
  }

  // Add resetForm function
  const resetForm = () => {
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMethod: '',
      note: ''
    })
    setSelectedIncome(null)
  }

  // Function to handle modal open
  const handleAddModalOpen = () => {
    resetForm() // Reset form before opening
    setAddModal(true)
  }

  // Function to handle modal close
  const handleModalClose = (isEdit: boolean) => {
    if (isEdit) {
      setEditModal(false)
    } else {
      setAddModal(false)
    }
    resetForm() // Reset form when closing
  }

  // Function to handle edit
  const handleEdit = (income: MiscIncome) => {
    setSelectedIncome(income)
    setFormData({
      title: income.title,
      date: income.date,
      amount: income.amount.toString(),
      paymentMethod: income.paymentMethod,
      note: income.note
    })
    setEditModal(true)
  }

  // Function to handle form submission
  const handleSubmit = async (isEdit: boolean) => {
    try {
      setLoading(true)

      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit ? JSON.stringify({ id: selectedIncome?._id, ...formData }) : JSON.stringify(formData)

      const response = await fetch('/api/misc-income', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} income`)
      }

      // Refresh income list after successful submission
      await fetchIncomes()

      // Close modal and reset form
      if (isEdit) {
        setEditModal(false)
      } else {
        setAddModal(false)
      }

      resetForm()
    } catch (error) {
      console.error('Error submitting income:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income entry?')) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/misc-income?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete income')
      }

      // Refresh income list after successful deletion
      await fetchIncomes()
    } catch (error) {
      console.error('Error deleting income:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setLoading(false)
    }
  }

  // Updated ExpenseModal component for Miscellaneous Income with fixed input handling
  const IncomeModal = ({ isEdit = false }) => (
    <Modal
      open={isEdit ? editModal : addModal}
      onClose={() => handleModalClose(isEdit)}
      aria-labelledby={isEdit ? 'edit-income-modal' : 'add-income-modal'}
      aria-describedby='income-form'
    >
      <Box sx={modalStyle}>
        <Typography variant='h6' component='h2' sx={{ mb: 4 }}>
          {isEdit ? 'Edit Miscellaneous Income' : 'Add New Miscellaneous Income'}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='title'
              label='Income Title'
              value={formData.title}
              onChange={handleInputChange}
              InputProps={{ inputProps: { autoComplete: 'off' } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='paymentMethod'
              select
              label='Payment Method'
              value={formData.paymentMethod}
              onChange={handleInputChange}
              InputProps={{ inputProps: { autoComplete: 'off' } }}
            >
              {paymentMethods.map(method => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='date'
              type='date'
              label='Date'
              value={formData.date}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{ inputProps: { autoComplete: 'off' } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='amount'
              type='number'
              label='Amount'
              value={formData.amount}
              onChange={handleInputChange}
              InputProps={{
                startAdornment: <span>₹</span>,
                inputProps: { autoComplete: 'off' }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name='note'
              multiline
              minRows={2}
              label='Note'
              value={formData.note}
              onChange={handleInputChange}
              InputProps={{
                style: { height: 'auto' },
                inputProps: { autoComplete: 'off' }
              }}
              sx={{ '& .MuiInputBase-root': { height: 'auto !important' } }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant='contained'
              onClick={() => handleSubmit(isEdit)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  )

  return (
    <Card>
      <CardHeader
        title='Miscellaneous Income'
        action={
          <Button variant='contained' onClick={handleAddModalOpen}>
            Add Income
          </Button>
        }
      />
      <CardContent>
        {/* Add filter controls */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label='Filter Type'
              value={filterType}
              onChange={e => {
                setFilterType(e.target.value as 'month' | 'year')
                setSelectedPeriod('')
              }}
            >
              <MenuItem value='month'>Month Wise</MenuItem>
              <MenuItem value='year'>Year Wise</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label='Select Period'
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value=''>All</MenuItem>
              {getPeriodOptions().map((period: unknown) => (
                <MenuItem key={period as string} value={period as string}>
                  {period as string}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sr. No</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align='right'>Amount (₹)</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incomes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      No income entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  incomes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((income, index) => (
                    <TableRow key={income._id || income.id || index}>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>{income.title}</TableCell>
                      <TableCell>{income.paymentMethod}</TableCell>
                      <TableCell>{new Date(income.date).toLocaleDateString()}</TableCell>
                      <TableCell align='right'>{income.amount.toLocaleString()}</TableCell>
                      <TableCell>{income.note}</TableCell>
                      <TableCell align='center'>
                        <IconButton
                          color='primary'
                          onClick={() => {
                            setSelectedIncome(income)
                            setFormData({
                              title: income.title,
                              date: new Date(income.date).toISOString().split('T')[0],
                              amount: income.amount.toString(),
                              paymentMethod: income.paymentMethod,
                              note: income.note
                            })
                            setEditModal(true)
                          }}
                        >
                          <i className='ri-edit-line' />
                        </IconButton>
                        <IconButton color='error' onClick={() => income._id && handleDelete(income._id)}>
                          <i className='ri-delete-bin-line' />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add pagination */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant='body2' sx={{ mr: 2 }}>
            Jump to page:
          </Typography>
          {renderPageNumbers()}
        </Box>
      </CardContent>

      <IncomeModal />
      <IncomeModal isEdit />
    </Card>
  )
}

export default MiscellaneousLayout
