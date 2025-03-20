import AuditLayout from '@/views/audit/AuditLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <AuditLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
