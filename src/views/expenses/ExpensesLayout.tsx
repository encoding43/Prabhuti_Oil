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

interface Expense {
  _id?: string
  id?: number
  name: string
  date: string
  amount: number
  note: string
}

// Update the form state interface
interface FormData {
  name: string
  date: string
  amount: string
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

const ExpensesLayout = () => {
  // States
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(15)
  const [filterType, setFilterType] = useState<'month' | 'year'>('month')
  const [selectedPeriod, setSelectedPeriod] = useState('')

  // Modal states
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  // Form states
  const [formData, setFormData] = useState<FormData>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    note: ''
  })

  // Fetch expenses from API
  const fetchExpenses = async () => {
    try {
      setLoading(true)
      let url = '/api/expenses'

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
        throw new Error('Failed to fetch expenses')
      }

      const data = await response.json()
      setExpenses(data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load expenses when component mounts or filters change
  useEffect(() => {
    fetchExpenses()
  }, [selectedPeriod, filterType])

  // Filter periods based on type
  const getPeriodOptions = () => {
    const uniquePeriods = new Set()

    expenses.forEach(expense => {
      const date = new Date(expense.date)
      if (filterType === 'month') {
        uniquePeriods.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      } else {
        uniquePeriods.add(date.getFullYear())
      }
    })

    return Array.from(uniquePeriods).sort().reverse()
  }

  // Filter expenses
  const filteredExpenses = expenses

  // Handlers
  const handleSubmit = async (isEdit: boolean = false) => {
    try {
      setLoading(true)

      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit ? JSON.stringify({ id: selectedExpense?._id, ...formData }) : JSON.stringify(formData)

      const response = await fetch('/api/expenses', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} expense`)
      }

      // Refresh expense list after successful submission
      await fetchExpenses()

      // Close modal and reset form
      if (isEdit) {
        setEditModal(false)
      } else {
        setAddModal(false)
      }

      resetForm()
    } catch (error) {
      console.error('Error submitting expense:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete expense')
      }

      // Refresh expense list after successful deletion
      await fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setLoading(false)
    }
  }

  // Replace handleInputChange with direct field change approach as in AddSaleLayout
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      name: expense.name,
      date: expense.date,
      amount: expense.amount.toString(),
      note: expense.note
    })
    setEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      note: ''
    })
    setSelectedExpense(null)
  }

  // Update modal open handlers to reset form
  const handleAddModalOpen = () => {
    resetForm() // Reset form before opening
    setAddModal(true)
  }

  const handleEditModalOpen = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      name: expense.name,
      date: expense.date,
      amount: expense.amount.toString(),
      note: expense.note
    })
    setEditModal(true)
  }

  // Update modal close handlers
  const handleModalClose = (isEdit: boolean) => {
    if (isEdit) {
      setEditModal(false)
    } else {
      setAddModal(false)
    }
    resetForm() // Reset form when closing
    setSelectedExpense(null)
  }

  // Pagination
  const renderPageNumbers = () => {
    const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage)
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

  // Update ExpenseModal component with fixed input handling (similar to AddSaleLayout)
  const ExpenseModal = ({ isEdit = false }) => (
    <Modal
      open={isEdit ? editModal : addModal}
      onClose={() => handleModalClose(isEdit)}
      aria-labelledby={isEdit ? 'edit-expense-modal' : 'add-expense-modal'}
      aria-describedby='expense-form'
    >
      <Box sx={modalStyle}>
        <Typography
          id={isEdit ? 'edit-expense-modal' : 'add-expense-modal'}
          variant='h6'
          component='h2'
          sx={{ mb: 4, position: 'sticky', top: 0, bgcolor: 'background.paper', pb: 2 }}
        >
          {isEdit ? 'Edit Expense' : 'Add New Expense'}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label='Expense Name'
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type='date'
              label='Date'
              value={formData.date}
              onChange={e => handleFieldChange('date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type='number'
              label='Amount'
              value={formData.amount}
              onChange={e => handleFieldChange('amount', e.target.value)}
              InputProps={{ startAdornment: <span>₹</span> }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label='Note'
              value={formData.note}
              onChange={e => handleFieldChange('note', e.target.value)}
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
        title='Expenses'
        action={
          <Button variant='contained' onClick={handleAddModalOpen}>
            Add Expense
          </Button>
        }
      />
      <CardContent>
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
                  <TableCell>Name</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align='right'>Amount (₹)</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center'>
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((expense, index) => (
                    <TableRow key={expense._id || expense.id || index}>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell align='right'>{expense.amount.toLocaleString()}</TableCell>
                      <TableCell>{expense.note}</TableCell>
                      <TableCell align='center'>
                        <IconButton
                          color='primary'
                          onClick={() => {
                            setSelectedExpense(expense)
                            setFormData({
                              name: expense.name,
                              date: new Date(expense.date).toISOString().split('T')[0],
                              amount: expense.amount.toString(),
                              note: expense.note
                            })
                            setEditModal(true)
                          }}
                        >
                          <i className='ri-edit-line' />
                        </IconButton>
                        <IconButton color='error' onClick={() => expense._id && handleDelete(expense._id)}>
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

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant='body2' sx={{ mr: 2 }}>
            Jump to page:
          </Typography>
          {renderPageNumbers()}
        </Box>
      </CardContent>

      <ExpenseModal />
      <ExpenseModal isEdit />
    </Card>
  )
}

export default ExpensesLayout
