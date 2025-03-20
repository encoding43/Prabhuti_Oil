import MiscellaneousLayout from '@/views/miscellaneous/MiscellaneousLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <MiscellaneousLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
