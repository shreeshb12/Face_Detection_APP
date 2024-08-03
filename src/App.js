import React, { useEffect, useRef } from "react";
import './index.css'
import * as faceapi from "face-api.js";

const App = () => {
  const videoRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models"; // Ensure this path is correct
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);
      startVideo();
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((error) => {
          console.error("Error accessing webcam:", error);
        });
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      const handlePlay = () => {
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        console.log('Canvas created:', canvas);

        const container = document.getElementById('canvas-container');
        if (container) {
          container.innerHTML = ''; // Clear previous canvas
          container.appendChild(canvas);
        }
        canvasRef.current = canvas;

        const displaySize = {
          width: '720',
          height: '560',
        };
        faceapi.matchDimensions(canvas, displaySize);

        const intervalId = setInterval(async () => {
          const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

          resizedDetections.forEach((detection) => {
            const { box } = detection.detection;
            const { gender, age } = detection;
            const expressions = detection.expressions;
            const highestExpression = Object.keys(expressions).reduce((a, b) =>
              expressions[a] > expressions[b] ? a : b
            );

            const drawBox = new faceapi.draw.DrawBox(box, {
              label: `${Math.round(age)} year old ${gender} - ${Math.round(expressions[highestExpression] * 100)}% ${highestExpression}`,
              boxColor: 'blue', // Set the box color to blue
              boxLineWidth: 3, // Optional: Set the line width of the box
            });
            
            drawBox.draw(canvas);
          });
        }, 100);

        return () => clearInterval(intervalId);
      };

      videoRef.current.addEventListener("play", handlePlay);

      return () => {
        videoRef.current?.removeEventListener("play", handlePlay);
      };
    }
  }, [videoRef.current]);

  return (
    <div style={{ position:'relative'}}>
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{ position:'absolute',width: "720px", height: "560px"}}
      />
      <div id="canvas-container" style={{position:'absolute', width: "720px", height: "560px",top:"0," ,zIndex:'999'}}></div>
    </div>
  );
};

export default App;
