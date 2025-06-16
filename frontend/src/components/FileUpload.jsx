import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  Image,
  Progress,
  useColorModeValue,
  Alert,
  AlertIcon,
  CloseButton,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import uploadIcon from '../assets/upload.png'

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setFile(droppedFiles[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10));
      }, 300);

      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },

      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setIsProcessing(true);

      const { url_link } = response.data;
      console.log("secure_url is " , url_link)

      // Brief delay for UX
      setTimeout(() => {
        setIsProcessing(false);
        setShowSuccess(true);
        setTimeout( () =>{
            navigate('/download', { state: { pdfUrl: url_link } });
        },1000); //total delay = 2.5 sec 
      }, 1500);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to process your PDF. Please try again.');
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8}>
        <Heading>Upload Your PDF</Heading>

        {showSuccess && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            PDF uploaded successfully! Redirecting to download...
            <CloseButton
              position="absolute"
              right="8px"
              top="8px"
              onClick={() => setShowSuccess(false)}
            />
          </Alert>
        )}

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
            <CloseButton
              position="absolute"
              right="8px"
              top="8px"
              onClick={() => setError('')}
            />
          </Alert>
        )}

        <Box
          w="100%"
          p={10}
          border="2px dashed"
          borderColor={isDragging ? 'blue.400' : borderColor}
          borderRadius="lg"
          bg={bgColor}
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ borderColor: 'blue.300' }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            type="file"
            id="fileInput"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept=".pdf"
          />
          <Flex direction="column" align="center" justify="center">
            <Image src={uploadIcon} alt="Upload icon" boxSize={["80px", "100px", "120px"]} mb={4} />
            {isDragging ? (
              <Text fontSize="lg" textAlign="center">
                Drop your PDF here
              </Text>
            ) : (
              <Text fontSize="lg" textAlign="center">
                Drag and drop a PDF here, or click to select
              </Text>
            )}
            {file && (
              <Text mt={2} fontWeight="bold" color="green.500">
                Selected: {file.name}
              </Text>
            )}
          </Flex>
        </Box>

        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleUpload}
          isLoading={isUploading}
          loadingText="Uploading"
          isDisabled={!file || isUploading || isProcessing}
          w="100%"
        >
          Upload PDF
        </Button>

        {isUploading && (
          <VStack w="100%" spacing={2}>
            <Progress value={uploadProgress} w="100%" colorScheme="blue" />
            <Text>Uploading your PDF...</Text>
          </VStack>
        )}

        {isProcessing && (
          <Center flexDirection="column" gap={4}>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize="lg" fontWeight="medium">
              We’re preparing your modified PDF...
            </Text>
          </Center>
        )}
      </VStack>
    </Container>
  );
}