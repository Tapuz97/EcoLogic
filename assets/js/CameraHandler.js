// Handles BOTH camera.html and report.html logic.
const KEY = "ECO_REPORT_PHOTO";

/* ======================= CAMERA PAGE ======================= */
async function initCameraPage() {
  const video = document.getElementById("cameraPreview");
  const canvas = document.getElementById("shotCanvas");
  const btnPrimary = document.getElementById("btnPrimary");
  const btnSecondary = document.getElementById("btnSecondary");

  if (!video || !canvas || !btnPrimary || !btnSecondary) return; // not on camera.html

  let stream = null;
  let facingMode = "environment"; // back camera first on mobile
  let state = "live";             // "live" | "captured"
  let lastDataUrl = null;

  function setState(newState) {
    state = newState;
    if (state === "live") {
      btnPrimary.textContent = "📸 Snap Photo";
      btnSecondary.textContent = "Flip";
    } else {
      btnPrimary.textContent = "Upload";
      btnSecondary.textContent = "Retake";
    }
  }

  async function startCamera() {
    await stopCamera();
    const constraints = { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      video.hidden = false;
      canvas.hidden = true;
      setState("live");
    } catch (err) {
      alert("Camera error: " + (err?.message || err));
    }
  }

  async function stopCamera() {
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
      stream = null;
    }
  }

  function captureFrame() {
    if (!stream) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    // Freeze to canvas
    lastDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    video.hidden = true;
    canvas.hidden = false;

    // We can stop the stream to release camera while user decides
    stopCamera();
    setState("captured");
  }

  function uploadAndReturn() {
    if (!lastDataUrl) return;
    try { sessionStorage.setItem(KEY, lastDataUrl); } catch {}
    window.location.href = "report.html";
  }

  async function retake() {
    lastDataUrl = null;
    await startCamera();
  }

  async function flip() {
    facingMode = (facingMode === "user") ? "environment" : "user";
    await startCamera();
  }

  // Primary button handler
  btnPrimary.addEventListener("click", () => {
    if (state === "live") captureFrame();
    else uploadAndReturn();
  });

  // Secondary button handler
  btnSecondary.addEventListener("click", () => {
    if (state === "live") flip();
    else retake();
  });

  // AUTO-START camera on page load
  if (navigator.mediaDevices?.getUserMedia) {
    startCamera();
  } else {
    alert("Camera not supported on this device/browser.");
  }

  // Ensure camera is released if user leaves
  window.addEventListener("pagehide", stopCamera);
}

/* ======================= REPORT PAGE ======================= */
function initReportPage() {
  const previewWrap = document.getElementById("photoPreviewWrap");
  const previewImg  = document.getElementById("photoPreview");
  const emptyState  = document.getElementById("photoEmpty");
  const retake      = document.getElementById("retakeBtn");
  const toCam       = document.getElementById("openCameraBtn");
  const photoFlag   = document.getElementById("photoBlobField");
  const submitBtn   = document.getElementById("submitReportBtn");

  if (!previewWrap) return; // not on report.html

  // "Take Photo" → open camera page
  toCam?.addEventListener("click", () => { window.location.href = "camera.html"; });

  // Restore captured image (if any)
  const dataUrl = sessionStorage.getItem(KEY);
  if (dataUrl && previewImg) {
    previewImg.src = dataUrl;
    previewImg.style.display = "block";
    if (emptyState) emptyState.style.display = "none";
    if (photoFlag) photoFlag.value = "1";
    if (submitBtn) submitBtn.disabled = false;
    if (retake) retake.hidden = false;
  }

  // Retake clears and reopens camera
  retake?.addEventListener("click", () => {
    sessionStorage.removeItem(KEY);
    window.location.href = "camera.html";
  });
}

/* ======================= BOOT ======================= */
document.addEventListener("DOMContentLoaded", () => {
  initCameraPage();
  initReportPage();
});
