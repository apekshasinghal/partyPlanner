import React, { useState, useRef } from 'react';
import { DecorForm } from './components/DecorForm';
import { OutputDisplay } from './components/OutputDisplay';
import { Header } from './components/Header';
import { generateDecorPlan, generateCinematicVideo, generateImageSlideshow } from './services/geminiService';
import type { DecorFormData, DecorOutput } from './types';
import { INITIAL_FORM_DATA } from './constants';

const App: React.FC = () => {
  const [outputData, setOutputData] = useState<DecorOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState<boolean>(false);
  const generationAbortController = useRef<AbortController | null>(null);

  const handleFormSubmit = async (data: DecorFormData, imageFile: File | null) => {
    setIsLoading(true);
    setError(null);
    setOutputData(null);
    generationAbortController.current = new AbortController();
    const signal = generationAbortController.current.signal;

    try {
      const generate = async (base64Image?: string, mimeType?: string) => {
          const result = await generateDecorPlan(data, base64Image, mimeType, signal);
          setOutputData(result);
      };

      if (imageFile) {
        // Flow for user-uploaded image
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = async () => {
          if (signal.aborted) return;
          try {
            const base64WithHeader = reader.result as string;
            const base64Image = base64WithHeader.split(',')[1];
            const mimeType = imageFile.type;
            await generate(base64Image, mimeType);
          } catch (e) {
             if (e instanceof Error && e.name !== 'AbortError') {
                console.error(e);
                setError(e.message);
            }
          } finally {
              setIsLoading(false);
          }
        };
        reader.onerror = () => {
          setError('Failed to read the image file.');
          setIsLoading(false);
        };
      } else {
        // Flow for user-described space
        await generate();
        setIsLoading(false);
      }
    } catch (e) {
       if (e instanceof Error && e.name !== 'AbortError') {
            console.error(e);
            setError(e.message);
        }
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (generationAbortController.current) {
        generationAbortController.current.abort();
    }
    setIsLoading(false);
    setError("Generation was cancelled by the user.");
  };

  const handleGenerateVideo = async (type: 'cinematic' | 'slideshow') => {
      if (isVideoGenerating || !outputData) return;
      
      setIsVideoGenerating(true);
      setError(null);

      try {
          if (type === 'cinematic') {
              const mainImage = outputData.images.find(img => img.title === "Overall View (Front)");
              if (!mainImage) {
                  throw new Error("Could not find the main generated image to create a video from.");
              }

              const base64WithHeader = mainImage.url;
              const mimeType = base64WithHeader.match(/data:(image\/[a-zA-Z]+);/)?.[1] || 'image/png';
              const base64Image = base64WithHeader.split(',')[1];

              const videoUrl = await generateCinematicVideo(base64Image, mimeType);
              setOutputData(prev => prev ? { ...prev, videoUrl, slideshow: undefined } : null);
          } else if (type === 'slideshow') {
              const slideshow = await generateImageSlideshow(outputData.images);
              setOutputData(prev => prev ? { ...prev, slideshow, videoUrl: undefined } : null);
          }
      } catch(e) {
          console.error(e);
          setError(e instanceof Error ? e.message : 'Failed to generate video tour.');
      } finally {
          setIsVideoGenerating(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <DecorForm
              initialData={INITIAL_FORM_DATA}
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
              hasGeneratedPlan={outputData !== null}
              onCancel={handleCancel}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <OutputDisplay
              output={outputData}
              isLoading={isLoading}
              error={error}
              onGenerateVideo={handleGenerateVideo}
              isVideoGenerating={isVideoGenerating}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;