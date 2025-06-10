import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  IconButton,
  Grid,
  Tooltip,
  Slider,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { mrContentApiService, assetUploadService } from '../services/api';

interface FileUpload {
  file: File | null;
  preview: string;
}

const steps = ['Basic Information', 'Upload Media', 'Review & Create'];

const getVideoDimensions = (file: File): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      });
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
};

export const CreateMRContent: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [renderType, setRenderType] = useState<'IMAGE' | 'GROUND'>('GROUND');
  const [scale, setScale] = useState<number>(1.00);
  const [height, setHeight] = useState<number>(0.00);
  const [image, setImage] = useState<FileUpload>({ file: null, preview: '' });
  const [originalVideo, setOriginalVideo] = useState<FileUpload>({ file: null, preview: '' });
  const [maskVideo, setMaskVideo] = useState<FileUpload>({ file: null, preview: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const generateUniqueName = (file: File, prefix: string): string => {
    // Generate a unique ID using timestamp and random string
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    // Get file extension
    const extension = file.name.split('.').pop();
    // Combine prefix, unique ID and extension
    return `${prefix}/${uniqueId}.${extension}`;
  };

  const getContentType = (file: File): string => {
    // For videos, always use video/mp4
    if (file.type.startsWith('video/')) {
      return 'video/mp4';
    }
    // For images, always use image/jpeg
    if (file.type.startsWith('image/')) {
      return 'image/jpeg';
    }
    return file.type;
  };

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    try {
      // Generate a unique object name
      const objectName = generateUniqueName(file, prefix);
      
      setUploadProgress(`Generating signed URL for ${file.name}...`);
      
      // Get content type, defaulting to application/octet-stream if not available
      const contentType = file.type || 'application/octet-stream';
      
      // Generate signed URL with explicit content type
      const data = await assetUploadService.generateSignedUrl({
        object_name: objectName,
        content_type: contentType,
        expiration_minutes: 30
      });

      setUploadProgress(`Uploading ${file.name}...`);
      
      // Upload using the exact same configuration as the test code
      await assetUploadService.uploadFile(data.url, file, contentType);

      // Return the full URL from the signed URL response
      return data.url.split('?')[0];
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload file';
      throw new Error(`Error uploading ${file.name}: ${errorMessage}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadProgress('Starting upload...');
    setError(null);
    setLoading(true);

    try {
      // Upload files first with experiences as parent folder
      const videoUrl = await uploadFile(originalVideo.file!, 'experiences/videos/original');
      const imageUrl = image.file ? await uploadFile(image.file, 'experiences/images') : null;
      const maskVideoUrl = maskVideo.file ? await uploadFile(maskVideo.file, 'experiences/videos/mask') : null;

      setUploadProgress('Creating content record...');

      // Create content record with the uploaded URLs
      const contentData = {
        name: name,
        render_type: renderType,
        scale: Number(scale.toFixed(2)),
        height: Number(height.toFixed(2)),
        images: imageUrl ? [{ k: 'original', v: imageUrl }] : [],
        videos: [
          { k: 'original', v: videoUrl },
          ...(maskVideoUrl ? [{ k: 'mask', v: maskVideoUrl }] : []),
        ]
      };

      await mrContentApiService.createContent(contentData);
      
      setUploadProgress('Content created successfully!');
      navigate('/mr-content');
    } catch (error: any) {
      console.error('Form submission error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create content');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleOriginalVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalVideo({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleMaskVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Get original video dimensions and duration
        const originalVideoDims = await getVideoDimensions(originalVideo.file!);
        const maskVideoDims = await getVideoDimensions(file);

        // First check aspect ratio (within 1% tolerance)
        const originalAspectRatio = originalVideoDims.width / originalVideoDims.height;
        const maskAspectRatio = maskVideoDims.width / maskVideoDims.height;
        const aspectRatioDiff = Math.abs(originalAspectRatio - maskAspectRatio);

        if (aspectRatioDiff > 0.01) {
          setError('Mask video aspect ratio does not match original video');
          setMaskVideo({ file: null, preview: '' });
          return;
        }

        // Only check duration if aspect ratio matches
        const durationDiff = Math.abs(originalVideoDims.duration - maskVideoDims.duration);
        if (durationDiff > 0.1) {
          setError('Mask video duration does not match original video');
          setMaskVideo({ file: null, preview: '' });
          return;
        }

        setMaskVideo({
          file,
          preview: URL.createObjectURL(file),
        });
        setError(null);
      } catch (error) {
        console.error('Error validating mask video:', error);
        setError('Failed to validate mask video');
        setMaskVideo({ file: null, preview: '' });
      }
    }
  };

  const FileUploadCard = ({ 
    title, 
    required, 
    accept, 
    file, 
    preview, 
    onChange, 
    onDelete 
  }: { 
    title: string;
    required?: boolean;
    accept: string;
    file: File | null;
    preview: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
  }) => (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">{title} {required && <span style={{ color: 'red' }}>*</span>}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={`Upload ${title.toLowerCase()}`}>
            <IconButton
              component="label"
              disabled={loading}
              color="primary"
              size="small"
            >
              <UploadIcon />
              <input
                type="file"
                hidden
                accept={accept}
                onChange={onChange}
              />
            </IconButton>
          </Tooltip>
          {file && (
            <Tooltip title={`Remove ${title}`}>
              <IconButton
                color="error"
                size="small"
                onClick={onDelete}
                disabled={loading}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {preview && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          {accept.includes('image') ? (
            <img
              src={preview}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
            />
          ) : (
            <video
              src={preview}
              controls
              style={{ maxWidth: '100%', maxHeight: 200 }}
            />
          )}
        </Box>
      )}
    </Paper>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <TextField
              label="Content Name"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!name && activeStep === 0}
              helperText={!name && activeStep === 0 ? "Content name is required" : ""}
            />
            <TextField
              select
              label="Render Type"
              fullWidth
              value={renderType}
              onChange={(e) => setRenderType(e.target.value as 'IMAGE' | 'GROUND')}
              SelectProps={{
                native: true,
              }}
            >
              <option value="GROUND">Ground</option>
              <option value="IMAGE">Image</option>
            </TextField>
            <Divider sx={{ my: 3 }} />
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={3}>
            <FileUploadCard
              title="Image"
              accept="image/*"
              file={image.file}
              preview={image.preview}
              onChange={handleImageChange}
              onDelete={() => setImage({ file: null, preview: '' })}
            />
            <FileUploadCard
              title="Original Video"
              required
              accept="video/*"
              file={originalVideo.file}
              preview={originalVideo.preview}
              onChange={handleOriginalVideoChange}
              onDelete={() => setOriginalVideo({ file: null, preview: '' })}
            />
            <FileUploadCard
              title="Mask Video"
              accept="video/*"
              file={maskVideo.file}
              preview={maskVideo.preview}
              onChange={handleMaskVideoChange}
              onDelete={() => setMaskVideo({ file: null, preview: '' })}
            />
            <Divider sx={{ my: 3 }} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Scale
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Slider
                    value={scale}
                    onChange={(_, value) => setScale(value as number)}
                    min={0.1}
                    max={10}
                    step={0.01}
                    valueLabelDisplay="auto"
                    sx={{
                      flex: 1,
                      color: 'primary.main',
                      height: 8,
                      '& .MuiSlider-thumb': {
                        height: 28,
                        width: 28,
                        backgroundColor: 'primary.main',
                        boxShadow: '0 0 0 8px rgba(25,118,210,0.16)',
                        border: '2px solid #fff',
                        '&:hover, &.Mui-focusVisible, &.Mui-active': {
                          boxShadow: '0 0 0 12px rgba(25,118,210,0.24)',
                        },
                      },
                      '& .MuiSlider-rail': {
                        opacity: 0.3,
                        backgroundColor: 'primary.main',
                        height: 8,
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: 'primary.main',
                        height: 8,
                      },
                    }}
                  />
                  <TextField
                    value={scale.toFixed(2)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0.1 && value <= 10) {
                        setScale(value);
                      }
                    }}
                    type="number"
                    inputProps={{ step: 0.01, min: 0.1, max: 10 }}
                    sx={{ width: 80 }}
                    size="small"
                  />
                </Box>
              </Box>
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Height
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Slider
                    value={height}
                    onChange={(_, value) => setHeight(value as number)}
                    min={0}
                    max={10}
                    step={0.01}
                    valueLabelDisplay="auto"
                    sx={{
                      flex: 1,
                      color: 'primary.main',
                      height: 8,
                      '& .MuiSlider-thumb': {
                        height: 28,
                        width: 28,
                        backgroundColor: 'primary.main',
                        boxShadow: '0 0 0 8px rgba(25,118,210,0.16)',
                        border: '2px solid #fff',
                        '&:hover, &.Mui-focusVisible, &.Mui-active': {
                          boxShadow: '0 0 0 12px rgba(25,118,210,0.24)',
                        },
                      },
                      '& .MuiSlider-rail': {
                        opacity: 0.3,
                        backgroundColor: 'primary.main',
                        height: 8,
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: 'primary.main',
                        height: 8,
                      },
                    }}
                  />
                  <TextField
                    value={height.toFixed(2)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 10) {
                        setHeight(value);
                      }
                    }}
                    type="number"
                    inputProps={{ step: 0.01, min: 0, max: 10 }}
                    sx={{ width: 80 }}
                    size="small"
                  />
                </Box>
              </Box>
            </Stack>
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Review Your Content</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography><strong>Name:</strong> {name}</Typography>
                <Typography><strong>Render Type:</strong> {renderType}</Typography>
                <Typography><strong>Scale:</strong> {scale.toFixed(2)}</Typography>
                <Typography><strong>Height:</strong> {height.toFixed(2)}</Typography>
              </Stack>
            </Paper>

            {image.preview && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Image</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                  <img
                    src={image.preview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                  />
                </Box>
              </Paper>
            )}

            {originalVideo.preview && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Original Video</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                  <video
                    src={originalVideo.preview}
                    controls
                    style={{ maxWidth: '100%', maxHeight: 200 }}
                  />
                </Box>
              </Paper>
            )}

            {maskVideo.preview && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Mask Video</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                  <video
                    src={maskVideo.preview}
                    controls
                    style={{ maxWidth: '100%', maxHeight: 200 }}
                  />
                </Box>
              </Paper>
            )}
          </Stack>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={() => navigate('/mr-content')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Create New MR Content
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {uploadProgress && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {uploadProgress}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 2 }}>
              Back
            </Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Creating...' : 'Create Content'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !name) || 
                (activeStep === 1 && !originalVideo.file)
              }
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}; 