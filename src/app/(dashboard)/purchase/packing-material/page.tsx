import AddSaleLayouts from '@/views/add-sale/AddSaleLayouts'
import PackingMaterialLayout from '@/views/purchase/packing-material/PackingMaterialLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PackingMaterialLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
