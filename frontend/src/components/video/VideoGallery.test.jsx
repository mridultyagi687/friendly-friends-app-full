import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import VideoGallery from './VideoGallery'

// Minimal mock for AuthContext used in the component
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', is_admin: true } })
}))

// Mock API service
vi.mock('../../services/api', () => ({
  get: vi.fn(async (url) => {
    if (url === '/api/videos') {
      return { data: [{ id: 9, filename: 'demo.mp4', owner_username: 'admin' }] }
    }
    return { data: [] }
  }),
  post: vi.fn(),
  delete: vi.fn()
}))
 
 describe('VideoGallery', () => {
   it('renders and shows a video item', async () => {
     render(<VideoGallery />)
     expect(await screen.findByText(/Video Gallery/i)).toBeInTheDocument()
     expect(await screen.findByText(/demo.mp4/i)).toBeInTheDocument()
   })
 
   it('opens the player when clicking a video card', async () => {
     render(<VideoGallery />)
     const playButton = await screen.findByText(/Play/i)
     fireEvent.click(playButton)
     expect(await screen.findByTitle(/Close/)).toBeInTheDocument()
   })
 })
 

