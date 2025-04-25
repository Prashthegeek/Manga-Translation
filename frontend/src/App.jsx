import { Box, Heading, Text, VStack, Button, Spinner } from '@chakra-ui/react';
import { useState } from 'react';
import Upload from './Uploads';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    // Reset previous results
    setOcrText('');
    setTranslatedText('');
    setUploadMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a file first.');
      return;
    }
    setProcessing(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      console.log("the raw response from backend is ", response);
      const data = await response.json();
      console.log("the data is after .json method" , data , "and type of data is ", typeof data);
      console.log('Upload response:', data);

      setOcrText(data.ocrText);
      setTranslatedText(data.translatedText);
      setUploadMessage('File processed successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage('Error uploading file.');
    }
    setProcessing(false);
  };

  return (
    <Box textAlign="center" mt={10} p={4}>
      <Heading mb={6}>My OCR & Translation App</Heading>
      <Upload onFileSelect={handleFileSelect} />
      {selectedFile && (
        <VStack spacing={2} mt={4}>
          <Text fontSize="lg" fontWeight="semibold">
            File ready for processing: {selectedFile.name}
          </Text>
          <Button colorScheme="teal" onClick={handleUpload}>
            Upload and Process File
          </Button>
        </VStack>
      )}
      {processing && <Spinner mt={4} />}

      {uploadMessage && (
        <Text mt={4} fontSize="md" color="blue.500">
          {uploadMessage}
        </Text>
      )}  {/*message of either success or failure */}

      {(ocrText || translatedText) && (
        <Box mt={8} p={4} borderWidth={1} borderRadius="md">
          <Text fontSize="lg" fontWeight="bold">
            OCR Text:
          </Text>
          <Text mb={4}>{ocrText}</Text>

          <Text fontSize="lg" fontWeight="bold">
            Translated Text:
          </Text>
          <Text mb={4}>{translatedText}</Text>
        </Box>
      )}
    </Box>
  );
}

export default App;
