import PendingBillsLayout from '@/views/pending-bills/PendingBillsLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PendingBillsLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
