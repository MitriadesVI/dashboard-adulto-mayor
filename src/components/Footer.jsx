import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        bgcolor: 'primary.main',
        color: 'white',
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" align="center">
            &copy; {new Date().getFullYear()} Distrito de Barranquilla - Programa Adulto Mayor
          </Typography>
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              mt: { xs: 2, md: 0 },
              gap: 2
            }}
          >
            <Link color="inherit" href="#" underline="hover">
              Términos de Uso
            </Link>
            <Link color="inherit" href="#" underline="hover">
              Política de Privacidad
            </Link>
            <Link color="inherit" href="#" underline="hover">
              Contacto
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;