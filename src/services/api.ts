import axios from 'axios';

// Use relative URLs for all API endpoints
const MR_CONTENT_API_URL = '/mr-content';
const USER_MANAGEMENT_API_URL = '/api/user-management';
const ASSET_UPLOAD_API_URL = 'http://127.0.0.1:8082/generatesignedurl';

const API_BASE_URL = 'http://127.0.0.1:8083';

// Create separate axios instances for each service
export const mrContentApi = axios.create({
  baseURL: MR_CONTENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userManagementApi = axios.create({
  baseURL: USER_MANAGEMENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const assetUploadApi = axios.create({
  baseURL: ASSET_UPLOAD_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
mrContentApi.interceptors.request.use(
  (config) => {
    console.log('MR Content - Request interceptor:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      baseURL: config.baseURL
    });

    const token = localStorage.getItem('token');
    console.log('MR Content - Token from localStorage:', token ? 'Present' : 'Missing');
    
    if (token) {
      config.headers.Authorization = token;
      console.log('MR Content - Added Authorization header:', token);
    }

    // Ensure we're using the correct base URL
    if (config.url && !config.url.startsWith('http')) {
      config.url = `${MR_CONTENT_API_URL}${config.url}`;
      console.log('MR Content - Updated URL:', config.url);
    }

    console.log('MR Content - Final request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      baseURL: config.baseURL
    });

    return config;
  },
  (error) => {
    console.error('MR Content - Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle unauthorized errors
mrContentApi.interceptors.response.use(
  (response) => {
    console.log('MR Content - Response interceptor success:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('MR Content - Response interceptor error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.log('MR Content - Unauthorized error detected, clearing token and redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to add auth token
userManagementApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle unauthorized errors
userManagementApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add interceptors to asset upload API instance
assetUploadApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

assetUploadApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

interface MRContent {
  id: string;
  name: string;
  render_type: string;
  images_original?: string;
  videos_original?: string;
  videos_mask?: string;
  status: 'draft' | 'processing' | 'processed';
  created_at: string;
  updated_at: string;
  ref_id: string;
  is_active: boolean;
  has_alpha: boolean;
  orientation: string;
  organization_id: string;
  user_id: string;
}

interface CreateMRContentRequest {
  name: string;
  render_type: 'IMAGE' | 'GROUND';
  images: Array<{ k: string; v: string }>;
  videos: Array<{ k: string; v: string }>;
  scale?: number;
  height?: number;
}

interface MRContentResponse {
  data: MRContent;
}

interface EditMRContentRequest {
  name: string;
  render_type: string;
  status?: 'draft';
  images: Array<{ k: string; v: string }>;
  videos: Array<{ k: string; v: string }>;
  scale?: number;
  height?: number;
}

// MR Content API endpoints
export const mrContentApiService = {
  getAllContent: async (params?: { page: number; limit: number }) => {
    try {
      console.log('Fetching content with params:', params);
      const response = await mrContentApi.get('', { params });
      console.log('Get all content response:', response.data);
      return response;
    } catch (error) {
      console.error('Error fetching content:', error);
      throw error;
    }
  },
  getContentById: (id: string) => mrContentApi.get(`/${id}`),
  createContent: async (data: CreateMRContentRequest): Promise<MRContentResponse> => {
    try {
      const response = await mrContentApi.post('', data);
      return response.data;
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  },
  updateContent: async (id: string, content: EditMRContentRequest) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Create base payload without images
    const basePayload: any = {
      name: content.name,
      render_type: content.render_type,
      has_alpha: true,
      videos: content.videos,
    };

    if (content.scale !== undefined) {
      basePayload.scale = content.scale;
    }
    if (content.height !== undefined) {
      basePayload.height = content.height;
    }

    // Add images only if the array is not empty
    const payload = content.images.length > 0
      ? { ...basePayload, images: content.images }
      : basePayload;

    // Get the existing content to compare using the full API URL
    const existingContent = await axios.get(
      `${API_BASE_URL}/mr-content/${id}`,
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      }
    );

    // The response data is directly in the response, not nested
    const existingData = existingContent.data;

    // Check if any assets have actually changed
    const hasImageChanges = content.images.length > 0 && 
      (!existingData.images_original || content.images[0].v !== existingData.images_original);

    const hasVideoChanges = content.videos.some(newVideo => {
      if (newVideo.k === 'original') {
        return !existingData.videos_original || newVideo.v !== existingData.videos_original;
      }
      if (newVideo.k === 'mask') {
        return !existingData.videos_mask || newVideo.v !== existingData.videos_mask;
      }
      return false;
    });

    // Set status to draft only if assets are actually changed
    const hasAssetUpdates = hasImageChanges || hasVideoChanges;

    const finalPayload = hasAssetUpdates
      ? { ...payload, status: 'draft' }
      : payload;

    const response = await axios.put(
      `${API_BASE_URL}/mr-content/${id}`,
      finalPayload,
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data) {
      throw new Error('Failed to update content');
    }

    return response.data;
  },
  deleteContent: async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(
      `${API_BASE_URL}/mr-content/${id}`,
      {
        headers: {
          'Authorization': token
        }
      }
    );

    if (!response.data) {
      throw new Error('Failed to delete content');
    }

    return response.data;
  },
};

// User Management API endpoints
export const userApiService = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('Starting login process...');
      console.log('Making login request to:', 'http://127.0.0.1:8080/users/login');
      console.log('With credentials:', credentials);
      
      const response = await axios.post('http://127.0.0.1:8080/users/login', credentials, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      if (response.data.access_token) {
        // Store the token exactly as it comes from the server
        localStorage.setItem('token', response.data.access_token);
        console.log('Token stored successfully');
        
        // Verify token was stored
        const storedToken = localStorage.getItem('token');
        console.log('Verifying stored token:', storedToken ? 'Token present' : 'No token found');
      } else {
        console.error('No access token in response data');
      }
      
      return response;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });
      throw error;
    }
  },
  register: async (userData: any) => {
    const response = await userManagementApi.post('/users/register', userData);
    return response;
  },
  getCurrentUser: async () => {
    const response = await userManagementApi.get('/users/me');
    return response;
  },
  updateUser: async (data: any) => {
    const response = await userManagementApi.put('/users/me', data);
    return response;
  },
  updateProfile: async (data: {
    email: string;
    currentPassword: string;
    newPassword?: string;
  }) => {
    const response = await userManagementApi.put('/users/profile', data);
    return response;
  },
  updateSettings: async (data: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  }) => {
    const response = await userManagementApi.put('/users/settings', data);
    return response;
  },
  logout: async () => {
    try {
      await userManagementApi.post('/users/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  getProfile: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get('http://127.0.0.1:8080/users/me', {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data) {
      throw new Error('Failed to fetch user profile');
    }

    return response.data;
  },
  getSettings: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get('http://127.0.0.1:8080/users/settings', {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data) {
      throw new Error('Failed to fetch user settings');
    }

    return response.data;
  },
  signup: async (userData: {
    email: string;
    password: string;
    username: string;
    role: string;
    create_org: boolean;
    organization_details: {
      name: string;
    };
  }) => {
    console.log('Signup request data:', JSON.stringify(userData, null, 2));
    const response = await axios.post('http://127.0.0.1:8080/users/register', userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data) {
      throw new Error('Failed to register user');
    }

    return response.data;
  },
  resendVerificationEmail: async (data: { email: string }) => {
    console.log('Resending verification email to:', data.email);
    const response = await axios.post(
      'http://127.0.0.1:8080/users/resend-verification',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Resend verification response:', response.data);
    return response;
  },
  updateOrganization: async (name: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      'http://127.0.0.1:8080/organizations',
      { name },
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data) {
      throw new Error('Failed to update organization');
    }

    return response.data;
  },
  updateUsername: async (username: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      'http://127.0.0.1:8080/users/me',
      { username },
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data) {
      throw new Error('Failed to update username');
    }

    return response.data;
  },
};

interface SignedUrlRequest {
  object_name: string;
  content_type: string;
  expiration_minutes: number;
}

interface SignedUrlResponse {
  url: string;
}

export const assetUploadService = {
  generateSignedUrl: async (data: SignedUrlRequest): Promise<SignedUrlResponse> => {
    // Use the full URL and include all necessary headers
    const response = await fetch(ASSET_UPLOAD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') || '',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
    }
    
    return response.json();
  },
  
  uploadFile: async (signedUrl: string, file: File, contentType: string): Promise<void> => {
    console.log('Uploading file with content type:', contentType);
    console.log('To signed URL:', signedUrl);
    
    // Match the working test code exactly
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }
  },
};

export default { mrContentApi, userManagementApi }; 