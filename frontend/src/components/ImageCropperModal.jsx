import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaTimes,
  FaCheck,
  FaRedo,
  FaSearchMinus,
  FaSearchPlus,
  FaCircleNotch,
} from "react-icons/fa";

const CROP_CONTAINER_SIZE = 340;
const CROP_CIRCLE_DIAMETER = 300;
const OUTPUT_SIZE = 512;

const ImageCropperModal = ({
  imageSrc,
  onClose,
  onCropComplete,
  isUploading = false,
}) => {
  const [imageObj, setImageObj] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);

  // Load image object from source
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageObj(img);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Compute scale and bounds
  const getScale = useCallback(() => {
    if (!imageObj) return 1;
    const isRotated = rotation === 90 || rotation === 270;
    const wEff = isRotated ? imageObj.height : imageObj.width;
    const hEff = isRotated ? imageObj.width : imageObj.height;

    // Minimum scale to cover crop circle
    const minScale = Math.max(
      CROP_CIRCLE_DIAMETER / wEff,
      CROP_CIRCLE_DIAMETER / hEff
    );
    return minScale * zoom;
  }, [imageObj, rotation, zoom]);

  // Clamp pan within circle bounds
  const clampPan = useCallback(
    (x, y, scale = getScale()) => {
      if (!imageObj) return { x: 0, y: 0 };
      const isRotated = rotation === 90 || rotation === 270;
      const wEff = isRotated ? imageObj.height : imageObj.width;
      const hEff = isRotated ? imageObj.width : imageObj.height;

      const dispW = wEff * scale;
      const dispH = hEff * scale;

      const maxPanX = Math.max(0, (dispW - CROP_CIRCLE_DIAMETER) / 2);
      const maxPanY = Math.max(0, (dispH - CROP_CIRCLE_DIAMETER) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, x)),
        y: Math.min(maxPanY, Math.max(-maxPanY, y)),
      };
    },
    [imageObj, rotation, getScale]
  );

  // Draw preview onto canvas
  useEffect(() => {
    if (!imageObj) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CROP_CONTAINER_SIZE, CROP_CONTAINER_SIZE);

    const scale = getScale();
    const clamped = clampPan(pan.x, pan.y, scale);

    ctx.save();
    ctx.translate(
      CROP_CONTAINER_SIZE / 2 + clamped.x,
      CROP_CONTAINER_SIZE / 2 + clamped.y
    );
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
    ctx.restore();
  }, [imageObj, pan, zoom, rotation, getScale, clampPan]);

  // Mouse / Touch handlers for dragging
  const handlePointerDown = (clientX, clientY) => {
    if (isUploading) return;
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setStartPan({ ...pan });
  };

  const handlePointerMove = (clientX, clientY) => {
    if (!isDragging || isUploading) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const newPan = clampPan(startPan.x + dx, startPan.y + dy);
    setPan(newPan);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom control
  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.min(3, Math.max(1, newZoom));
    setZoom(clampedZoom);
    const newScale = getScale();
    setPan((p) => clampPan(p.x, p.y, newScale));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(zoom + delta);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
    setPan({ x: 0, y: 0 });
  };

  // Export cropped high-res image
  const handleApplyCrop = () => {
    if (!imageObj || isUploading) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = OUTPUT_SIZE;
    exportCanvas.height = OUTPUT_SIZE;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = "high";

    const k = OUTPUT_SIZE / CROP_CIRCLE_DIAMETER;
    const scale = getScale();
    const clamped = clampPan(pan.x, pan.y, scale);

    exportCtx.save();
    exportCtx.translate(OUTPUT_SIZE / 2 + clamped.x * k, OUTPUT_SIZE / 2 + clamped.y * k);
    exportCtx.rotate((rotation * Math.PI) / 180);
    exportCtx.scale(scale * k, scale * k);
    exportCtx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
    exportCtx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], "profile_photo.jpg", {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(croppedFile, previewUrl);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#111b21] border border-[#222e35] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 px-5 bg-[#202c33] flex items-center justify-between border-b border-[#222e35]">
          <h2 className="text-white text-base font-semibold tracking-wide">
            Drag photo to adjust
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full text-[#8696a0] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Cancel"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#0b141a]">
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab ${
              isDragging ? "cursor-grabbing" : ""
            }`}
            style={{
              width: CROP_CONTAINER_SIZE,
              height: CROP_CONTAINER_SIZE,
            }}
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) handlePointerDown(t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) handlePointerMove(t.clientX, t.clientY);
            }}
            onTouchEnd={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              width={CROP_CONTAINER_SIZE}
              height={CROP_CONTAINER_SIZE}
              className="w-full h-full block"
            />

            {/* Circular mask overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${CROP_CONTAINER_SIZE} ${CROP_CONTAINER_SIZE}`}
            >
              <defs>
                <mask id="crop-mask-circle">
                  <rect
                    width={CROP_CONTAINER_SIZE}
                    height={CROP_CONTAINER_SIZE}
                    fill="white"
                  />
                  <circle
                    cx={CROP_CONTAINER_SIZE / 2}
                    cy={CROP_CONTAINER_SIZE / 2}
                    r={CROP_CIRCLE_DIAMETER / 2}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width={CROP_CONTAINER_SIZE}
                height={CROP_CONTAINER_SIZE}
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#crop-mask-circle)"
              />
              <circle
                cx={CROP_CONTAINER_SIZE / 2}
                cy={CROP_CONTAINER_SIZE / 2}
                r={CROP_CIRCLE_DIAMETER / 2}
                fill="none"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="2"
              />
              {/* Guides on drag */}
              {isDragging && (
                <>
                  <line
                    x1={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 3}
                    y1={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 2}
                    x2={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 3}
                    y2={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 2}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 3}
                    y1={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 2}
                    x2={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 3}
                    y2={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 2}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 2}
                    y1={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 3}
                    x2={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 2}
                    y2={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 3}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={CROP_CONTAINER_SIZE / 2 - CROP_CIRCLE_DIAMETER / 2}
                    y1={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 3}
                    x2={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 2}
                    y2={CROP_CONTAINER_SIZE / 2 + CROP_CIRCLE_DIAMETER / 3}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="4 4"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Zoom & Rotate Controls */}
        <div className="px-6 py-4 bg-[#111b21] flex items-center justify-between gap-4 border-t border-[#222e35]">
          <div className="flex-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              className="text-[#8696a0] hover:text-white transition-colors"
              title="Zoom out"
            >
              <FaSearchMinus className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#2a3942] rounded-lg appearance-none cursor-pointer accent-[#00a884]"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              className="text-[#8696a0] hover:text-white transition-colors"
              title="Zoom in"
            >
              <FaSearchPlus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRotate}
            disabled={isUploading}
            className="p-2.5 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition-colors"
            title="Rotate photo"
          >
            <FaRedo className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-6 bg-[#202c33] flex items-center justify-between border-t border-[#222e35]">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-[#8696a0] hover:text-white transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isUploading}
            className="w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#02906f] active:bg-[#008069] text-white flex items-center justify-center shadow-lg shadow-[#00a884]/25 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Apply and set profile photo"
          >
            {isUploading ? (
              <FaCircleNotch className="w-5 h-5 animate-spin" />
            ) : (
              <FaCheck className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
