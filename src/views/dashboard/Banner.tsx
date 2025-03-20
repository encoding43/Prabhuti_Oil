'use client'

import Card from '@mui/material/Card'
import Image from 'next/image'
import Box from '@mui/material/Box'

const Banner = () => {
  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: theme => theme.shape.borderRadius,
        mb: 4,
        height: 'calc(100vh - 180px)', // Adjust height to take full space minus header and footer
        minHeight: '500px' // Minimum height for smaller screens
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%' // Take full height of parent
        }}
      >
        <Image
          src='/images/banner/PrabhutiOilBanner1.webp'
          alt='Prabhuti Oil Banner'
          fill
          priority
          sizes='100vw'
          style={{
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
      </Box>
    </Card>
  )
}

export default Banner
