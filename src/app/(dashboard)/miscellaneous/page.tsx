import ProtectedRoute from '@/components/ProtectedRoute'
import MiscellaneousLayout from '@/views/miscellaneous/MiscellaneousLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <ProtectedRoute>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <MiscellaneousLayout />
        </Grid>
      </Grid>
    </ProtectedRoute>
  )
}

export default FormLayouts
