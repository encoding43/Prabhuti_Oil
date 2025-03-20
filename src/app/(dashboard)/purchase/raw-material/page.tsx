import RawMaterialLayout from '@/views/purchase/raw-material/RawMaterialLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <RawMaterialLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
