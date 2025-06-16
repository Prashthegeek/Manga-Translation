import {
    Box,
    Button,
    Container,
    Heading,
    Text,
    VStack,
    Link,
    useColorModeValue,
    Alert,
    AlertIcon,
  } from '@chakra-ui/react';
  import { useNavigate, useLocation, Navigate } from 'react-router-dom';
  import axios from 'axios';
  import { saveAs } from 'file-saver';
  import { useState } from 'react';

  export default function DownloadPage() {
    const { state } = useLocation();
    const pdfUrl = state?.pdfUrl;
    const bgColor = useColorModeValue('gray.50', 'gray.700');
    const navigate = useNavigate();
    const [downloadError, setDownloadError] = useState('');

    // Redirect to home if no pdfUrl
    if (!pdfUrl) {
      return <Navigate to="/" replace />;
    }

    const handleDownload = async () => {
      try {
        setDownloadError('');
        const response = await axios.get(pdfUrl, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        saveAs(blob, 'modified-document.pdf');
      } catch (error) {
        console.error('Download failed:', error);
        setDownloadError('Failed to download the PDF. Please try again.');
      }
    };

    return (
      <Container maxW="container.md" py={10}>
        <VStack spacing={8}>
          <Heading>Your Modified PDF is Ready!</Heading>
          {downloadError && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {downloadError}
            </Alert>
          )}
          <Box w="100%" p={4} borderWidth="1px" borderRadius="lg" bg={bgColor}>
            <VStack spacing={4}>
              <Text>Download your modified PDF below.</Text>
              <Button colorScheme="blue" size="lg" onClick={handleDownload}>
                Download PDF
              </Button>
              <Link color="blue.500" onClick={() => navigate('/')}>
                Upload another PDF
              </Link>
            </VStack>
          </Box>
        </VStack>
      </Container>
    );
  }