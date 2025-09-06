import React, { useState, useEffect } from 'react';
import type { DecorOutput, GeneratedImage, SlideshowFrame } from '../types';
import { ImageCard } from './ImageCard';
import { Loader } from './Loader';

// --- ICONS ---
const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);
const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
);
const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);


// --- HELPER FUNCTIONS & SUB-COMPONENTS ---

const renderMarkdownToHTML = (content: string) => {
  // Normalize line endings and filter out empty blocks
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\n+/).filter(block => block.trim() !== '');

  const htmlBlocks = blocks.map(block => {
    const trimmedBlock = block.trim();

    // Headers
    if (trimmedBlock.startsWith('## ')) {
      return `<h3 class="text-xl font-bold mt-6 mb-3 text-text-primary">${trimmedBlock.substring(3)}</h3>`;
    }
    if (trimmedBlock.startsWith('### ')) {
      return `<h4 class="text-lg font-semibold mt-4 mb-2 text-text-primary">${trimmedBlock.substring(4)}</h4>`;
    }

    // Lists
    if (trimmedBlock.match(/^(\*|-|\d+\.) /m)) {
      const lines = trimmedBlock.split('\n');
      const listItems = lines.map(line => `<li>${line.replace(/^(\*|-|\d+\.) /, '')}</li>`).join('');
      const listType = trimmedBlock.match(/^\d+\./) ? 'ol' : 'ul';
      const listClass = listType === 'ul' ? 'list-disc' : 'list-decimal';
      return `<${listType} class="${listClass} ml-6 space-y-1">${listItems}</${listType}>`;
    }

    // Paragraphs with inline formatting
    const inlineFormatted = trimmedBlock
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');

    return `<p>${inlineFormatted}</p>`;
  });

  return htmlBlocks.join('');
}

const renderSummaryWithImages = (content: string, images: GeneratedImage[]) => {
    const imageMap = new Map(images.map(img => [img.title, img.url]));
    
    let htmlContent = renderMarkdownToHTML(content);

    htmlContent = htmlContent.replace(/\[IMAGE: (.*?)\]/g, (match, title) => {
        const url = imageMap.get(title.trim());
        if (url) {
            // This logic injects the image outside the <p> tag for better layout control
            return `</p>
                <div class="my-4">
                    <img src="${url}" alt="${title.trim()}" class="rounded-lg shadow-md w-full max-w-lg mx-auto" />
                    <p class="text-center text-sm text-gray-500 mt-2">${title.trim()}</p>
                </div>
            <p>`; // The dangling <p> is for text that might follow the placeholder
        }
        return '';
    });

    // Clean up any empty paragraphs created by the image injection logic
    return { __html: htmlContent.replace(/<p>\s*<\/p>/g, '') };
};

const SummaryView: React.FC<{ planningSummary: string, shoppingSummary: string, images: GeneratedImage[] }> = ({ planningSummary, shoppingSummary, images }) => (
    <div className="space-y-8">
        <div>
            <h3 className="text-2xl font-bold text-text-primary mb-4 border-b-2 border-primary pb-2">Planning Summary</h3>
            <div className="text-text-secondary space-y-4" dangerouslySetInnerHTML={renderSummaryWithImages(planningSummary, images)} />
        </div>
        <div>
            <h3 className="text-2xl font-bold text-text-primary mb-4 border-b-2 border-primary pb-2">Shopping Summary</h3>
            <div className="text-text-secondary space-y-4" dangerouslySetInnerHTML={renderSummaryWithImages(shoppingSummary, images)} />
        </div>
    </div>
);

const SlideshowPlayer: React.FC<{ frames: SlideshowFrame[] }> = ({ frames }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = React.useCallback(() => {
    const isLastSlide = currentIndex === frames.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, frames.length]);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? frames.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  useEffect(() => {
    const timer = setTimeout(goToNext, 5000); // Autoplay every 5 seconds
    return () => clearTimeout(timer);
  }, [currentIndex, goToNext]);


  if (!frames || frames.length === 0) return null;

  const currentFrame = frames[currentIndex];

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg bg-black group" aria-roledescription="carousel" aria-label="Decor Slideshow">
      <div className="w-full h-[500px] flex items-center justify-center">
        <img src={currentFrame.url} alt={currentFrame.title} className="max-w-full max-h-full object-contain" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-4 text-white" aria-live="polite">
        <h4 className="font-bold text-lg">{currentFrame.title}</h4>
        <p className="text-sm">{currentFrame.caption}</p>
      </div>

      <button onClick={goToPrevious} className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Previous Slide">
        <ArrowLeft/>
      </button>
      <button onClick={goToNext} className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Next Slide">
        <ArrowRight/>
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-1 bg-white" style={{ animation: `progress 5s linear forwards`, animationPlayState: 'running' }} key={currentIndex}></div>
      </div>
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};


const DetailedView: React.FC<{ 
    planningGuide: string, 
    shoppingList: string, 
    images: GeneratedImage[], 
    videoUrl?: string,
    slideshow?: SlideshowFrame[],
    onGenerateVideo: (type: 'cinematic' | 'slideshow') => void;
    isVideoGenerating: boolean;
}> = ({ planningGuide, shoppingList, images, videoUrl, slideshow, onGenerateVideo, isVideoGenerating }) => {
    const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

    const handleCopy = (content: string, key: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied({ [key]: true });
            setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
        }).catch(err => console.error("Failed to copy text: ", err));
    };

    const handleDownload = (content: string, title: string) => {
        const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const renderSection = (title: string, content: string, sectionKey: string) => (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4 border-b-2 border-primary pb-2">
                <h3 className="text-2xl font-bold text-text-primary">{title}</h3>
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleCopy(content, sectionKey)} className={`flex items-center px-3 py-1 text-sm font-medium rounded-md transition-colors ${copied[sectionKey] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {copied[sectionKey] ? <CheckIcon /> : <CopyIcon />}
                        {copied[sectionKey] ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={() => handleDownload(content, title)} className="flex items-center px-3 py-1 text-sm font-medium rounded-md bg-primary/80 text-white hover:bg-primary">
                        <DownloadIcon /> Download
                    </button>
                </div>
            </div>
            <div className="text-text-secondary space-y-4" dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(content) }}></div>
        </div>
    );

    const VideoTourSection = () => {
        if (isVideoGenerating) {
            return (
                <div className="w-full min-h-[300px] flex flex-col justify-center items-center bg-gray-100 rounded-lg p-4">
                    <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-text-secondary font-semibold text-center">Generating video tour, this may take a few minutes...</p>
                </div>
            );
        }

        if (videoUrl) {
            return (
                <div className="rounded-lg overflow-hidden shadow-lg bg-black">
                    <video controls src={videoUrl} className="w-full max-h-[500px]" aria-label="Video tour of the decorated space">
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }

        if (slideshow) {
            return <SlideshowPlayer frames={slideshow} />;
        }

        return (
            <div className="bg-gray-100 p-6 rounded-lg text-center">
                <h4 className="text-lg font-bold text-text-primary">Bring your space to life!</h4>
                <p className="text-text-secondary mt-2 mb-4">Choose a video tour option to see your decor plan in action.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button onClick={() => onGenerateVideo('cinematic')} className="px-6 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-secondary/90 disabled:bg-secondary/50 transition-colors">
                        Generate Cinematic Video
                    </button>
                    <button onClick={() => onGenerateVideo('slideshow')} className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 disabled:bg-primary/50 transition-colors">
                        Create Image Slideshow
                    </button>
                </div>
                 <p className="text-xs text-gray-500 mt-3">Cinematic video generation can take several minutes.</p>
            </div>
        );
    };

    return (
        <div>
            <div className="mb-12">
                <h3 className="text-2xl font-bold mb-4 border-b-2 border-primary pb-2 text-text-primary">Video Tour</h3>
                <VideoTourSection />
            </div>
            <div className="mb-12">
                <h3 className="text-2xl font-bold mb-4 border-b-2 border-primary pb-2 text-text-primary">Visual Mockups</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {images.map((image, index) => (
                        <ImageCard key={index} title={image.title} url={image.url} />
                    ))}
                </div>
            </div>
            {renderSection('Planning & Setup Guide', planningGuide, 'planningGuide')}
            {renderSection('Shopping List', shoppingList, 'shoppingList')}
        </div>
    );
};

// --- MAIN COMPONENT ---

interface OutputDisplayProps {
  output: DecorOutput | null;
  isLoading: boolean;
  error: string | null;
  onGenerateVideo: (type: 'cinematic' | 'slideshow') => void;
  isVideoGenerating: boolean;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ output, isLoading, error, onGenerateVideo, isVideoGenerating }) => {
    const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

    if (isLoading) return <Loader />;

    if (error) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h3 className="text-xl font-bold text-red-600">An Error Occurred</h3>
                <p className="text-gray-600 mt-2">{error}</p>
            </div>
        );
    }

    if (!output) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg text-center h-full flex flex-col justify-center items-center">
                <div className="p-4 bg-gradient-to-r from-primary to-secondary rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-text-primary">Your Decor Plan Awaits</h3>
                <p className="text-text-secondary mt-2 max-w-md">Fill out the form and upload an image to generate a personalized party decoration plan.</p>
            </div>
        );
    }

    const tabStyle = "px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors";
    const activeTabStyle = "bg-primary text-white";
    const inactiveTabStyle = "text-gray-500 bg-gray-200 hover:bg-gray-300";

    return (
        <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg">
            <div className="flex border-b-2 border-primary mb-6">
                <button onClick={() => setViewMode('summary')} className={`${tabStyle} ${viewMode === 'summary' ? activeTabStyle : inactiveTabStyle}`}>
                    Summary
                </button>
                <button onClick={() => setViewMode('detailed')} className={`${tabStyle} ${viewMode === 'detailed' ? activeTabStyle : inactiveTabStyle}`}>
                    Detailed View
                </button>
            </div>

            {viewMode === 'summary' ? (
                <SummaryView 
                    planningSummary={output.planningSummary} 
                    shoppingSummary={output.shoppingSummary}
                    images={output.images}
                />
            ) : (
                <DetailedView 
                    planningGuide={output.planningGuide}
                    shoppingList={output.shoppingList}
                    images={output.images}
                    videoUrl={output.videoUrl}
                    slideshow={output.slideshow}
                    onGenerateVideo={onGenerateVideo}
                    isVideoGenerating={isVideoGenerating}
                />
            )}
        </div>
    );
};