import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import VideoGallery from './VideoGallery'

// Minimal mock for AuthContext used in the component
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ 
    user: { id: 1, username: 'admin', is_admin: true },
    loading: false 
  })
}))

// Mock API service - fix response structure to match component expectations
const mockGet = vi.fn()
vi.mock('../../services/api', () => ({
  default: {
    get: mockGet,
    post: vi.fn(),
    delete: vi.fn()
  }
}))
 
describe('VideoGallery', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    // Mock the API response structure that the component expects
    mockGet.mockResolvedValue({
      data: {
        videos: [{ id: 9, filename: 'demo.mp4', owner_username: 'admin', title: 'demo.mp4' }]
      }
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders and shows a video item', async () => {
    render(<VideoGallery />)
    
    // Wait for the component to load and display the video gallery
    await waitFor(() => {
      expect(screen.getByText(/Video Gallery/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for video filename
    await waitFor(() => {
      expect(screen.getByText(/demo.mp4/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('opens the player when clicking a video card', async () => {
    render(<VideoGallery />)
    
    // Wait for video to load
    await waitFor(() => {
      expect(screen.getByText(/demo.mp4/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Find and click play button
    const playButton = await waitFor(() => {
      return screen.getByText(/Play/i)
    }, { timeout: 3000 })
    
    fireEvent.click(playButton)
    
    // Wait for player to open
    await waitFor(() => {
      expect(screen.getByTitle(/Close/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
 

