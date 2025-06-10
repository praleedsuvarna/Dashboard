import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogContentText,
  Slider,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  ButtonGroup,
  Divider,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Palette as PaletteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { mrContentApiService, assetUploadService } from '../services/api';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import QRCode from 'react-qr-code';
import { ChromePicker, ColorResult } from 'react-color';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { settingsService } from '../services/settingsService';

interface MRContent {
  id: string;
  name: string;
  ref_id: string;
  render_type: 'IMAGE' | 'GROUND';
  has_alpha: boolean;
  images_original: string;
  videos_original: string;
  videos_mask?: string;
  status: 'processed' | 'processing' | 'draft';
  created_at: string;
  scale?: number;
  height?: number;
}

interface EditMRContentRequest {
  name: string;
  render_type: 'IMAGE' | 'GROUND';
  status: 'draft';
  images: Array<{ k: string; v: string }>;
  videos: Array<{ k: string; v: string }>;
  scale?: number;
  height?: number;
}

interface QRCodeCustomization {
  fgColor: string;
  bgColor: string;
  size: number;
  includeMargin: boolean;
  logo?: string;
  bodyShape: 'square' | 'rounded' | 'extra-rounded';
  eyeShape: 'square' | 'circle' | 'rounded' | 'flower' | 'leaf';
  eyeBallShape: 'square' | 'circle' | 'rounded' | 'diamond';
  gradient: {
    enabled: boolean;
    startColor: string;
    endColor: string;
    direction: 'horizontal' | 'vertical' | 'diagonal';
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'processed':
      return 'success';
    case 'processing':
      return 'warning';
    case 'draft':
    default:
      return 'default';
  }
};

// First, let's define a style element to inject CSS for QR code styling
const QRCodeStyles = () => {
  const styleClasses = `
    /* Base QR Container */
    .qr-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 8px;
    }

    /* QR Code SVG Styles */
    .qr-container svg {
      shape-rendering: crispEdges;
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: styleClasses }} />;
};

export const MRContent: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MRContent | null>(null);
  const [editFormData, setEditFormData] = useState<EditMRContentRequest>({
    name: '',
    render_type: 'GROUND',
    status: 'draft',
    images: [],
    videos: [],
  });
  const [originalVideoFile, setOriginalVideoFile] = useState<File | null>(null);
  const [maskVideoFile, setMaskVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<MRContent | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedContentForCustomization, setSelectedContentForCustomization] = useState<MRContent | null>(null);
  const defaultQRCustomization: QRCodeCustomization = {
    fgColor: '#000000',
    bgColor: '#ffffff',
    size: 200,
    includeMargin: true,
    bodyShape: 'square',
    eyeShape: 'square',
    eyeBallShape: 'square',
    gradient: {
      enabled: false,
      startColor: '#000000',
      endColor: '#000000',
      direction: 'horizontal'
    }
  };
  const [qrCustomization, setQrCustomization] = useState<QRCodeCustomization>(defaultQRCustomization);
  const [activeTab, setActiveTab] = useState(0);
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['mrContent', page, rowsPerPage],
    queryFn: () => mrContentApiService.getAllContent({ page: page + 1, limit: rowsPerPage }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; content: EditMRContentRequest }) =>
      mrContentApiService.updateContent(data.id, data.content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrContent'] });
      setEditDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mrContentApiService.deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrContent'] });
      setDeleteDialogOpen(false);
      setContentToDelete(null);
      enqueueSnackbar('Content deleted successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to delete content', { variant: 'error' });
    },
  });

  const filteredContent = useMemo(() => {
    if (!data?.data?.data) return [];
    if (!searchQuery) return data.data.data;

    const query = searchQuery.toLowerCase();
    return data.data.data.filter((content: MRContent) => {
      const contentType = `${content.render_type}${content.has_alpha ? ' (Alpha)' : ''}`.toLowerCase();
      return (
        content.name.toLowerCase().includes(query) ||
        content.ref_id.toLowerCase().includes(query) ||
        contentType.includes(query)
      );
    });
  }, [data?.data?.data, searchQuery]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleEdit = (content: MRContent) => {
    setSelectedContent(content);
    setEditFormData({
      name: content.name,
      render_type: content.render_type,
      status: 'draft',
      scale: content.scale || 1.00,
      height: content.height || 0.00,
      images: content.images_original ? [{ k: 'original', v: content.images_original }] : [],
      videos: [
        ...(content.videos_original ? [{ k: 'original', v: content.videos_original }] : []),
        ...(content.videos_mask ? [{ k: 'mask', v: content.videos_mask }] : [])
      ],
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedContent) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      // Handle image upload if new image is selected
      if (imageFile) {
        const signedUrlResponse = await assetUploadService.generateSignedUrl({
          object_name: `${Date.now()}-${imageFile.name}`,
          content_type: imageFile.type,
          expiration_minutes: 60,
        });

        await assetUploadService.uploadFile(signedUrlResponse.url, imageFile, imageFile.type);
        const fileUrl = signedUrlResponse.url.split('?')[0];
        editFormData.images = [{ k: 'original', v: fileUrl }];
      }

      // Handle video upload if new video is selected
      if (originalVideoFile) {
        const signedUrlResponse = await assetUploadService.generateSignedUrl({
          object_name: `${Date.now()}-${originalVideoFile.name}`,
          content_type: originalVideoFile.type,
          expiration_minutes: 60,
        });

        await assetUploadService.uploadFile(signedUrlResponse.url, originalVideoFile, originalVideoFile.type);
        const fileUrl = signedUrlResponse.url.split('?')[0];
        editFormData.videos = [{ k: 'original', v: fileUrl }];
      }

      // Handle mask video upload if new mask video is selected
      if (maskVideoFile) {
        const signedUrlResponse = await assetUploadService.generateSignedUrl({
          object_name: `${Date.now()}-${maskVideoFile.name}`,
          content_type: maskVideoFile.type,
          expiration_minutes: 60,
        });

        await assetUploadService.uploadFile(signedUrlResponse.url, maskVideoFile, maskVideoFile.type);
        const fileUrl = signedUrlResponse.url.split('?')[0];
        editFormData.videos = [...editFormData.videos.filter(v => v.k !== 'mask'), { k: 'mask', v: fileUrl }];
      }

      // Update the content with the new data
      await updateMutation.mutateAsync({
        id: selectedContent.id,
        content: editFormData,
      });

      setEditDialogOpen(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to update content');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (content: MRContent) => {
    setContentToDelete(content);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (contentToDelete && deleteConfirmationText === 'DELETE') {
      deleteMutation.mutate(contentToDelete.id);
    }
  };

  const handleCustomizeQR = (content: MRContent) => {
    // Reset customization to default values
    setQrCustomization(defaultQRCustomization);
    
    // Set the selected content and open dialog
    setSelectedContentForCustomization(content);
    setCustomizeDialogOpen(true);
    
    // Force reapplication of styles after a short delay to ensure SVG is rendered
    setTimeout(() => {
      applyQRStyleTransformation();
    }, 100);
  };

  const handleColorChange = (color: ColorResult, type: 'fg' | 'bg') => {
    setQrCustomization(prev => ({
      ...prev,
      [type === 'fg' ? 'fgColor' : 'bgColor']: color.hex
    }));
  };

  const handleSizeChange = (_: Event, value: number | number[]) => {
    setQrCustomization(prev => ({
      ...prev,
      size: value as number
    }));
  };

  const handleDownloadQR = async (refId: string) => {
    console.log('Starting QR code download for refId:', refId);
    
    const qrContainer = qrRefs.current[refId];
    if (!qrContainer) {
      console.error('QR container not found');
      enqueueSnackbar('Failed to download QR code. Please try again.', { variant: 'error' });
      return;
    }

    try {
      // Get the SVG element
      const svg = qrContainer.querySelector('svg');
      if (!svg) {
        throw new Error('SVG element not found');
      }

      // Create a high-resolution canvas
      const canvas = document.createElement('canvas');
      const size = 1024; // High resolution
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create image and draw to canvas
      const img = new Image();
      img.onload = () => {
        // Draw the QR code centered with padding
        const padding = 32;
        const drawSize = size - (padding * 2);
        ctx.drawImage(img, padding, padding, drawSize, drawSize);

        // Convert to PNG and download
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${refId}.png`;
        downloadLink.href = pngUrl;
        downloadLink.click();

        // Clean up
        URL.revokeObjectURL(url);
      };

      img.onerror = (error) => {
        console.error('Error loading image:', error);
        URL.revokeObjectURL(url);
        enqueueSnackbar('Failed to download QR code. Please try again.', { variant: 'error' });
      };

      img.src = url;
    } catch (error) {
      console.error('Error generating QR code:', error);
      enqueueSnackbar('Failed to download QR code. Please try again.', { variant: 'error' });
    }
  };

  const handleDownloadCustomQR = async () => {
    if (!selectedContentForCustomization?.ref_id) {
      enqueueSnackbar('Failed to download QR code. Please try again.', { variant: 'error' });
      return;
    }

    try {
      const qrContainer = document.getElementById('custom-qr');
      if (!qrContainer) {
        throw new Error('QR code container not found');
      }

      // Create a temporary container with padding and background
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.backgroundColor = qrCustomization.bgColor;
      tempContainer.style.padding = '16px'; // Reduced padding for download
      tempContainer.style.display = 'inline-block';
      document.body.appendChild(tempContainer);

      // Clone the QR container
      const containerClone = qrContainer.cloneNode(true) as HTMLElement;
      containerClone.style.backgroundColor = 'transparent';
      tempContainer.appendChild(containerClone);

      // Use html2canvas with proper options
      const canvas = await html2canvas(tempContainer, {
        background: qrCustomization.bgColor,
        width: containerClone.offsetWidth + 32, // Reduced padding
        height: containerClone.offsetHeight + 32 // Reduced padding
      });

      // Convert to PNG and trigger download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${selectedContentForCustomization.ref_id}-custom.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();

      // Clean up
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generating QR code:', error);
      enqueueSnackbar('Failed to download QR code. Please try again.', { variant: 'error' });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrCustomization(prev => ({
          ...prev,
          logo: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateQRCode = (refId: string) => {
    const url = `https://e.oms.com/ar/${refId}`;
    const qrOptions = [
      { 
        size: 200, 
        name: 'Standard',
        fgColor: '#000000',
        bgColor: '#ffffff',
        style: 'standard'
      },
      { 
        size: 200, 
        name: 'Branded',
        fgColor: '#1976d2', // Material-UI primary color
        bgColor: '#ffffff',
        style: 'branded'
      },
      { 
        size: 200, 
        name: 'Dark',
        fgColor: '#ffffff',
        bgColor: '#121212',
        style: 'dark'
      },
      { 
        size: 200, 
        name: 'Custom',
        fgColor: '#000000',
        bgColor: '#ffffff',
        style: 'custom'
      }
    ];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          QR Code Options
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          {qrOptions.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                p: 1, 
                bgcolor: option.bgColor, 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <QRCode
                  id={`qr-${refId}-${index}`}
                  value={url}
                  size={option.size}
                  fgColor={option.fgColor}
                  bgColor={option.bgColor}
                  level="H"
                  style={{
                    width: option.size,
                    height: option.size,
                    padding: '8px',
                    backgroundColor: option.bgColor
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {option.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      enqueueSnackbar('URL copied to clipboard', { variant: 'success' });
                    }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download QR Code">
                  <IconButton
                    size="small"
                    onClick={() => {
                      const svg = document.querySelector(`#qr-${refId}-${index} svg`);
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.onload = () => {
                          const scale = 2; // 2x resolution
                          canvas.width = img.width * scale;
                          canvas.height = img.height * scale;
                          ctx?.scale(scale, scale);
                          ctx?.drawImage(img, 0, 0);
                          const pngFile = canvas.toDataURL('image/png');
                          const downloadLink = document.createElement('a');
                          downloadLink.download = `qr-${refId}-${option.name.toLowerCase()}.png`;
                          downloadLink.href = pngFile;
                          downloadLink.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                      }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const validateVideo = async (file: File, isMask: boolean = false) => {
    return new Promise<{ duration: number; aspectRatio: number }>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'mov') {
        reject(new Error('MOV files are not supported. Please convert to MP4 format before uploading.'));
        return;
      }

      // Check MIME type
      const supportedMimeTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!supportedMimeTypes.includes(file.type)) {
        reject(new Error('Unsupported video format. Please use MP4, WebM, or OGG format.'));
        return;
      }

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const aspectRatio = video.videoWidth / video.videoHeight;
        resolve({ duration, aspectRatio });
      };

      video.onerror = () => {
        reject(new Error('Invalid video file or unsupported codec. Please convert to a supported format.'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'mask') => {
    try {
      setIsUploading(true);
      setUploadError(null);

      if (type === 'video' || type === 'mask') {
        const { duration, aspectRatio } = await validateVideo(file, type === 'mask');
        
        if (type === 'mask' && originalVideoFile) {
          const originalVideo = await validateVideo(originalVideoFile);
          if (Math.abs(aspectRatio - originalVideo.aspectRatio) > 0.01) {
            throw new Error('Mask video aspect ratio does not match original video');
          }
          if (Math.abs(duration - originalVideo.duration) > 0.1) {
            throw new Error('Mask video duration does not match original video');
          }
        }
      }

      const signedUrlResponse = await assetUploadService.generateSignedUrl({
        object_name: `${Date.now()}-${file.name}`,
        content_type: file.type,
        expiration_minutes: 60,
      });

      await assetUploadService.uploadFile(signedUrlResponse.url, file, file.type);

      const fileUrl = signedUrlResponse.url.split('?')[0];
      
      if (type === 'image') {
        setImageFile(file);
        setEditFormData({
          ...editFormData,
          images: [{ k: 'original', v: fileUrl }],
        });
      } else if (type === 'video') {
        setOriginalVideoFile(file);
        setEditFormData({
          ...editFormData,
          videos: editFormData.videos.map(v => v.k === 'original' ? { k: 'original', v: fileUrl } : v),
        });
      } else if (type === 'mask') {
        setMaskVideoFile(file);
        setEditFormData({
          ...editFormData,
          videos: [...editFormData.videos.filter(v => v.k !== 'mask'), { k: 'mask', v: fileUrl }],
        });
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (type: 'image' | 'video' | 'mask') => {
    if (type === 'image') {
      setImageFile(null);
      setEditFormData({
        ...editFormData,
        images: [],
      });
    } else if (type === 'video') {
      setOriginalVideoFile(null);
      setEditFormData({
        ...editFormData,
        videos: editFormData.videos.filter(v => v.k !== 'original'),
      });
    } else if (type === 'mask') {
      setMaskVideoFile(null);
      setEditFormData({
        ...editFormData,
        videos: editFormData.videos.filter(v => v.k !== 'mask'),
      });
    }
  };

  // Update the QR code transformation function
  const applyQRStyleTransformation = () => {
    console.log('Applying QR style transformation');
    console.log('Dialog open:', customizeDialogOpen);
    console.log('Selected content:', selectedContentForCustomization);
    console.log('Gradient enabled:', qrCustomization.gradient.enabled);
    
    const qrContainer = document.getElementById('custom-qr');
    if (!qrContainer) {
      console.log('QR container not found');
      return;
    }

    const svg = qrContainer.querySelector('svg');
    if (!svg) {
      console.error('SVG element not found');
      return;
    }

    // Get all paths
    const paths = svg.querySelectorAll('path');
    console.log('Found paths:', paths.length);
    
    // Apply gradient if enabled
    if (qrCustomization.gradient.enabled) {
      console.log('Applying gradient');
      const existingDefs = svg.querySelector('defs');
      if (existingDefs) {
        existingDefs.remove();
      }

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.id = 'qr-gradient';
      
      // Set gradient direction
      if (qrCustomization.gradient.direction === 'horizontal') {
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '0%');
      } else if (qrCustomization.gradient.direction === 'vertical') {
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '0%');
        gradient.setAttribute('y2', '100%');
      } else {
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');
      }
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', qrCustomization.gradient.startColor);
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', qrCustomization.gradient.endColor);
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.insertBefore(defs, svg.firstChild);
      
      // Apply gradient to all paths except background
      paths.forEach((path, index) => {
        if (index > 0) { // Skip the first path (background)
          path.setAttribute('fill', 'url(#qr-gradient)');
        }
      });
      console.log('Gradient applied successfully');
    } else {
      // Remove any existing gradients
      const existingDefs = svg.querySelector('defs');
      if (existingDefs) {
        existingDefs.remove();
      }
      
      // Reset fill color for all paths except background
      paths.forEach((path, index) => {
        if (index > 0) { // Skip the first path (background)
          path.setAttribute('fill', qrCustomization.fgColor);
        }
      });
      console.log('Solid color applied successfully');
    }
  };

  // Add Dialog open/close effect
  useEffect(() => {
    if (customizeDialogOpen && selectedContentForCustomization) {
      // Apply styles after a short delay to ensure SVG is rendered
      setTimeout(() => {
        applyQRStyleTransformation();
      }, 100);
    }
  }, [customizeDialogOpen]);

  // Keep the existing useEffect for style changes
  useEffect(() => {
    if (customizeDialogOpen && selectedContentForCustomization) {
      applyQRStyleTransformation();
    }
  }, [
    qrCustomization.eyeShape,
    qrCustomization.eyeBallShape,
    qrCustomization.bodyShape,
    qrCustomization.size,
    qrCustomization.fgColor,
    qrCustomization.gradient.enabled,
    qrCustomization.gradient.startColor,
    qrCustomization.gradient.endColor,
    qrCustomization.gradient.direction,
    customizeDialogOpen,
    selectedContentForCustomization
  ]);

  // Get user settings for default view mode
  const { data: userSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings()
  });

  // Local state for view mode that initializes from user settings
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(userSettings?.defaultViewMode || 'grid');

  // Update viewMode when settings change
  useEffect(() => {
    if (userSettings?.defaultViewMode) {
      setViewMode(userSettings.defaultViewMode);
    }
  }, [userSettings?.defaultViewMode]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              MR Content
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log('Create New button clicked');
                console.log('Current location:', window.location.pathname);
                console.log('Navigating to:', '/mr-content/create');
                navigate('/mr-content/create');
              }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Create New
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </Paper>
      </Container>
    );
  }

  if (queryError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ flexGrow: 1 }}>
              MR Content
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log('Create New button clicked');
                console.log('Current location:', window.location.pathname);
                console.log('Navigating to:', '/mr-content/create');
                navigate('/mr-content/create');
              }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Create New
            </Button>
          </Box>
          <Alert severity="error" sx={{ mb: 3 }}>
            {queryError instanceof Error ? queryError.message : 'An error occurred'}
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <QRCodeStyles />
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
            MR Content
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
            <ButtonGroup size="small" sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <Tooltip title="Grid View">
                <Button
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('grid')}
                >
                  <ViewModuleIcon />
                </Button>
              </Tooltip>
              <Tooltip title="List View">
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('list')}
                >
                  <ViewListIcon />
                </Button>
              </Tooltip>
            </ButtonGroup>
            <FormControl sx={{ display: { xs: 'block', sm: 'none' }, minWidth: 120 }}>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
                size="small"
              >
                <MenuItem value="grid">Grid View</MenuItem>
                <MenuItem value="list">List View</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log('Create New button clicked');
                console.log('Current location:', window.location.pathname);
                console.log('Navigating to:', '/mr-content/create');
                navigate('/mr-content/create');
              }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Create New
            </Button>
          </Box>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name, reference ID, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {viewMode === 'grid' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
            {filteredContent.map((content: MRContent) => (
              <Card key={content.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Stack spacing={2}>
                    {/* First Row - Name and Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" noWrap sx={{ maxWidth: 200 }}>
                        {content.name}
                      </Typography>
                      <Chip
                        label={content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                        color={getStatusColor(content.status)}
                        size="small"
                      />
                    </Box>

                    {/* Second Row - Details and Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {content.ref_id}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Type:
                          </Typography>
                          <Typography variant="body2">
                            {content.render_type} {content.has_alpha ? '(Alpha)' : ''}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(content)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(content)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* QR Code Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box 
                          ref={(el: HTMLDivElement | null) => {
                            qrRefs.current[content.ref_id] = el;
                          }}
                          id={`qr-container-${content.ref_id}`} 
                          sx={{ 
                            position: 'relative',
                            width: 150,
                            height: 150,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            padding: '8px'
                          }}
                        >
                          <QRCodeSVG
                            id={`qr-${content.ref_id}`}
                            value={`https://e.oms.com/ar/${content.ref_id}`}
                            size={134} // 150 - (8 * 2) for padding
                            level="H"
                            style={{
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Copy URL">
                            <IconButton
                              size="small"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://e.oms.com/ar/${content.ref_id}`);
                                enqueueSnackbar('URL copied to clipboard', { variant: 'success' });
                              }}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download QR Code">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadQR(content.ref_id)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Customize QR Code">
                            <IconButton
                              size="small"
                              onClick={() => handleCustomizeQR(content)}
                            >
                              <PaletteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>

                    {/* Media Previews Section */}
                    <Stack spacing={1}>
                      {content.images_original && (
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
                            <a href={content.images_original} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                              <img
                                src={content.images_original}
                                alt="Preview"
                                style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', cursor: 'pointer' }}
                              />
                            </a>
                          </Box>
                        </Paper>
                      )}
                      {content.videos_original && (
                        <Paper variant="outlined" sx={{ p: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
                            <video
                              src={content.videos_original}
                              controls
                              style={{ maxWidth: '100%', maxHeight: 100 }}
                              onError={(e) => {
                                const videoElement = e.target as HTMLVideoElement;
                                if (videoElement.error?.code === 4) {
                                  videoElement.parentElement!.innerHTML = `
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                      <Typography variant="body2" color="error">
                                        Video format not supported. Please convert to MP4 format.
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        <a href="${content.videos_original}" target="_blank" rel="noopener noreferrer">
                                          Download video
                                        </a>
                                      </Typography>
                                    </Box>
                                  `;
                                }
                              }}
                            />
                          </Box>
                        </Paper>
                      )}
                    </Stack>

                    {/* Footer Section */}
                    <Box sx={{ mt: 'auto' }}>
                      <Typography variant="caption" color="text.secondary">
                        Created: {format(new Date(content.created_at), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ mt: 3 }}>
            {filteredContent.map((content: MRContent) => (
              <Card key={content.id} sx={{ mb: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: 2, md: 3 },
                    alignItems: { xs: 'stretch', md: 'center' }
                  }}>
                    {/* Left Section: Content Info */}
                    <Box sx={{ 
                      flex: '1 1 auto',
                      minWidth: 0 // This ensures text truncation works
                    }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {content.name}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 1, sm: 2 },
                        mt: 1
                      }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {content.ref_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Created: {format(new Date(content.created_at), 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Middle Section: Type and Status */}
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: { xs: 'flex-start', md: 'center' },
                      gap: 2,
                      minWidth: { md: '200px' }
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'row', md: 'column' },
                        alignItems: { xs: 'center', md: 'flex-start' },
                        gap: { xs: 2, md: 1 }
                      }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          Type: {content.render_type} {content.has_alpha ? '(Alpha)' : ''}
                        </Typography>
                        <Chip
                          label={content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                          color={getStatusColor(content.status)}
                          size="small"
                          sx={{ minWidth: 80 }}
                        />
                      </Box>
                    </Box>

                    {/* QR Code Section */}
                    <Box sx={{ 
                      display: 'flex',
                      justifyContent: { xs: 'center', md: 'center' },
                      alignItems: 'center',
                      minWidth: { md: '120px' }
                    }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box 
                          ref={(el: HTMLDivElement | null) => {
                            if (qrRefs.current) {
                              qrRefs.current[content.ref_id] = el;
                            }
                          }}
                          sx={{ 
                            position: 'relative',
                            width: 116,
                            height: 116,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            padding: '8px',
                            borderRadius: 1
                          }}
                        >
                          <QRCodeSVG
                            value={`https://e.oms.com/ar/${content.ref_id}`}
                            size={100}
                            level="H"
                            style={{
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Copy URL">
                            <IconButton
                              size="small"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://e.oms.com/ar/${content.ref_id}`);
                                enqueueSnackbar('URL copied to clipboard', { variant: 'success' });
                              }}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download QR Code">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadQR(content.ref_id)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Customize QR Code">
                            <IconButton
                              size="small"
                              onClick={() => handleCustomizeQR(content)}
                            >
                              <PaletteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>

                    {/* Action Buttons Section */}
                    <Box sx={{ 
                      display: 'flex',
                      gap: 1,
                      justifyContent: { xs: 'center', md: 'flex-end' },
                      minWidth: { md: '120px' }
                    }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(content)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(content)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil((data?.data?.total || 0) / rowsPerPage)}
            page={page + 1}
            onChange={(_, value) => handleChangePage(_, value - 1)}
            color="primary"
          />
        </Box>
      </Paper>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="div">
            Edit Content
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update content details and media files
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={4}>
            {/* Basic Information Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Content Name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  fullWidth
                  size="small"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Render Type</InputLabel>
                  <Select
                    value={editFormData.render_type}
                    label="Render Type"
                    onChange={(e) => setEditFormData({ ...editFormData, render_type: e.target.value as 'IMAGE' | 'GROUND' })}
                  >
                    <MenuItem value="GROUND">Ground</MenuItem>
                    <MenuItem value="IMAGE">Image</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Scale and Height Section */}
            <Card variant="outlined" sx={{ p: 3, mb: 3, background: '#fafbfc' }}>
              <Typography variant="h6" gutterBottom>
                Scale and Height
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
                <Box flex={1}>
                  <Typography variant="subtitle2" gutterBottom>
                    Scale
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Slider
                      value={editFormData.scale ?? 1.00}
                      onChange={(_, value) => setEditFormData({ ...editFormData, scale: value as number })}
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
                      value={(editFormData.scale ?? 1.00).toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0.1 && value <= 10) {
                          setEditFormData({ ...editFormData, scale: value });
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
                      value={editFormData.height ?? 0.00}
                      onChange={(_, value) => setEditFormData({ ...editFormData, height: value as number })}
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
                      value={(editFormData.height ?? 0.00).toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 10) {
                          setEditFormData({ ...editFormData, height: value });
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
            </Card>

            {/* Media Files Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Media Files
              </Typography>
              <Stack spacing={3}>
                {/* Image Upload */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">Image (Optional)</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Upload Image">
                        <IconButton
                          component="label"
                          disabled={isUploading}
                          color="primary"
                          size="small"
                        >
                          <UploadIcon />
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'image');
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                      {editFormData.images.length > 0 && (
                        <Tooltip title="Remove Image">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveFile('image')}
                            disabled={isUploading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  {editFormData.images.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                      <img
                        src={editFormData.images[0].v}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                      />
                    </Box>
                  )}
                </Paper>

                {/* Original Video Upload */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">Original Video (Required)</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Upload Video">
                        <IconButton
                          component="label"
                          disabled={isUploading}
                          color="primary"
                          size="small"
                        >
                          <UploadIcon />
                          <input
                            type="file"
                            hidden
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'video');
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                      {editFormData.videos.some(v => v.k === 'original') && (
                        <Tooltip title="Remove Video">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveFile('video')}
                            disabled={isUploading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  {editFormData.videos.some(v => v.k === 'original') && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                      <video
                        src={editFormData.videos.find(v => v.k === 'original')?.v}
                        controls
                        style={{ maxWidth: '100%', maxHeight: 200 }}
                      />
                    </Box>
                  )}
                </Paper>

                {/* Mask Video Upload - Always show */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">Mask Video {selectedContent?.has_alpha ? '(Required for Alpha)' : '(Optional)'}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Upload Mask Video">
                        <IconButton
                          component="label"
                          disabled={isUploading || !editFormData.videos.some(v => v.k === 'original')}
                          color="primary"
                          size="small"
                        >
                          <UploadIcon />
                          <input
                            type="file"
                            hidden
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'mask');
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                      {editFormData.videos.some(v => v.k === 'mask') && (
                        <Tooltip title="Remove Mask Video">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveFile('mask')}
                            disabled={isUploading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  {editFormData.videos.some(v => v.k === 'mask') && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                      <video
                        src={editFormData.videos.find(v => v.k === 'mask')?.v}
                        controls
                        style={{ maxWidth: '100%', maxHeight: 200 }}
                      />
                    </Box>
                  )}
                </Paper>
              </Stack>
            </Box>

            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={updateMutation.isPending || isUploading || !editFormData.videos.some(v => v.k === 'original')}
            startIcon={updateMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmationText('');
        }}
      >
        <DialogTitle>Delete Content</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{contentToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Type DELETE to confirm"
            type="text"
            fullWidth
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            error={deleteConfirmationText !== '' && deleteConfirmationText !== 'DELETE'}
            helperText={deleteConfirmationText !== '' && deleteConfirmationText !== 'DELETE' ? 'Please type DELETE in uppercase' : ''}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmationText('');
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            disabled={deleteMutation.isPending || deleteConfirmationText !== 'DELETE'}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Customization Dialog */}
      <Dialog 
        open={customizeDialogOpen} 
        onClose={() => setCustomizeDialogOpen(false)} 
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div">
            Customize QR Code
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customize the appearance of your QR code
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', gap: 4, minHeight: '600px', p: '24px !important' }}>
          {/* Preview Section - Fixed on the left */}
          <Box sx={{ 
            flex: '0 0 auto', 
            width: '400px',
            position: 'sticky',
            top: 24,
            height: 'fit-content',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 2
          }}>
            <Box sx={{ 
              p: 0.5, // Reduced padding for download
              bgcolor: qrCustomization.bgColor, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              width: qrCustomization.size + 8, // Reduced padding
              height: qrCustomization.size + 8, // Reduced padding
              overflow: 'hidden'
            }}>
              <Box
                id="custom-qr"
                className="qr-container"
                sx={{
                  width: qrCustomization.size,
                  height: qrCustomization.size,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  padding: '8px',
                  backgroundColor: 'transparent'
                }}
              >
                {selectedContentForCustomization && (
                  <QRCodeSVG
                    key={`${qrCustomization.size}-${qrCustomization.fgColor}-${qrCustomization.gradient.enabled}-${qrCustomization.gradient.startColor}-${qrCustomization.gradient.endColor}-${qrCustomization.gradient.direction}`}
                    value={`https://e.oms.com/ar/${selectedContentForCustomization.ref_id}`}
                    size={qrCustomization.size - 16}
                    fgColor={qrCustomization.gradient.enabled ? qrCustomization.gradient.startColor : qrCustomization.fgColor}
                    bgColor="transparent"
                    level="H"
                    style={{
                      width: '100%',
                      height: '100%'
                    }}
                  />
                )}
                {qrCustomization.logo && (
                  <Box
                    component="img"
                    src={qrCustomization.logo}
                    sx={{
                      position: 'absolute',
                      width: (qrCustomization.size - 16) * 0.2,
                      height: (qrCustomization.size - 16) * 0.2,
                      objectFit: 'contain',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1
                    }}
                  />
                )}
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCustomQR}
            >
              Download QR Code
            </Button>
          </Box>

          {/* Customization Options - Scrollable on the right */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <Box sx={{ 
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 1,
              borderBottom: 1,
              borderColor: 'divider',
              mb: 2
            }}>
              <Tabs 
                value={activeTab} 
                onChange={(_, newValue) => setActiveTab(newValue)}
              >
                <Tab label="Colors" />
                <Tab label="Size" />
                <Tab label="Logo" />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
              {activeTab === 0 && (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Foreground Color</Typography>
                    <ChromePicker
                      color={qrCustomization.fgColor}
                      onChange={(color) => handleColorChange(color, 'fg')}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Background Color</Typography>
                    <ChromePicker
                      color={qrCustomization.bgColor}
                      onChange={(color) => handleColorChange(color, 'bg')}
                    />
                  </Box>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={qrCustomization.gradient.enabled}
                          onChange={(e) => setQrCustomization(prev => ({
                            ...prev,
                            gradient: {
                              ...prev.gradient,
                              enabled: e.target.checked
                            }
                          }))}
                        />
                      }
                      label="Enable Gradient"
                    />
                    {qrCustomization.gradient.enabled && (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>Start Color</Typography>
                          <ChromePicker
                            color={qrCustomization.gradient.startColor}
                            onChange={(color) => setQrCustomization(prev => ({
                              ...prev,
                              gradient: {
                                ...prev.gradient,
                                startColor: color.hex
                              }
                            }))}
                          />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>End Color</Typography>
                          <ChromePicker
                            color={qrCustomization.gradient.endColor}
                            onChange={(color) => setQrCustomization(prev => ({
                              ...prev,
                              gradient: {
                                ...prev.gradient,
                                endColor: color.hex
                              }
                            }))}
                          />
                        </Box>
                        <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                          <InputLabel id="gradient-direction-label">Gradient Direction</InputLabel>
                          <Select
                            labelId="gradient-direction-label"
                            value={qrCustomization.gradient.direction}
                            label="Gradient Direction"
                            onChange={(e) => setQrCustomization(prev => ({
                              ...prev,
                              gradient: {
                                ...prev.gradient,
                                direction: e.target.value as 'horizontal' | 'vertical' | 'diagonal'
                              }
                            }))}
                          >
                            <MenuItem value="horizontal">Horizontal</MenuItem>
                            <MenuItem value="vertical">Vertical</MenuItem>
                            <MenuItem value="diagonal">Diagonal</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )}

              {activeTab === 1 && (
                <Box sx={{ px: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Size</Typography>
                  <Box sx={{ px: 2, mt: 4, mb: 2 }}>
                    <Slider
                      value={qrCustomization.size}
                      onChange={handleSizeChange}
                      min={100}
                      max={400}
                      step={10}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 100, label: '100px' },
                        { value: 200, label: '200px' },
                        { value: 300, label: '300px' },
                        { value: 400, label: '400px' }
                      ]}
                    />
                  </Box>
                </Box>
              )}

              {activeTab === 2 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Add Logo</Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Upload Logo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </Button>
                  {qrCustomization.logo && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Current Logo:
                      </Typography>
                      <Box
                        component="img"
                        src={qrCustomization.logo}
                        sx={{
                          maxWidth: 100,
                          maxHeight: 100,
                          objectFit: 'contain'
                        }}
                      />
                      <Button
                        variant="text"
                        color="error"
                        onClick={() => setQrCustomization(prev => ({ ...prev, logo: undefined }))}
                        sx={{ mt: 1 }}
                      >
                        Remove Logo
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomizeDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MRContent; 