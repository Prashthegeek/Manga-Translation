import { useState, useEffect, useRef } from 'react';
import { Box, Button, Input, VStack, Text, Image } from '@chakra-ui/react';

const Upload = ({ onFileSelect }) => {
  const [fileName, setFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null); // <-- Ref for the file input

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);

      // If the file is an image, create a preview URL
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Cleanup the URL object when the component unmounts or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleReset = () => {
    // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }

    // Clear local state
    setFileName('');
    setPreviewUrl(null);

    // Notify the parent that file is reset
    onFileSelect(null);
  };

  return (
    <VStack spacing={4} align="center" mt={8}>
      <Input
        ref={fileInputRef}               // <-- Attach the ref here
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        maxW="md"
      />
      {fileName && <Text fontSize="md">Selected file: {fileName}</Text>}
      {previewUrl && (
        <Box boxSize="300px">
          <Image src={previewUrl} alt="Image preview" objectFit="contain" />
        </Box>
      )}
      {fileName && (
        <Button colorScheme="red" onClick={handleReset}>
          Remove File
        </Button>
      )}
    </VStack>
  );
};

export default Upload;
