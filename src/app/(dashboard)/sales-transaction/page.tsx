import SalesHistoryLayout from '@/views/sales-history/SalesHistoryLayout'
import SalesTransactionLayout from '@/views/sales-transaction/SalesTransactionLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <SalesTransactionLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
