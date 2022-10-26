import { useRef, useEffect, useCallback } from "react";
import useRenderer from "../hooks/useRenderer";
import { SEGMENTER_CONFIG } from "../constants";

/* Tensor flow */
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import "@mediapipe/selfie_segmentation/selfie_segmentation";
import "@tensorflow/tfjs-converter";

export default function useRenderStreamToOfflineCanvas(
  canvas,
  stream,
  params,
  chromeExtensionBase
) {
  const videoRef = useRef(null);
  const glContextRef = useRef(null);
  const hasInitializedRenderer = useRef(false);
  const segmenterRef = useRef(null);
  const requestAnimationFrameRef = useRef(null);
  const rendererRef = useRef(useRenderer());
  const offScreenCanvasRef = useRef(document.createElement("canvas"));

  useEffect(() => {
    if (segmenterRef.current != null) {
      return;
    }
    const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;

    const config = {
      ...SEGMENTER_CONFIG,
      modelUrl: chromeExtensionBase + "build/segmentation_model.json",
    };

    bodySegmentation.createSegmenter(model, config).then((segmenter) => {
      segmenterRef.current = segmenter;
    });
  }, [chromeExtensionBase]);

  const onVideoPlay = useCallback(() => {
    videoRef.current.width = videoRef.current.videoWidth;
    videoRef.current.height = videoRef.current.videoHeight;
  }, []);

  // intialize video
  useEffect(() => {
    if (videoRef.current == null) {
      videoRef.current = document.createElement("video");
    }

    if (stream != null) {
      videoRef.current.addEventListener("playing", onVideoPlay);
      try {
        videoRef.current.autoplay = true;
        videoRef.current.srcObject = stream;

        const playPromise = videoRef.current.play();

        if (playPromise != null) {
          playPromise.then().catch(() => {});
        }
      } catch (e) {
        console.info(e);
      }
    }

    () => {
      videoRef.current.removeEventListener("playing", onVideoPlay);
      try {
        videoRef.current.srcObject = null;
      } catch (e) {
        console.info(e);
      }
    };
  }, [onVideoPlay, stream]);

  // set WebGL ref only once
  useEffect(() => {
    if (!(glContextRef.current == null && canvas != null)) {
      return;
    }
    glContextRef.current = canvas.getContext("webgl");

    return () => {
      glContextRef.current = null;
    };
  }, [canvas]);

  // destroy renderer
  useEffect(() => {
    return () => {
      if (hasInitializedRenderer.current) {
        rendererRef.current.destroy();
        hasInitializedRenderer.current = false;
      }
    };
  }, []);

  const loop = useCallback(async () => {
    // first initialize renderer
    if (
      !hasInitializedRenderer.current &&
      glContextRef.current != null &&
      videoRef.current != null &&
      videoRef.current.videoWidth > 0
    ) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      offScreenCanvasRef.current.width = videoRef.current.videoWidth;
      offScreenCanvasRef.current.height = videoRef.current.videoHeight;
      rendererRef.current.init(glContextRef.current);
      hasInitializedRenderer.current = true;
    }

    const isVideoReady =
      hasInitializedRenderer.current && videoRef.current.videoWidth > 0;

    if (isVideoReady && segmenterRef.current != null && canvas != null) {
      const segmentation = await segmenterRef.current.segmentPeople(
        videoRef.current
      );

      const foregroundThreshold = 0.5;
      const edgeBlurAmount = 3;
      const flipHorizontal = false;

      try {
        await bodySegmentation.drawBokehEffect(
          offScreenCanvasRef.current,
          videoRef.current,
          segmentation,
          foregroundThreshold,
          params.blur,
          edgeBlurAmount,
          flipHorizontal
        );
      } catch (e) {
        console.error(e);
      }

      rendererRef.current.render(offScreenCanvasRef.current, {
        saturation: params.saturation,
        brightness: params.brightness,
        contrast: params.contrast,
        exposure: params.exposure,
      });
    }

    requestAnimationFrameRef.current = window.requestAnimationFrame(loop);
  }, [
    canvas,
    params.blur,
    params.brightness,
    params.contrast,
    params.exposure,
    params.saturation,
  ]);

  // run render loop
  useEffect(() => {
    if (requestAnimationFrameRef.current == null) {
      requestAnimationFrameRef.current = window.requestAnimationFrame(loop);
    }

    return () => {
      window.cancelAnimationFrame(requestAnimationFrameRef.current);
      requestAnimationFrameRef.current = null;
    };
  }, [loop]);
}
