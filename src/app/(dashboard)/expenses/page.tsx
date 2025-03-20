import ExpensesLayout from '@/views/expenses/ExpensesLayout'
import Grid from '@mui/material/Grid'

const FormLayouts = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <ExpensesLayout />
      </Grid>
    </Grid>
  )
}

export default FormLayouts
