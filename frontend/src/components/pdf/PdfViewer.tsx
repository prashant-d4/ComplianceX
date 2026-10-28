import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  LocateFixed,
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PdfViewerProps {
  fileUrl?: string | null;
  file?: File | Blob | null;
  filename: string;
  targetPage?: number | null;
  highlightBbox?: [number, number, number, number] | null;
  highlightPage?: number | null;
  highlightText?: string | null;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  file,
  filename,
  targetPage = 1,
  highlightBbox,
  highlightPage,
  highlightText,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(targetPage || 1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Jump to target page when prop changes
  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= (numPages || 999)) {
      setCurrentPage(targetPage);
    }
  }, [targetPage, numPages]);

  // 1. Load PDF Document from file or URL
  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    const loadDocument = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        let sourceUrl = fileUrl;

        if (file) {
          sourceUrl = URL.createObjectURL(file);
          objectUrlToRevoke = sourceUrl;
        } else if (!sourceUrl && filename) {
          // Fallback to backend demo-file streaming endpoint
          sourceUrl = `/api/documents/demo-file/${encodeURIComponent(filename)}`;
        }

        if (!sourceUrl) {
          throw new Error('No PDF source provided for viewing.');
        }

        const loadingTask = pdfjsLib.getDocument({ url: sourceUrl });
        const doc = await loadingTask.promise;

        if (!active) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);

        const initialPg = targetPage && targetPage <= doc.numPages ? targetPage : 1;
        setCurrentPage(initialPg);
      } catch (err: any) {
        if (!active) return;
        setErrorMessage(err.message || 'Failed to load PDF document.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadDocument();

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [fileUrl, file, filename]);

  // 2. Render Page to Canvas
  const renderPage = useCallback(
    async (pageNum: number, currentScale: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel ongoing render task if any
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancel error
        }
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });
        setPageSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF page render error:', err);
        }
      }
    },
    [pdfDoc]
  );

  // Trigger render when pdfDoc, currentPage or scale changes
  useEffect(() => {
    if (pdfDoc && currentPage >= 1 && currentPage <= numPages) {
      renderPage(currentPage, scale);
    }
  }, [pdfDoc, currentPage, scale, renderPage, numPages]);

  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleFitWidth = () => {
    if (containerRef.current && pageSize.width > 0) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const naturalWidth = pageSize.width / scale;
      const fitScale = Math.max(0.6, Math.min(containerWidth / naturalWidth, 2.0));
      setScale(Number(fitScale.toFixed(2)));
    } else {
      setScale(1.1);
    }
  };

  // Determine if highlight should be displayed on current page
  const isHighlightOnCurrentPage = Boolean(
    highlightPage === currentPage && highlightBbox && highlightBbox.length === 4
  );

  // Compute bounding box CSS coordinates:
  // PyMuPDF coords: [x0, y0, x1, y1] in points (origin top-left)
  // Scale multiplier: scale
  const highlightStyle: React.CSSProperties = React.useMemo(() => {
    if (!isHighlightOnCurrentPage || !highlightBbox) return { display: 'none' };
    const [x0, y0, x1, y1] = highlightBbox;
    const pad = 2; // slight visual breathing room
    const left = Math.max(0, x0 * scale - pad);
    const top = Math.max(0, y0 * scale - pad);
    const width = Math.max(6, (x1 - x0) * scale + pad * 2);
    const height = Math.max(6, (y1 - y0) * scale + pad * 2);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }, [isHighlightOnCurrentPage, highlightBbox, scale]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#F3F4F6] rounded-2xl border border-cream-border overflow-hidden shadow-inner ${className}`}
    >
      {/* 1. PDF Viewer Top Control Toolbar */}
      <div className="bg-white px-4 py-2.5 border-b border-cream-border flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Document Title & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-gold-500 shrink-0" />
          <span className="text-xs font-bold text-charcoal-900 truncate max-w-[200px] md:max-w-[280px]" title={filename}>
            {filename}
          </span>
          {isHighlightOnCurrentPage && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-400 text-charcoal-900 shadow-soft animate-pulse shrink-0">
              <Sparkles className="w-2.5 h-2.5" /> Evidence Highlight
            </span>
          )}
        </div>

        {/* Page & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Page Selector */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] rounded-lg p-0.5 border border-cream-border text-xs">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              className="p-1 rounded hover:bg-cream-200 text-charcoal-700 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] font-semibold text-charcoal-900">
              {currentPage} / {numPages || '—'}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages || isLoading}
              className="p-1 rounded hover:bg-cream-200 text-charcoal-700 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump to Highlight Page Button (if on a different page) */}
          {highlightPage && highlightPage !== currentPage && numPages > 0 && (
            <button
              type="button"
              onClick={() => setCurrentPage(highlightPage)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gold-400 hover:bg-gold-500 text-[10px] font-bold text-charcoal-900 shadow-soft transition-colors"
              title={`Jump to evidentiary citation on Page ${highlightPage}`}
            >
              <LocateFixed className="w-3 h-3" />
              <span>Go to Evidence (Pg {highlightPage})</span>
            </button>
          )}

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] rounded-lg p-0.5 border border-cream-border text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.6 || isLoading}
              className="p-1 rounded hover:bg-cream-200 text-charcoal-700 disabled:opacity-40 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono text-[11px] font-semibold text-charcoal-800 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 2.5 || isLoading}
              className="p-1 rounded hover:bg-cream-200 text-charcoal-700 disabled:opacity-40 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              className="p-1 rounded hover:bg-cream-200 text-charcoal-700 transition-colors ml-0.5"
              title="Fit to Width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Canvas Viewport Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center min-h-[500px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
            <Loader2 className="w-8 h-8 animate-spin text-charcoal-900" />
            <p className="text-xs font-semibold text-charcoal-700">Loading document with PDF.js...</p>
          </div>
        )}

        {errorMessage && (
          <div className="m-auto bg-white rounded-xl p-6 border border-red-200 shadow-soft text-center max-w-md space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <h4 className="text-sm font-bold text-charcoal-900">Document Display Error</h4>
            <p className="text-xs text-charcoal-muted">{errorMessage}</p>
          </div>
        )}

        {/* Relative Canvas Container for exact coordinate positioning */}
        <div
          className={`relative shadow-2xl rounded-sm transition-opacity ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            width: pageSize.width ? `${pageSize.width}px` : 'auto',
            height: pageSize.height ? `${pageSize.height}px` : 'auto',
          }}
        >
          {/* PDF Canvas */}
          <canvas ref={canvasRef} className="block bg-white rounded-sm" />

          {/* Coordinate-Accurate Bounding Box Highlight Overlay */}
          {isHighlightOnCurrentPage && (
            <div
              style={highlightStyle}
              className="absolute pointer-events-none rounded transition-all duration-200 z-10 border-2 border-amber-500 bg-amber-400/35 ring-4 ring-amber-400/30 animate-pulse"
              title={highlightText ? `Evidentiary text: "${highlightText}"` : 'Evidence Location'}
            >
              {/* Floating label badge */}
              <div className="absolute -top-6 left-0 bg-charcoal-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-auto whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-gold-400" />
                <span>Primary Source Evidence</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Status Bar */}
      <div className="bg-white px-4 py-1.5 border-t border-cream-border flex items-center justify-between text-[10px] text-charcoal-muted">
        <div>
          {isHighlightOnCurrentPage ? (
            <span className="font-semibold text-status-successText flex items-center gap-1">
              • Highlighting native PyMuPDF bounding box on Page {currentPage}
            </span>
          ) : highlightPage ? (
            <span>
              Citation is on Page {highlightPage}. Currently viewing Page {currentPage}.
            </span>
          ) : (
            <span>Native PDF point coordinate system</span>
          )}
        </div>
        <div className="font-mono">
          Page {currentPage} of {numPages} • Native 72 DPI
        </div>
      </div>
    </div>
  );
};
