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

// Mock API service - use vi.hoisted() to properly handle variable hoisting
const { mockGet } = vi.hoisted(() => {
  return {
    mockGet: vi.fn()
  }
})

vi.mock('../../services/api', () => ({
  default: {
    get: mockGet,
    post: vi.fn(),
    delete: vi.fn()
  }
}))

// Mock video element creation to prevent hanging on thumbnail generation
const originalCreateElement = document.createElement.bind(document)
 
describe('VideoGallery', () => {
  beforeEach(() => {
    // Mock document.createElement to prevent video elements from hanging
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'video') {
        // Return a mock video element that won't hang
        const mockVideo = originalCreateElement('div')
        Object.defineProperty(mockVideo, 'tagName', { value: 'VIDEO', writable: false })
        mockVideo.crossOrigin = ''
        mockVideo.src = ''
        mockVideo.muted = false
        Object.defineProperty(mockVideo, 'videoWidth', { value: 300, writable: false })
        Object.defineProperty(mockVideo, 'videoHeight', { value: 200, writable: false })
        Object.defineProperty(mockVideo, 'duration', { value: 10, writable: true })
        Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true })
        mockVideo.addEventListener = vi.fn()
        mockVideo.removeEventListener = vi.fn()
        mockVideo.load = vi.fn()
        // Mock canvas methods
        const originalCreateElementForCanvas = originalCreateElement
        const mockCanvas = originalCreateElementForCanvas('canvas')
        mockCanvas.width = 300
        mockCanvas.height = 200
        mockCanvas.getContext = vi.fn(() => ({
          drawImage: vi.fn(),
          toDataURL: vi.fn(() => 'data:image/png;base64,mock')
        }))
        // Override createElement for canvas too
        const originalCreateElementForVideo = document.createElement
        document.createElement = vi.fn((tag) => {
          if (tag === 'canvas') return mockCanvas
          return originalCreateElementForVideo(tag)
        })
        return mockVideo
      }
      return originalCreateElement(tagName)
    })
    
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
    // Restore original createElement
    document.createElement = originalCreateElement
    vi.clearAllTimers()
  })

  it('renders and shows a video item', async () => {
    render(<VideoGallery />)
    
    // Wait for the component to load and display the video gallery
    await waitFor(() => {
      expect(screen.getByText(/Video Gallery/i)).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Check for video filename
    await waitFor(() => {
      expect(screen.getByText(/demo.mp4/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('opens the player when clicking a video card', async () => {
    render(<VideoGallery />)
    
    // Wait for video to load
    await waitFor(() => {
      expect(screen.getByText(/demo.mp4/i)).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Find and click play button
    const playButton = await waitFor(() => {
      return screen.getByText(/Play/i)
    }, { timeout: 5000 })
    
    fireEvent.click(playButton)
    
    // Wait for player to open
    await waitFor(() => {
      expect(screen.getByTitle(/Close/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})
 

