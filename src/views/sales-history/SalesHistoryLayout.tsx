'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Types for our data
interface SalesSummary {
  _id: string
  date: Date
  totalSales: number
  totalExpenses: number
  pendingAmount: number
  rawMaterialUsed: Array<{ materialId: string; quantity: number }>
}

// Update the formatDate function
const formatDate = (date: string | Date, viewType: string) => {
  const d = new Date(date)
  if (!isNaN(d.getTime())) {
    // Check if date is valid
    switch (viewType) {
      case 'month':
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      case 'year':
        return d.getFullYear().toString()
      default:
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
    }
  }
  return 'Invalid Date'
}

const SalesHistoryLayout = () => {
  // States
  const [viewType, setViewType] = useState<'day' | 'month' | 'year'>('day')
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(15)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SalesSummary[]>([])

  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        setLoading(true)
        let endpoint = '/api/sales/history'
        if (viewType !== 'day') {
          endpoint += `?groupBy=${viewType}`
        }
        const response = await fetch(endpoint)
        const data = await response.json()
        console.log(data)
        setData(data)
      } catch (error) {
        console.error('Error fetching sales history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesHistory()
  }, [viewType])

  // Handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleViewTypeChange = (event: any) => {
    setViewType(event.target.value)
    setPage(0)
  }

  // Add new function for custom page selector
  const renderPageNumbers = () => {
    const totalPages = Math.ceil(data.length / rowsPerPage)
    const pages = []

    for (let i = 0; i < totalPages; i++) {
      pages.push(
        <Tooltip key={i} title={`Go to page ${i + 1}`}>
          <Button
            size='small'
            variant={page === i ? 'contained' : 'outlined'}
            onClick={() => handleChangePage(null, i)}
            sx={{
              minWidth: '35px',
              mx: 0.5,
              p: '5px',
              height: '30px'
            }}
          >
            {i + 1}
          </Button>
        </Tooltip>
      )
    }
    return pages
  }

  return (
    <Card>
      <CardHeader title='Sales History' titleTypographyProps={{ sx: { color: 'primary.main' } }} />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label='View Type'
              value={viewType}
              onChange={handleViewTypeChange}
              sx={{ mb: 4 }}
            >
              <MenuItem value='day'>Day Wise</MenuItem>
              <MenuItem value='month'>Month Wise</MenuItem>
              <MenuItem value='year'>Year Wise</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {viewType === 'day' ? 'Date' : viewType === 'month' ? 'Month' : 'Year'}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600 }}>
                      Total Sale (₹)
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600 }}>
                      Amount Pending (₹)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} align='center' sx={{ py: 5 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                      <TableRow key={row._id}>
                        <TableCell>{formatDate(row.date, viewType)}</TableCell>
                        <TableCell align='right'>{row.totalSales.toLocaleString()}</TableCell>
                        <TableCell align='right'>{row.pendingAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
            >
              <Typography variant='body2' sx={{ mr: 2 }}>
                Jump to page:
              </Typography>
              {renderPageNumbers()}
            </Box>
            <TablePagination
              rowsPerPageOptions={[15]}
              component='div'
              count={data.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              showFirstButton
              showLastButton
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default SalesHistoryLayout
