import "./style.css";

const video = document.getElementById("video") as HTMLVideoElement;
const startButton = document.getElementById("start") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;

async function startCamera() {
  startButton.disabled = true;
  status.textContent = "opening camera…";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();

    console.log(`camera: ${video.videoWidth}x${video.videoHeight}`);
    document.getElementById("start-screen")!.remove();
  } catch (err) {
    console.error(err);
    status.textContent = `Could not open camera: ${(err as Error).message}`;
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", startCamera);