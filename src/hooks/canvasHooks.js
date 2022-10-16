import { useRef, useContext, useEffect, useCallback } from "react";
import ColorCorrectionContext from "../data_providers/ColorCorrectionContext";
import MediaStreamContext from "../data_providers/MediaStreamContext";
import renderVideoToCanvas from "../utils/RenderVideoToCanvasWebGL";
import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export function useRenderStreamToCanvas(canvas) {
  const { stream } = useContext(MediaStreamContext);
  const { hue, saturation, brightness, contrast, exposure } = useContext(
    ColorCorrectionContext
  );
  const requestAnimationFrameRef = useRef(null);
  const glRef = useRef(null);
  const videoRef = useRef(null);
  const renderer = useRef(null);
  const segmenterRef = useRef(null);
  const segmentationRef = useRef(null);

  useEffect(() => {
    if (segmenterRef.current != null) {
      return;
    }
    const segmenterConfig = {
      runtime: "mediapipe", // or 'mediapipe'
      modelType: "general",
    };

    bodySegmentation
      .createSegmenter(
        bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
        segmenterConfig
      )
      .then((segmenter) => {
        segmenterRef.current = segmenter;
      });
  }, []);

  const onVideoPlay = useCallback(() => {
    if (canvas != null && videoRef.current.videoWidth > 0) {
      glRef.current = canvas.getContext("webgl");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      videoRef.current.width = videoRef.current.videoWidth;
      videoRef.current.height = videoRef.current.videoHeight;
      renderer.current = renderVideoToCanvas(glRef.current, videoRef.current);
      console.log("start segmentation");
      segmenterRef.current
        .segmentPeople(videoRef.current)
        .then((segmentation) => {
          console.log("stop segmentation");
          segmentationRef.current = segmentation;
        });
    }
  }, [canvas]);

  useEffect(() => {
    if (videoRef.current == null) {
      videoRef.current = document.createElement("video");
    }
    videoRef.current.addEventListener("playing", onVideoPlay);
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  }, [canvas, onVideoPlay, stream]);

  useEffect(() => {
    async function loop() {
      if (
        segmenterRef.current != null &&
        videoRef.current != null &&
        renderer.current != null &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        if (segmentationRef.current != null) {
          const [people] = segmentationRef.current;
          const segmentedImageData = await people.mask.toImageData();
          renderer.current?.render(segmentedImageData, {
            hue,
            saturation,
            brightness,
            contrast,
            exposure,
          });
        } else {
          renderer.current?.render(videoRef.current, {
            hue,
            saturation,
            brightness,
            contrast,
            exposure,
          });
        }
      }

      requestAnimationFrameRef.current = window.requestAnimationFrame(loop);
    }

    requestAnimationFrameRef.current = window.requestAnimationFrame(loop);

    return () => window.cancelAnimationFrame(requestAnimationFrameRef.current);
  }, [brightness, contrast, exposure, hue, saturation]);
}
