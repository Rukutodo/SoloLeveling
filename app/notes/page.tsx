'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdFormatListBulleted, MdAdd, MdBook, MdDescription, MdDeleteOutline, MdTextFields, MdEdit, MdCleaningServices, MdMenu, MdZoomIn, MdZoomOut, MdHelpOutline } from 'react-icons/md';
import styles from './notes.module.css';

interface Note {
  _id: string;
  title: string;
  content: string;
  section: string;
  drawingData: string;
  pageStyle: string;
  pageColor: string;
  updatedAt: string;
}

export default function NotesPage() {
  const { status: sessionStatus } = useSession();
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const [notes, setNotes] = useState<Note[]>([]);
  const [sections, setSections] = useState<string[]>(['General']);
  const [activeSection, setActiveSection] = useState('General');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const [toolMode, setToolMode] = useState<'text' | 'pen' | 'eraser'>('text');
  const [penColor, setPenColor] = useState('#2c3e50');
  const [penWidth, setPenWidth] = useState(4);
  const [usePressure, setUsePressure] = useState(true);
  const [shapeType, setShapeType] = useState<'rect' | 'ellipse' | 'arrow'>('rect');
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [showPanes, setShowPanes] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const startCoord = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchUserData();
      fetchNotes();
    }
  }, [sessionStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(true);
      if (e.key === 'Alt') setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(false);
      if (e.key === 'Alt') setIsAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoomLevel(z => Math.min(3, z + 0.1));
        } else {
          setZoomLevel(z => Math.max(0.5, z - 0.1));
        }
      }
    };
    
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (wrapper) wrapper.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const fetchUserData = async () => {
    const res = await fetch('/api/user');
    if (res.ok) {
      const data = await res.json();
      setSidebarData({ userName: data.stats.name, level: data.stats.level, xp: data.stats.xp, xpToNext: data.stats.xpToNext, rank: data.stats.rank, title: data.stats.title, rankColor: data.stats.rankColor });
    }
  };

  const fetchNotes = async () => {
    const res = await fetch('/api/notes');
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes);
      
      const uniqueSections = Array.from(new Set(data.notes.map((n: Note) => n.section))) as string[];
      if (!uniqueSections.includes('General')) uniqueSections.unshift('General');
      setSections(uniqueSections);
    }
  };

  const activeNote = notes.find(n => n._id === activeNoteId);
  const sectionNotes = notes.filter(n => n.section === activeSection);

  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content;
      }
    }
    
    // Load Canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 1200; 
      canvas.height = 2000; // Large height for scrolling notes
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (activeNote?.drawingData) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = activeNote.drawingData;
        }
      }
    }
  }, [activeNoteId]);

  const createNote = async () => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Page', section: activeSection, content: '' })
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes([note, ...notes]);
      setActiveNoteId(note._id);
    }
  };

  const createSection = () => {
    const name = prompt('New Section Name:');
    if (name && !sections.includes(name)) {
      setSections([...sections, name]);
      setActiveSection(name);
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(n => n._id === id ? { ...n, ...updates } : n));
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    }, 1000);
  };

  const deleteNote = async (id: string) => {
    if (confirm('Delete this page?')) {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n._id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const formatText = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      updateNote(activeNoteId!, { content: editorRef.current.innerHTML });
      editorRef.current.focus();
    }
  };

  // Canvas Handlers
  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (toolMode === 'text' && !e.ctrlKey && !isCtrlPressed && !e.altKey && !isAltPressed) return;
    const { x, y } = getCoordinates(e);
    
    if (e.altKey || isAltPressed) {
      startCoord.current = { x, y };
      if (canvasRef.current && ctxRef.current) {
        snapshot.current = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } else {
      ctxRef.current?.beginPath();
      ctxRef.current?.moveTo(x, y);
      
      if (toolMode === 'eraser' || e.ctrlKey || isCtrlPressed) {
        if (ctxRef.current) {
          ctxRef.current.globalCompositeOperation = 'destination-out';
          ctxRef.current.lineWidth = 30;
          ctxRef.current.strokeStyle = '#000';
          ctxRef.current.lineTo(x + 0.1, y + 0.1);
          ctxRef.current.stroke();
          ctxRef.current.beginPath();
          ctxRef.current.moveTo(x, y);
        }
      }
    }
    
    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    if (toolMode === 'text' && !e.ctrlKey && !isCtrlPressed && !e.altKey && !isAltPressed) return;
    const { x, y } = getCoordinates(e);
    const pressure = (usePressure && e.pressure !== undefined && e.pressure > 0) ? e.pressure : 0.5;
    
    if (ctxRef.current) {
      if (e.altKey || isAltPressed) {
        if (snapshot.current) {
          ctxRef.current.putImageData(snapshot.current, 0, 0);
        }
        
        ctxRef.current.globalCompositeOperation = 'source-over';
        ctxRef.current.lineWidth = penWidth;
        ctxRef.current.strokeStyle = penColor;
        ctxRef.current.beginPath();
        
        const startX = startCoord.current.x;
        const startY = startCoord.current.y;
        
        if (shapeType === 'rect') {
          ctxRef.current.strokeRect(startX, startY, x - startX, y - startY);
        } else if (shapeType === 'ellipse') {
          const radiusX = Math.abs(x - startX) / 2;
          const radiusY = Math.abs(y - startY) / 2;
          const centerX = startX + (x - startX) / 2;
          const centerY = startY + (y - startY) / 2;
          ctxRef.current.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctxRef.current.stroke();
        } else if (shapeType === 'arrow') {
          ctxRef.current.moveTo(startX, startY);
          ctxRef.current.lineTo(x, y);
          ctxRef.current.stroke();
          
          const headlen = 15;
          const angle = Math.atan2(y - startY, x - startX);
          ctxRef.current.beginPath();
          ctxRef.current.moveTo(x, y);
          ctxRef.current.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
          ctxRef.current.moveTo(x, y);
          ctxRef.current.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
          ctxRef.current.stroke();
        }
      } else {
        if (toolMode === 'eraser' || e.ctrlKey || isCtrlPressed) {
          ctxRef.current.globalCompositeOperation = 'destination-out';
          ctxRef.current.lineWidth = 30;
          ctxRef.current.strokeStyle = '#000';
        } else {
          ctxRef.current.globalCompositeOperation = 'source-over';
          ctxRef.current.lineWidth = usePressure ? pressure * penWidth * 2 : penWidth;
          ctxRef.current.strokeStyle = penColor;
        }
        ctxRef.current.lineTo(x, y);
        ctxRef.current.stroke();
      }
    }
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (isDrawing) {
      if (!e.altKey && !isAltPressed) {
        ctxRef.current?.closePath();
      }
      snapshot.current = null;
      setIsDrawing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      if (activeNoteId && canvasRef.current) {
        updateNote(activeNoteId, { drawingData: canvasRef.current.toDataURL('image/png') });
      }
    }
  };

  const getBgClass = () => {
    if (!activeNote) return '';
    if (activeNote.pageStyle === 'grid') return styles.bgGrid;
    if (activeNote.pageStyle === 'plain') return styles.bgPlain;
    return styles.bgRule;
  };

  if (sessionStatus === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className={styles.notesLayout}>
          
          
          {showPanes && (
            <>
              <div className={styles.sectionsPane}>
                <div className={styles.paneHeader}>
                  <span>Sections</span>
                  <button className={styles.addBtn} onClick={createSection}><MdAdd size={20} /></button>
                </div>
                <div className={styles.paneList}>
                  {sections.map(sec => (
                    <div 
                      key={sec} 
                      className={`${styles.listItem} ${activeSection === sec ? styles.listItemSelected : ''}`}
                      onClick={() => { setActiveSection(sec); setActiveNoteId(null); }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><MdBook /> {sec}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.pagesPane}>
                <div className={styles.paneHeader}>
                  <span>Pages</span>
                  <button className={styles.addBtn} onClick={createNote}><MdAdd size={20} /></button>
                </div>
                <div className={styles.paneList}>
                  {sectionNotes.length === 0 && <div style={{padding: '16px', color: '#666', textAlign: 'center'}}>No pages in this section.</div>}
                  {sectionNotes.map(note => (
                    <div 
                      key={note._id}
                      className={`${styles.listItem} ${activeNoteId === note._id ? styles.listItemSelected : ''}`}
                      onClick={() => setActiveNoteId(note._id)}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap'}}><MdDescription /> {note.title}</div>
                      <button className={styles.addBtn} onClick={(e) => { e.stopPropagation(); deleteNote(note._id); }}><MdDeleteOutline /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className={styles.editorPane}>
            {activeNote ? (
              <>
                <div className={styles.editorToolbar}>
                  <button className={styles.toolbarBtn} onClick={() => setShowPanes(!showPanes)} title="Toggle Sidebars"><MdMenu /></button>
                  <div style={{width: '1px', background: 'var(--sl-glass-border)', margin: '0 8px'}}></div>

                  <button className={`${styles.toolbarBtn} ${toolMode === 'text' ? styles.listItemSelected : ''}`} onClick={() => setToolMode('text')} title="Text Mode"><MdTextFields /></button>
                  <button className={`${styles.toolbarBtn} ${toolMode === 'pen' ? styles.listItemSelected : ''}`} onClick={() => setToolMode('pen')} title="Pen Mode"><MdEdit /></button>
                  <button className={`${styles.toolbarBtn} ${toolMode === 'eraser' ? styles.listItemSelected : ''}`} onClick={() => setToolMode('eraser')} title="Eraser Mode"><MdCleaningServices /></button>
                  
                  {toolMode === 'pen' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                      <input type="color" className={styles.colorPicker} value={penColor} onChange={(e) => setPenColor(e.target.value)} title="Pen Color" />
                      <input type="range" min="1" max="20" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} title="Pen Thickness" style={{ width: '60px' }} />
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--sl-text-dim)' }} title="Toggle Pressure Sensitivity">
                        <input type="checkbox" checked={usePressure} onChange={(e) => setUsePressure(e.target.checked)} />
                        Press.
                      </label>
                      <div style={{width: '1px', background: 'var(--sl-glass-border)', height: '20px', margin: '0 4px'}}></div>
                      <select 
                        className="sl-input" 
                        value={shapeType} 
                        onChange={(e) => setShapeType(e.target.value as any)}
                        style={{ padding: '2px 4px', fontSize: '0.8rem', background: '#fdfbf7', height: 'auto', color: '#111' }}
                        title="Alt-Key Shape Tool"
                      >
                        <option value="rect">Rect</option>
                        <option value="ellipse">Ellipse</option>
                        <option value="arrow">Arrow</option>
                      </select>
                    </div>
                  )}

                  <div style={{width: '1px', background: 'var(--sl-glass-border)', margin: '0 8px'}}></div>
                  
                  <button className={styles.toolbarBtn} onClick={() => formatText('bold')}><MdFormatBold /></button>
                  <button className={styles.toolbarBtn} onClick={() => formatText('italic')}><MdFormatItalic /></button>
                  <button className={styles.toolbarBtn} onClick={() => formatText('underline')}><MdFormatUnderlined /></button>
                  <button className={styles.toolbarBtn} onClick={() => formatText('insertUnorderedList')}><MdFormatListBulleted /></button>
                  
                  <div style={{flex: 1}}></div>
                  
                  {/* Zoom Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: '4px', marginRight: '8px' }}>
                    <button className={styles.addBtn} onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))}><MdZoomOut /></button>
                    <span style={{ fontSize: '0.8rem', width: '36px', textAlign: 'center', color: 'var(--sl-text-dim)' }}>{Math.round(zoomLevel * 100)}%</span>
                    <button className={styles.addBtn} onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))}><MdZoomIn /></button>
                  </div>

                  {/* Help Toggle */}
                  <button className={styles.toolbarBtn} onClick={() => setShowHelp(!showHelp)} title="Quick Shortcuts Help" style={{ marginRight: '8px' }}>
                    <MdHelpOutline />
                  </button>

                  <select 
                    className="sl-input" 
                    value={activeNote.pageStyle || 'plain'} 
                    onChange={(e) => updateNote(activeNote._id, { pageStyle: e.target.value })}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#fdfbf7', height: 'auto', color: '#111' }}
                  >
                    <option value="plain">Plain</option>
                    <option value="rule">Rule</option>
                    <option value="grid">Grid</option>
                  </select>
                  <input 
                    type="color" 
                    className={styles.colorPicker} 
                    value={activeNote.pageColor || '#1e1e24'} 
                    onChange={(e) => updateNote(activeNote._id, { pageColor: e.target.value })} 
                    title="Page Color"
                  />
                </div>
                
                <div className={styles.editorAreaWrapper} ref={wrapperRef} style={{ position: 'relative' }}>
                  {showHelp && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '280px',
                        background: 'rgba(30, 30, 36, 0.95)',
                        border: '1px solid var(--sl-glass-border)',
                        borderRadius: '8px',
                        padding: '16px',
                        zIndex: 100,
                        color: '#fff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(10px)',
                        pointerEvents: 'auto'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--sl-text-primary)' }}>Drawing Shortcuts</span>
                        <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.8rem' }}>Close</button>
                      </div>
                      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--sl-text-dim)' }}>
                        <div><strong>⌨️ Ctrl Key:</strong> Hold to temporarily switch to Eraser.</div>
                        <div><strong>⌨️ Alt Key:</strong> Hold to draw shapes (Rect, Ellipse, Arrow) in Pen Mode.</div>
                        <div><strong>🔍 Ctrl + Scroll:</strong> Zoom in/out of the note canvas.</div>
                        <div><strong>✏️ Pen controls:</strong> Adjust color, thickness, and pressure-sensitivity using the toolbar options when Pen is selected.</div>
                        <div><strong>📱 Sidebar:</strong> Toggle the Hamburger menu on the left to hide/show list panels.</div>
                      </div>
                    </div>
                  )}

                  <div 
                    className={`${styles.zoomContainer} ${getBgClass()}`} 
                    style={{ 
                      backgroundColor: activeNote.pageColor || 'var(--sl-bg-surface)',
                      transform: `scale(${zoomLevel})`
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className={`${styles.canvasOverlay} ${(toolMode === 'eraser' || isCtrlPressed) && !isAltPressed ? styles.eraserCursor : (toolMode === 'pen' ? styles.penCursor : '')}`}
                      style={{ pointerEvents: (toolMode === 'text' && !isCtrlPressed && !isAltPressed) ? 'none' : 'auto' }}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                    />

                    <input 
                      type="text"
                      className={styles.editorTitle}
                      style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}
                      value={activeNote.title}
                      onChange={(e) => updateNote(activeNote._id, { title: e.target.value })}
                      placeholder="Page Title"
                    />

                    <div 
                      ref={editorRef}
                      className={styles.editorContent}
                      style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}
                      contentEditable
                      data-placeholder="Start typing..."
                      onInput={(e) => updateNote(activeNote._id, { content: e.currentTarget.innerHTML })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl-text-ghost)' }}>
                Select or create a page to begin.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
