import AddSaleLayouts from '@/views/add-sale/AddSaleLayouts'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <AddSaleLayouts />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
