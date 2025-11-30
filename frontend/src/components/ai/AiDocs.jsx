import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document as DocxDocument, Packer, Paragraph } from 'docx';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

function AiDocs() {
  const { user } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'images'
  
  // Document state
  const [docPrompt, setDocPrompt] = useState('');
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [originalDocTitle, setOriginalDocTitle] = useState('');
  const [originalDocContent, setOriginalDocContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageUrls, setImageUrls] = useState({}); // Cache for image blob URLs
  const [imageUrls, setImageUrls] = useState({}); // Cache for image blob URLs
  
  // Common state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [docInputFileName, setDocInputFileName] = useState('');
  const [importingDoc, setImportingDoc] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  
  // Chat state for document editing
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatId, setChatId] = useState(null);
  const chatBottomRef = useRef(null);
  
  // Chat state for image editing
  const [imageChatMessages, setImageChatMessages] = useState([]);
  const [imageChatInput, setImageChatInput] = useState('');
  const [sendingImageMessage, setSendingImageMessage] = useState(false);
  const [imageChatId, setImageChatId] = useState(null);
  const imageChatBottomRef = useRef(null);

  const docInputRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const selectedDoc = docs.find(d => d.id === selectedDocId);
  const selectedImage = images.find(img => img.id === selectedImageId);

  useEffect(() => {
    if (!user) {
      setLoadingDocs(false);
      setLoadingImages(false);
      return;
    }
    if (activeTab === 'docs') {
      fetchDocs();
    } else {
      fetchImages();
    }
  }, [user, activeTab]);

  const fetchDocs = async () => {
    setLoadingDocs(true);
    setError(null);
    try {
      const { data } = await api.get('/api/ai/docs');
      const docsList = Array.isArray(data?.docs) ? data.docs : [];
      setDocs(docsList);
      if (docsList.length > 0 && !selectedDocId) {
        setSelectedDocId(docsList[0].id);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to load documents right now.';
      if (err.response?.status === 401) {
        setError('Please log in to view documents.');
      } else {
        setError(message);
      }
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchImages = async () => {
    setLoadingImages(true);
    setError(null);
    try {
      const { data } = await api.get('/api/ai/images');
      const imagesList = Array.isArray(data?.images) ? data.images : [];
      setImages(imagesList);
      if (imagesList.length > 0 && !selectedImageId) {
        setSelectedImageId(imagesList[0].id);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to load images right now.';
      if (err.response?.status === 401) {
        setError('Please log in to view images.');
      } else {
        setError(message);
      }
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    if (selectedDoc) {
      setDocTitle(selectedDoc.title);
      setDocContent(selectedDoc.content);
      setOriginalDocTitle(selectedDoc.title);
      setOriginalDocContent(selectedDoc.content);
      setHasUnsavedChanges(false);
      setSuccess(null); // Clear any success message when selecting a new doc
      // Reset chat when switching documents
      setChatMessages([]);
      setChatId(null);
    } else {
      setDocTitle('');
      setDocContent('');
      setOriginalDocTitle('');
      setOriginalDocContent('');
      setHasUnsavedChanges(false);
      setChatMessages([]);
      setChatId(null);
    }
  }, [selectedDoc]);

  useEffect(() => {
    // Reset image chat when switching images
    if (selectedImage) {
      setImageChatMessages([]);
      setImageChatId(null);
    } else {
      setImageChatMessages([]);
      setImageChatId(null);
    }
  }, [selectedImage]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (imageChatBottomRef.current) {
      imageChatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [imageChatMessages]);

  useEffect(() => {
    if (!downloadMenuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setDownloadMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDownloadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [downloadMenuOpen]);

  useEffect(() => {
    setDownloadMenuOpen(false);
  }, [selectedDocId]);

  const handleGenerateDoc = async (e) => {
    e.preventDefault();
    const cleanedPrompt = docPrompt.trim();
    if (!cleanedPrompt || generatingDoc) return;

    setGeneratingDoc(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post('/api/ai/docs', {
        prompt: cleanedPrompt,
      });
      if (data?.doc) {
        setDocs(prev => [data.doc, ...prev]);
        setSelectedDocId(data.doc.id);
        setDocPrompt('');
        setSuccess('Document generated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('No document content received from server.');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to generate document. Please try again later.';
      if (err.response?.status === 401) {
        setError('Please log in to generate documents.');
      } else {
        setError(message);
      }
    } finally {
      setGeneratingDoc(false);
    }
  };

  const handleCreateManualDoc = async () => {
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post('/api/ai/docs', {
        prompt: '', // Empty prompt for manual document
        title: 'Untitled Document',
        content: '',
      });
      if (data?.doc) {
        setDocs(prev => [data.doc, ...prev]);
        setSelectedDocId(data.doc.id);
        setSuccess('New document created!');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError('Failed to create document.');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create document. Please try again later.';
      if (err.response?.status === 401) {
        setError('Please log in to create documents.');
      } else {
        setError(message);
      }
    }
  };

  const handleDocInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocInputFileName(file.name);
      setError(null);
    } else {
      setDocInputFileName('');
    }
  };

  const handleDocInputUpload = async () => {
    if (!docInputRef.current || !docInputRef.current.files?.length) {
      setError('Please choose a document to import.');
      return;
    }

    const file = docInputRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setImportingDoc(true);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await api.post('/api/ai/docs/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.doc) {
        setDocs((prev) => [data.doc, ...prev]);
        setSelectedDocId(data.doc.id);
        setSuccess('Document imported! You can edit it now.');
        setTimeout(() => setSuccess(null), 2500);
      } else {
        setError('Document imported but we did not receive the content. Please refresh and try again.');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to import this document right now.';
      setError(message);
    } finally {
      setImportingDoc(false);
      setDocInputFileName('');
      if (docInputRef.current) {
        docInputRef.current.value = '';
      }
    }
  };

  const handleGenerateImage = async (e) => {
    e.preventDefault();
    const cleanedPrompt = imagePrompt.trim();
    if (!cleanedPrompt || generatingImage) return;

    setGeneratingImage(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post('/api/ai/images', {
        prompt: cleanedPrompt,
      });
      if (data?.image) {
        setImages(prev => [data.image, ...prev]);
        setSelectedImageId(data.image.id);
        setImagePrompt('');
        setSuccess('Image generated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('No image received from server.');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      const message = err.response?.data?.error || err.message || 'Failed to generate image. Please try again later.';
      if (err.response?.status === 401) {
        setError('Please log in to generate images.');
      } else {
        setError(message);
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSaveDoc = useCallback(async () => {
    if (!selectedDocId || savingDoc) return;
    
    // Check if there are actual changes
    const titleChanged = docTitle.trim() !== originalDocTitle.trim();
    const contentChanged = docContent !== originalDocContent;
    
    if (!titleChanged && !contentChanged) {
      // No changes, don't save
      return;
    }
    
    setSavingDoc(true);
    setError(null);
    try {
      const { data } = await api.put(`/api/ai/docs/${selectedDocId}`, {
        title: docTitle.trim(),
        content: docContent,
      });
      if (data?.doc) {
        setDocs(prev => prev.map(doc => doc.id === data.doc.id ? data.doc : doc));
        // Update original values to match saved values
        setOriginalDocTitle(data.doc.title);
        setOriginalDocContent(data.doc.content);
        setHasUnsavedChanges(false);
        // Only show success message if there were actual changes
        if (titleChanged || contentChanged) {
          setSuccess('Document saved!');
          setTimeout(() => setSuccess(null), 2000);
        }
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to save changes right now.';
      setError(message);
    } finally {
      setSavingDoc(false);
    }
  }, [selectedDocId, docTitle, docContent, originalDocTitle, originalDocContent, savingDoc]);

  // Track changes to detect unsaved edits
  useEffect(() => {
    if (selectedDocId) {
      const titleChanged = docTitle.trim() !== originalDocTitle.trim();
      const contentChanged = docContent !== originalDocContent;
      setHasUnsavedChanges(titleChanged || contentChanged);
    }
  }, [docTitle, docContent, originalDocTitle, originalDocContent, selectedDocId]);

  // Auto-save only when there are actual changes
  useEffect(() => {
    if (activeTab === 'docs' && selectedDocId && hasUnsavedChanges && docTitle.trim() && docContent.trim()) {
      const timer = setTimeout(() => {
        handleSaveDoc();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [docTitle, docContent, selectedDocId, activeTab, hasUnsavedChanges, handleSaveDoc]);

  const handleDeleteDoc = async () => {
    if (!selectedDocId) return;
    if (!window.confirm('Delete this document?')) return;

    try {
      await api.delete(`/api/ai/docs/${selectedDocId}`);
      setDocs(prev => prev.filter(doc => doc.id !== selectedDocId));
      const remaining = docs.filter(doc => doc.id !== selectedDocId);
      setSelectedDocId(remaining.length > 0 ? remaining[0].id : null);
      setSuccess('Document deleted!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to delete document right now.';
      setError(message);
    }
  };

  const handleDeleteImage = async () => {
    if (!selectedImageId) return;
    if (!window.confirm('Delete this image?')) return;

    try {
      await api.delete(`/api/ai/images/${selectedImageId}`);
      setImages(prev => prev.filter(img => img.id !== selectedImageId));
      const remaining = images.filter(img => img.id !== selectedImageId);
      setSelectedImageId(remaining.length > 0 ? remaining[0].id : null);
      setSuccess('Image deleted!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to delete image right now.';
      setError(message);
    }
  };

  const handleCopyDoc = () => {
    if (docContent) {
      navigator.clipboard.writeText(docContent).then(() => {
        setSuccess('Document copied to clipboard!');
        setTimeout(() => setSuccess(null), 2000);
      }).catch(() => {
        setError('Failed to copy document.');
      });
    }
  };

  // Function to detect and apply document edits from AI response
  const applyDocumentEdits = (aiResponse) => {
    // Look for patterns like "UPDATE_DOCUMENT:" or "EDIT:" followed by JSON or structured content
    const updatePattern = /(?:UPDATE_DOCUMENT|EDIT_DOCUMENT|APPLY_EDIT):\s*\{[\s\S]*?\}/i;
    const match = aiResponse.match(updatePattern);
    
    if (match) {
      try {
        const editData = JSON.parse(match[0].split(':')[1].trim());
        if (editData.title !== undefined) {
          setDocTitle(editData.title);
        }
        if (editData.content !== undefined) {
          setDocContent(editData.content);
        }
        setSuccess('Document updated by AI!');
        setTimeout(() => setSuccess(null), 3000);
        return true;
      } catch (e) {
        console.error('Failed to parse AI edit:', e);
      }
    }
    
    // Also check for simpler patterns like "Replace X with Y" or "Add Z to the document"
    // This is a basic implementation - can be enhanced
    return false;
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingMessage || !selectedDocId) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setSendingMessage(true);
    setError(null);

    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage, id: Date.now() };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      // Send message with document context
      const { data } = await api.post('/api/ai/chat', {
        message: userMessage,
        chat_id: chatId,
        document_context: {
          doc_id: selectedDocId,
          title: docTitle,
          content: docContent,
        },
      });

      if (data?.messages) {
        // Add AI response to chat
        const aiMessage = data.messages.find(m => m.role === 'assistant');
        if (aiMessage) {
          setChatMessages(prev => [...prev, { ...aiMessage, id: Date.now() + 1 }]);
          
          // Try to apply document edits from AI response
          applyDocumentEdits(aiMessage.content);
        }
        
        // Update chat ID if this is a new chat
        if (data.chat && !chatId) {
          setChatId(data.chat.id);
        }
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to send message. Please try again.';
      setError(message);
      // Remove the user message if sending failed
      setChatMessages(prev => prev.filter(m => m.id !== newUserMessage.id));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendImageChatMessage = async (e) => {
    e.preventDefault();
    if (!imageChatInput.trim() || sendingImageMessage || !selectedImage) return;

    const userMessage = imageChatInput.trim();
    setImageChatInput('');
    setSendingImageMessage(true);
    setError(null);

    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage, id: Date.now() };
    setImageChatMessages(prev => [...prev, newUserMessage]);

    try {
      // Send message with image context
      const { data } = await api.post('/api/ai/chat', {
        message: userMessage,
        chat_id: imageChatId,
        image_context: {
          image_id: selectedImage.id,
          title: selectedImage.title,
          filename: selectedImage.filename,
        },
      });

      if (data?.messages) {
        // Add AI response to chat
        const aiMessage = data.messages.find(m => m.role === 'assistant');
        if (aiMessage) {
          setImageChatMessages(prev => [...prev, { ...aiMessage, id: Date.now() + 1 }]);
        }
        
        // Update chat ID if this is a new chat
        if (data.chat && !imageChatId) {
          setImageChatId(data.chat.id);
        }
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to send message. Please try again.';
      setError(message);
      // Remove the user message if sending failed
      setImageChatMessages(prev => prev.filter(m => m.id !== newUserMessage.id));
    } finally {
      setSendingImageMessage(false);
    }
  };

  const handleDownloadDoc = async (format = 'txt') => {
    if (!docTitle || !docContent) return;

    const sanitizedTitle = docTitle.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled_document';

    try {
      if (format === 'pdf') {
        // Create a temporary div to render the content with emojis preserved
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '816px'; // Letter size width in pixels at 96 DPI
        tempDiv.style.padding = '48px';
        // Use system fonts that support emojis
        tempDiv.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        tempDiv.style.fontSize = '12pt';
        tempDiv.style.lineHeight = '1.5';
        tempDiv.style.color = '#000000';
        tempDiv.style.backgroundColor = '#ffffff';
        tempDiv.style.whiteSpace = 'pre-wrap';
        tempDiv.style.wordWrap = 'break-word';
        tempDiv.style.unicodeBidi = 'embed'; // Ensure proper emoji rendering
        
        // Helper function to escape HTML but preserve emojis
        const escapeHtml = (text) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };
        
        // Add title if present
        if (docTitle.trim()) {
          const titleDiv = document.createElement('div');
          titleDiv.style.fontSize = '18pt';
          titleDiv.style.fontWeight = 'bold';
          titleDiv.style.marginBottom = '24px';
          // Use innerHTML to preserve emojis (after escaping HTML)
          titleDiv.innerHTML = escapeHtml(docTitle.trim());
          tempDiv.appendChild(titleDiv);
        }
        
        // Add content - use innerHTML to preserve emojis
        const contentDiv = document.createElement('div');
        // Escape HTML but preserve emojis by using textContent then innerHTML
        contentDiv.innerHTML = escapeHtml(docContent);
        tempDiv.appendChild(contentDiv);
        
        document.body.appendChild(tempDiv);
        
        // Wait a bit for fonts to load, especially emoji fonts
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          // Capture the content as an image using html2canvas (preserves emojis)
          const canvas = await html2canvas(tempDiv, {
            scale: 3, // Higher quality for better emoji rendering
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: false,
            foreignObjectRendering: true, // Better emoji support
            onclone: (clonedDoc) => {
              // Ensure emoji fonts are loaded in the cloned document
              const clonedDiv = clonedDoc.querySelector('div');
              if (clonedDiv) {
                clonedDiv.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
              }
            },
          });
          
          document.body.removeChild(tempDiv);
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          
          // Calculate scaling to fit PDF width
          const widthRatio = pdfWidth / imgWidth;
          const scaledWidth = pdfWidth;
          const scaledHeight = imgHeight * widthRatio;
          
          // If content fits on one page, add it directly
          if (scaledHeight <= pdfHeight) {
            pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight);
          } else {
            // Split across multiple pages
            const pageHeightInPixels = pdfHeight / widthRatio;
            let sourceY = 0;
            let pageNumber = 0;
            
            while (sourceY < imgHeight) {
              if (pageNumber > 0) {
                pdf.addPage();
              }
              
              const remainingHeight = imgHeight - sourceY;
              const pageSourceHeight = Math.min(pageHeightInPixels, remainingHeight);
              const pageDisplayHeight = pageSourceHeight * widthRatio;
              
              // Extract this page's portion from the canvas
              const pageCanvas = document.createElement('canvas');
              pageCanvas.width = imgWidth;
              pageCanvas.height = Math.ceil(pageSourceHeight);
              const ctx = pageCanvas.getContext('2d');
              ctx.drawImage(canvas, 0, sourceY, imgWidth, pageSourceHeight, 0, 0, imgWidth, pageSourceHeight);
              
              const pageImgData = pageCanvas.toDataURL('image/png');
              pdf.addImage(pageImgData, 'PNG', 0, 0, scaledWidth, pageDisplayHeight);
              
              sourceY += pageHeightInPixels;
              pageNumber++;
            }
          }
          
          pdf.save(`${sanitizedTitle}.pdf`);
        } catch (canvasError) {
          document.body.removeChild(tempDiv);
          // Fallback to text-based PDF if html2canvas fails
          const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
          const maxWidth = 520;
          const leftMargin = 48;
          const topMargin = 64;
          const lineHeight = 16;
          let cursorY = topMargin;
          pdf.setFont('Helvetica', '');
          pdf.setFontSize(12);

          if (docTitle.trim()) {
            pdf.setFontSize(18);
            pdf.text(docTitle.trim(), leftMargin, cursorY);
            cursorY += lineHeight * 2;
            pdf.setFontSize(12);
          }

          const lines = pdf.splitTextToSize(docContent, maxWidth);
          lines.forEach((line) => {
            if (cursorY > pdf.internal.pageSize.getHeight() - 64) {
              pdf.addPage();
              cursorY = topMargin;
            }
            pdf.text(line, leftMargin, cursorY);
            cursorY += lineHeight;
          });

          pdf.save(`${sanitizedTitle}.pdf`);
        }
      } else if (format === 'docx') {
        const paragraphs = docContent.split(/\r?\n/).map((line) => new Paragraph(line || ' '));
        const docx = new DocxDocument({
          sections: [
            {
              properties: {},
              children: paragraphs,
            },
          ],
        });
        const blob = await Packer.toBlob(docx);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizedTitle}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([docContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizedTitle}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setSuccess(`Document downloaded as .${format}!`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      setError('Unable to prepare that download. Please try again.');
    } finally {
      setDownloadMenuOpen(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!selectedImage) return;
    
    try {
      const imageUrl = `/uploads/ai_images/${selectedImage.filename}`;
      // Fetch the image as a blob to ensure it downloads properly with authentication
      const response = await fetch(imageUrl, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess('Image downloaded!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Failed to download image: ${err.message}. Please try again.`);
    }
  };

  // Load image as blob to handle authentication
  const loadImageAsBlob = useCallback(async (filename) => {
    if (imageUrls[filename]) {
      return imageUrls[filename];
    }
    
    try {
      const imageUrl = `/uploads/ai_images/${filename}`;
      const response = await fetch(imageUrl, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load image');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setImageUrls(prev => ({ ...prev, [filename]: blobUrl }));
      return blobUrl;
    } catch (err) {
      console.error('Error loading image:', err);
      return null;
    }
  }, [imageUrls]);

  const getImageUrl = useCallback((filename) => {
    // Return cached blob URL if available, otherwise trigger load
    if (imageUrls[filename]) {
      return imageUrls[filename];
    }
    // Trigger async load
    loadImageAsBlob(filename);
    // Return a placeholder or the direct URL as fallback
    return `/uploads/ai_images/${filename}`;
  }, [imageUrls, loadImageAsBlob]);

  // Load images when they're displayed
  useEffect(() => {
    if (selectedImage?.filename && !imageUrls[selectedImage.filename]) {
      loadImageAsBlob(selectedImage.filename);
    }
  }, [selectedImage, imageUrls, loadImageAsBlob]);

  // Load thumbnail images
  useEffect(() => {
    images.forEach(img => {
      if (img.filename && !imageUrls[img.filename]) {
        loadImageAsBlob(img.filename);
      }
    });
  }, [images, imageUrls, loadImageAsBlob]);

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPrompt}>
          <h1 style={styles.title}>📄🖼️ My Docs and Images</h1>
          <p style={styles.promptText}>Please log in to generate AI documents and images.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>📄🖼️ My Docs and Images</h1>
          <p style={styles.subtitle}>
            Generate structured documents and JPEG images with Friendly Friends AI. All content is saved automatically.
          </p>
        </div>
        {savingDoc && (
          <span style={styles.statusText}>Saving...</span>
        )}
      </header>

      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}
      {success && (
        <div style={styles.success}>
          <span style={styles.successIcon}>✓</span>
          {success}
        </div>
      )}

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'docs' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('docs')}
        >
          📄 Documents
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'images' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('images')}
        >
          🖼️ Images
        </button>
      </div>

      {activeTab === 'docs' ? (
        <div style={styles.layout}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Create new document</h2>
            </div>
            <form style={styles.formBody} onSubmit={handleGenerateDoc}>
              <textarea
                style={styles.textarea(theme)}
                placeholder="Example: Draft a one-page press release announcing our new wellness studio with three key sections."
                value={docPrompt}
                onChange={(e) => setDocPrompt(e.target.value)}
                disabled={generatingDoc}
                rows={8}
              />
              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    ...((generatingDoc || !docPrompt.trim()) ? styles.submitDisabled : {}),
                  }}
                  disabled={generatingDoc || !docPrompt.trim()}
                >
                  {generatingDoc ? 'Generating…' : 'Generate Document'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateManualDoc}
                  style={{
                    ...styles.submitButton,
                    ...styles.manualDocButton,
                  }}
                >
                  📝 Create Manual Document
                </button>
              </div>
            </form>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Your documents</h2>
            </div>
            <div style={styles.list}>
              {loadingDocs ? (
                <div style={styles.emptyState}>Loading your docs…</div>
              ) : docs.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📝</span>
                  <p>No docs yet. Generate your first document using the prompt box on the left.</p>
                </div>
              ) : (
                docs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      ...styles.listItem,
                      ...(doc.id === selectedDocId ? styles.listItemActive : {}),
                    }}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <h3 style={styles.listTitle}>{doc.title || 'Untitled doc'}</h3>
                    <div style={styles.listMeta}>
                      {doc.updated_at ? `Updated ${new Date(doc.updated_at).toLocaleString()}` : `Created ${new Date(doc.created_at).toLocaleString()}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...styles.panel, gridColumn: '1 / span 2' }}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>📥 Doc Input (Doc Imput)</h2>
              <span style={styles.docInputHint}>PDF · Word (.docx) · TXT · MD · RTF</span>
            </div>
            <div style={styles.docInputBody}>
              <p style={styles.docInputText}>
                Import a document from your computer, edit it inside Friendly Friends, and export it again if you want in the
                format you prefer.
              </p>
              <div style={styles.docInputControls}>
                <label style={styles.filePicker}>
                  <input
                    ref={docInputRef}
                    type="file"
                    onChange={handleDocInputChange}
                    style={styles.hiddenFileInput}
                  />
                  <span>{docInputFileName || 'Choose a document'}</span>
                </label>
                <button
                  type="button"
                  style={{
                    ...styles.importButton,
                    ...(importingDoc || !docInputFileName ? styles.importButtonDisabled : {}),
                  }}
                  onClick={handleDocInputUpload}
                  disabled={importingDoc || !docInputFileName}
                >
                  {importingDoc ? 'Importing…' : 'Import & Edit'}
                </button>
              </div>
              <p style={styles.docInputCaption}>
                Files stay private and never leave your browser except for this secure upload. Maximum size: Unlimited.
              </p>
            </div>
          </div>

          <div style={{ ...styles.panel, gridColumn: '1 / span 2', minHeight: '500px' }}>
            {selectedDoc ? (
              <div style={styles.editorContainer}>
                <div style={styles.editorMain}>
                  <div style={styles.editorHeader}>
                    <input
                      style={styles.input}
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Document title"
                    />
                    <div style={styles.editorActions}>
                      <button
                        onClick={handleCopyDoc}
                        style={styles.actionButton}
                        title="Copy to clipboard"
                      >
                        📋 Copy
                      </button>
                      <div style={styles.downloadMenuWrapper} ref={downloadMenuRef}>
                        <button
                          onClick={() => setDownloadMenuOpen((prev) => !prev)}
                          style={styles.downloadButton}
                          title="Download document"
                          type="button"
                        >
                          ⬇️ Download
                        </button>
                        {downloadMenuOpen && (
                          <div style={styles.formatMenu}>
                            <div style={styles.formatMenuTitle}>Choose format</div>
                            <button
                              type="button"
                              style={styles.formatMenuButton}
                              onClick={() => handleDownloadDoc('txt')}
                            >
                              Plain text (.txt)
                            </button>
                            <button
                              type="button"
                              style={styles.formatMenuButton}
                              onClick={() => handleDownloadDoc('docx')}
                            >
                              Word (.docx)
                            </button>
                            <button
                              type="button"
                              style={styles.formatMenuButton}
                              onClick={() => handleDownloadDoc('pdf')}
                            >
                              PDF (.pdf)
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleDeleteDoc}
                        style={styles.deleteButton}
                        title="Delete document"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <div style={styles.editorBody}>
                    <textarea
                      style={styles.documentTextarea}
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      placeholder="Document content..."
                      rows={20}
                    />
                    <div style={styles.statusText}>
                      {savingDoc ? 'Saving changes…' : hasUnsavedChanges ? 'Unsaved changes - saving automatically...' : 'All changes saved'}
                    </div>
                  </div>
                </div>
                <div style={styles.chatSidebar}>
                  <div style={styles.chatHeader}>
                    <h3 style={styles.chatTitle}>💬 AI Editor</h3>
                    <p style={styles.chatSubtitle}>Edit your document with AI</p>
                  </div>
                  <div style={styles.chatMessages}>
                    {chatMessages.length === 0 ? (
                      <div style={styles.chatEmpty}>
                        <p>Start a conversation to edit your document with AI.</p>
                        <p style={styles.chatHint}>Try: "Make the introduction more engaging" or "Add a conclusion paragraph"</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            ...styles.chatMessage,
                            ...(msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant),
                          }}
                        >
                          <div style={{
                            ...styles.chatMessageContent,
                            ...(msg.role === 'user' ? styles.chatMessageUserBubble : styles.chatMessageAssistantBubble),
                          }}>{msg.content}</div>
                        </div>
                      ))
                    )}
                    {sendingMessage && (
                      <div style={styles.chatMessageAssistant}>
                        <div style={{
                          ...styles.chatMessageContent,
                          ...styles.chatMessageAssistantBubble,
                        }}>Thinking...</div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  <form style={styles.chatInputForm} onSubmit={handleSendChatMessage}>
                    <textarea
                      style={styles.chatInput}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask AI to edit your document..."
                      rows={3}
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      style={{
                        ...styles.chatSendButton,
                        ...(sendingMessage || !chatInput.trim() ? styles.chatSendButtonDisabled : {}),
                      }}
                      disabled={sendingMessage || !chatInput.trim()}
                    >
                      {sendingMessage ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📄</span>
                <p>Select a document on the left to start editing, or generate a new one.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.layout}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Generate new image</h2>
            </div>
            <form style={styles.formBody} onSubmit={handleGenerateImage}>
              <textarea
                style={styles.textarea(theme)}
                placeholder="Example: A serene mountain landscape at sunset with a lake reflecting the colors"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                disabled={generatingImage}
                rows={8}
              />
              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    ...((generatingImage || !imagePrompt.trim()) ? styles.submitDisabled : {}),
                  }}
                  disabled={generatingImage || !imagePrompt.trim()}
                >
                  {generatingImage ? 'Generating…' : 'Generate Image'}
                </button>
              </div>
            </form>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Your images</h2>
            </div>
            <div style={styles.imageGrid}>
              {loadingImages ? (
                <div style={styles.emptyState}>Loading your images…</div>
              ) : images.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🖼️</span>
                  <p>No images yet. Generate your first image using the prompt box on the left.</p>
                </div>
              ) : (
                images.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      ...styles.imageCard,
                      ...(img.id === selectedImageId ? styles.imageCardActive : {}),
                    }}
                    onClick={() => setSelectedImageId(img.id)}
                  >
                    <img
                      src={getImageUrl(img.filename)}
                      alt={img.title}
                      style={styles.imageThumbnail}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div style={styles.imageCardInfo}>
                      <h3 style={styles.imageCardTitle}>{img.title || 'Untitled image'}</h3>
                      <div style={styles.imageCardMeta}>
                        {new Date(img.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...styles.panel, gridColumn: '1 / span 2', minHeight: '500px' }}>
            {selectedImage ? (
              <div style={styles.editorContainer}>
                <div style={styles.editorMain}>
                  <div style={styles.editorHeader}>
                    <div style={styles.imageTitle}>{selectedImage.title || 'Untitled image'}</div>
                    <div style={styles.editorActions}>
                      <button
                        onClick={handleDownloadImage}
                        style={styles.downloadButton}
                        title="Download image"
                      >
                        ⬇️ Download JPEG
                      </button>
                      <button
                        onClick={handleDeleteImage}
                        style={styles.deleteButton}
                        title="Delete image"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <div style={styles.imageViewer}>
                    <img
                      src={getImageUrl(selectedImage.filename)}
                      alt={selectedImage.title}
                      style={styles.imageFull}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    {selectedImage.prompt && (
                      <div style={styles.imagePrompt}>
                        <strong>Prompt:</strong> {selectedImage.prompt}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.chatSidebar}>
                  <div style={styles.chatHeader}>
                    <h3 style={styles.chatTitle}>💬 AI Assistant</h3>
                    <p style={styles.chatSubtitle}>Ask questions about your image</p>
                  </div>
                  <div style={styles.chatMessages}>
                    {imageChatMessages.length === 0 ? (
                      <div style={styles.chatEmpty}>
                        <p>Start a conversation about your image.</p>
                        <p style={styles.chatHint}>Try: "Describe this image" or "What improvements could be made?"</p>
                      </div>
                    ) : (
                      imageChatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            ...styles.chatMessage,
                            ...(msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant),
                          }}
                        >
                          <div style={{
                            ...styles.chatMessageContent,
                            ...(msg.role === 'user' ? styles.chatMessageUserBubble : styles.chatMessageAssistantBubble),
                          }}>{msg.content}</div>
                        </div>
                      ))
                    )}
                    {sendingImageMessage && (
                      <div style={styles.chatMessageAssistant}>
                        <div style={{
                          ...styles.chatMessageContent,
                          ...styles.chatMessageAssistantBubble,
                        }}>Thinking...</div>
                      </div>
                    )}
                    <div ref={imageChatBottomRef} />
                  </div>
                  <form style={styles.chatInputForm} onSubmit={handleSendImageChatMessage}>
                    <textarea
                      style={styles.chatInput}
                      value={imageChatInput}
                      onChange={(e) => setImageChatInput(e.target.value)}
                      placeholder="Ask AI about your image..."
                      rows={3}
                      disabled={sendingImageMessage}
                    />
                    <button
                      type="submit"
                      style={{
                        ...styles.chatSendButton,
                        ...(sendingImageMessage || !imageChatInput.trim() ? styles.chatSendButtonDisabled : {}),
                      }}
                      disabled={sendingImageMessage || !imageChatInput.trim()}
                    >
                      {sendingImageMessage ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🖼️</span>
                <p>Select an image on the left to view it, or generate a new one.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem 1.5rem 4rem',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 15s ease infinite',
  },
  loginPrompt: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    color: '#1f2937', // Dark text on white background
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    maxWidth: '800px',
    marginTop: '0.5rem',
  },
  promptText: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    background: 'rgba(102, 126, 234, 0.2)',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '12px',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    background: 'rgba(255, 255, 255, 0.95)',
    color: '#667eea',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#d32f2f',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(211, 47, 47, 0.2)',
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.1)',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#2e7d32',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(232, 245, 233, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(46, 125, 50, 0.2)',
    boxShadow: '0 4px 15px rgba(46, 125, 50, 0.1)',
  },
  successIcon: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  layout: {
    display: 'grid',
    gap: '1.5rem',
    gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)',
  },
  panel: {
    borderRadius: '20px',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    color: '#1f2937', // Dark text on white background
  },
  panelHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
  },
  docInputHint: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 500,
  },
  docInputBody: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  docInputText: {
    margin: 0,
    color: '#ffffff',
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  docInputControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
  },
  filePicker: {
    border: '2px dashed rgba(102, 126, 234, 0.4)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    color: '#667eea',
    fontWeight: 600,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    flex: '1 1 250px',
    textAlign: 'center',
  },
  hiddenFileInput: {
    display: 'none',
  },
  importButton: {
    background: 'linear-gradient(135deg, #22c1c3 0%, #29ffc6 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(41, 255, 198, 0.4)',
    transition: 'all 0.3s ease',
  },
  importButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  docInputCaption: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#64748b',
  },
  panelTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  formBody: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flex: 1,
  },
  textarea: (theme) => ({
    minHeight: '120px',
    width: '100%',
    borderRadius: '12px',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    padding: '1rem',
    background: theme.colors.inputBackground,
    backdropFilter: 'blur(10px)',
    color: theme.colors.inputText,
    resize: 'vertical',
    fontSize: '1rem',
    lineHeight: 1.5,
    transition: 'all 0.3s ease',
  }),
  formActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.875rem 1.75rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
  },
  submitDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
    boxShadow: 'none',
    background: 'linear-gradient(135deg, #94a3b8 0%, #757575 100%)',
  },
  manualDocButton: {
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  listItem: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    transition: 'background-color 0.15s ease',
  },
  listItemActive: {
    background: 'rgba(102, 126, 234, 0.2)',
  },
  listTitle: {
    margin: 0,
    fontWeight: 600,
    color: '#ffffff',
    fontSize: '1rem',
  },
  listMeta: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '0.25rem',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem',
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
  },
  imageCard: {
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  imageCardActive: {
    border: '2px solid #667eea',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  imageThumbnail: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
  },
  imageCardInfo: {
    padding: '0.75rem',
  },
  imageCardTitle: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  imageCardMeta: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '0.25rem',
  },
  editorHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  input: {
    flex: 1,
    borderRadius: '10px',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    color: '#ffffff',
    transition: 'all 0.3s ease',
  },
  imageTitle: {
    flex: 1,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffffff',
  },
  editorActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  downloadMenuWrapper: {
    position: 'relative',
  },
  actionButton: {
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.3s ease',
  },
  downloadButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
    transition: 'all 0.3s ease',
  },
  formatMenu: {
    position: 'absolute',
    top: '110%',
    right: 0,
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(30, 30, 60, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
    minWidth: '220px',
    padding: '0.75rem',
    zIndex: 50,
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  formatMenuTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '0.5rem',
  },
  formatMenuButton: {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'rgba(102, 126, 234, 0.2)',
    color: '#ffffff',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '0.35rem',
    transition: 'background-color 0.2s ease',
  },
  deleteButton: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(245, 87, 108, 0.3)',
    transition: 'all 0.3s ease',
  },
  editorBody: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
    gap: '1rem',
    flex: 1,
  },
  documentTextarea: {
    minHeight: '400px',
    borderRadius: '12px',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    color: '#ffffff',
    fontSize: '1rem',
    lineHeight: 1.6,
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
  },
  imageViewer: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFull: {
    maxWidth: '100%',
    maxHeight: '60vh',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  imagePrompt: {
    padding: '1rem',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '12px',
    fontSize: '0.9rem',
    color: '#1f2937',
    maxWidth: '800px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
    color: '#94a3b8',
    fontWeight: 500,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  editorContainer: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    minHeight: '500px',
  },
  editorMain: {
    flex: '1 1 60%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(102, 126, 234, 0.2)',
  },
  chatSidebar: {
    flex: '1 1 40%',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    minWidth: '300px',
    borderLeft: '1px solid rgba(102, 126, 234, 0.2)',
    color: '#1f2937', // Dark text on white background
  },
  chatHeader: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    color: '#1f2937', // Dark text
  },
  chatTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  chatSubtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  chatEmpty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    color: '#94a3b8',
  },
  chatHint: {
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  chatMessage: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '85%',
  },
  chatMessageUser: {
    alignSelf: 'flex-end',
  },
  chatMessageAssistant: {
    alignSelf: 'flex-start',
  },
  chatMessageUserBubble: {
    background: '#2563eb',
    color: '#ffffff',
  },
  chatMessageAssistantBubble: {
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#1f2937',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  chatMessageContent: {
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#1f2937', // Dark text for readability
  },
  chatInputForm: {
    padding: '1rem',
    borderTop: '1px solid rgba(102, 126, 234, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: 'rgba(255, 255, 255, 0.5)',
    color: '#1f2937', // Dark text on white background
  },
  chatInput: {
    width: '100%',
    borderRadius: '10px',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    padding: '0.75rem',
    fontSize: '0.9rem',
    background: '#ffffff',
    color: '#1f2937',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  chatSendButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.65rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
    transition: 'all 0.3s ease',
    alignSelf: 'flex-end',
  },
  chatSendButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

export default AiDocs;
