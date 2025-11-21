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
beforeEach(() => {
  document.createElement = vi.fn((tagName) => {
    if (tagName === 'video') {
      // Return a mock video element that won't hang
      const mockVideo = originalCreateElement('div')
      mockVideo.tagName = 'VIDEO'
      mockVideo.crossOrigin = ''
      mockVideo.src = ''
      mockVideo.muted = false
      mockVideo.videoWidth = 300
      mockVideo.videoHeight = 200
      mockVideo.duration = 10
      mockVideo.currentTime = 0
      mockVideo.addEventListener = vi.fn()
      mockVideo.removeEventListener = vi.fn()
      mockVideo.load = vi.fn()
      // Mock events to resolve immediately
      setTimeout(() => {
        if (mockVideo.onloadeddata) mockVideo.onloadeddata()
      }, 0)
      return mockVideo
    }
    return originalCreateElement(tagName)
  })
})

afterEach(() => {
  document.createElement = originalCreateElement
  vi.clearAllTimers()
})
 
describe('VideoGallery', () => {
  beforeEach(() => {
    // Use fake timers to control setTimeout calls
    vi.useFakeTimers()
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
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  it('renders and shows a video item', async () => {
    render(<VideoGallery />)
    
    // Advance timers to handle any setTimeout calls
    vi.advanceTimersByTime(2000)
    
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
    
    // Advance timers
    vi.advanceTimersByTime(2000)
    
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
 

