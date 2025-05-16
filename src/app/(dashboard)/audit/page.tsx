import ProtectedRoute from '@/components/ProtectedRoute'
import AuditLayout from '@/views/audit/AuditLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <ProtectedRoute>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <AuditLayout />
        </Grid>
      </Grid>
    </ProtectedRoute>
  )
}

export default FormLayouts
