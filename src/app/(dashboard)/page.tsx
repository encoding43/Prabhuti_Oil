// MUI Imports
import Grid from '@mui/material/Grid'

// Components Imports

import Banner from '@views/dashboard/Banner'

const DashboardAnalytics = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Banner />
      </Grid>
    </Grid>
  )
}

export default DashboardAnalytics
