# MR Content Management System

A modern web application for managing MR content with user control. This application integrates with two backend services:
- MR Content Service
- User Management Service

## Features

- Create, read, update, and delete MR content
- User authentication and authorization
- Modern and responsive UI
- Real-time updates using React Query

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Backend services running locally or accessible via network

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the `VITE_API_BASE_URL` to point to your backend services

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:5173`

## Development

The application is built with:
- React + TypeScript
- Material-UI for components
- React Query for data fetching
- React Router for navigation
- Vite for build tooling

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── services/      # API services
├── utils/         # Utility functions
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
└── layouts/       # Layout components
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
