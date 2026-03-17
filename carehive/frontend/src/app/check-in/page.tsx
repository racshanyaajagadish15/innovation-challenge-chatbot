'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AuthGate } from '@/components/AuthGate';
import { motion } from 'framer-motion';

export default function CheckInPage() {
  const { accessToken } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    mood: number;
    posture: string;
    summary?: string;
  } | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        streamRef.current = stream;
        setAllowed(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setAllowed(false);
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    if (!accessToken) {
      setError('Sign in to save vision check-ins.');
      return;
    }
    setError(null);
    setResult(null);
    setAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get canvas context');
      setAnalyzing(false);
      return;
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    try {
      const res = await api.visionAnalyze({ image: base64, mimeType: 'image/jpeg' });
      setResult(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-2xl mx-auto"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Video check-in</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Allow camera, capture a frame, and we’ll infer mood + posture (best-effort, not medical diagnosis).
          </p>
        </div>

        {allowed === false && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/25">
            <CardContent className="pt-6">
              <p className="text-amber-900 dark:text-amber-100">Camera access was denied. Enable it in your browser.</p>
            </CardContent>
          </Card>
        )}

        {!accessToken && (
          <Card className="mb-6 border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-700 dark:text-slate-200">
                <Link href="/login" className="text-teal-600 hover:underline dark:text-teal-300">Sign in</Link> to save check-ins to your health log.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Camera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden bg-slate-900 dark:bg-slate-950 aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {allowed === null && (
                <div className="absolute inset-0 flex items-center justify-center text-white/90">Requesting camera…</div>
              )}
            </div>
            <Button className="mt-4" onClick={captureAndAnalyze} disabled={allowed !== true || analyzing}>
              {analyzing ? 'Analyzing…' : 'Capture & analyze'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/25">
            <CardContent className="pt-6">
              <p className="text-red-900 dark:text-red-100">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-teal-100 bg-teal-50/50 dark:border-teal-800/60 dark:bg-teal-950/25">
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">Mood</p>
                  <p className="text-3xl font-semibold text-teal-700 dark:text-teal-300">{result.mood}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800 dark:text-slate-100">Posture</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{result.posture}</p>
                </div>
              </div>
              {result.summary && <p className="mt-2 text-slate-600 dark:text-slate-300">{result.summary}</p>}
              <p className="mt-3 text-sm text-teal-800 dark:text-teal-200">Saved to your health log as a vision check-in.</p>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Uses AI vision to estimate mood and posture from a single frame. Not a medical diagnosis.
        </p>
      </motion.div>
    </AuthGate>
  );
}
