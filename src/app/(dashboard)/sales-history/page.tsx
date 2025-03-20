import SalesHistoryLayout from '@/views/sales-history/SalesHistoryLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <SalesHistoryLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
