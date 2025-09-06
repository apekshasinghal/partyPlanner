import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import type { DecorFormData, DecorOutput, GeneratedImage, SlideshowFrame } from '../types';
import { DEFAULT_THEME_SUGGESTIONS, DEFAULT_COLOR_SCHEME_SUGGESTIONS } from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const intensityMap: { [key: number]: string } = {
    1: 'Minimalist and subtle with very few decorative pieces.',
    2: 'Lightly decorated with some key accents.',
    3: 'A standard, balanced amount of decorations suitable for the occasion.',
    4: 'Festive and abundant with plenty of decorations.',
    5: 'Maximalist and extravagant, filling the space with decorative elements.'
};


const generateText = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
};

const editImage = async (
    base64Image: string, 
    mimeType: string, 
    prompt: string,
    title: string
): Promise<GeneratedImage> => {
    
    const imagePart = { inlineData: { data: base64Image, mimeType } };
    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    let imageBase64 = "";
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            imageBase64 = part.inlineData.data;
        }
    }
    
    if(!imageBase64) {
        throw new Error(`Image generation failed for prompt: "${prompt}"`);
    }

    return { title, url: `data:${mimeType};base64,${imageBase64}` };
};

const generateImageFromText = async (prompt: string, title: string): Promise<GeneratedImage> => {
    console.log(`Generating image from text for: ${title}`);
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9',
            },
        });
        
        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error('Image generation returned no images.');
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return { title, url: `data:image/png;base64,${base64ImageBytes}` };

    } catch (error) {
        console.error(`Error in generateImageFromText for prompt "${prompt}":`, error);
        throw new Error(`Failed to generate image for "${title}".`);
    }
};

export const generateCinematicVideo = async (base64Image: string, mimeType: string, signal?: AbortSignal): Promise<string> => {
    console.log("Starting cinematic video generation from generated image...");
    const prompt = `Generate a short, high-definition, approximately 1-minute slow-motion video showing a cinematic, sweeping pan across this decorated space.`;
    
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            image: { imageBytes: base64Image, mimeType: mimeType },
            config: { numberOfVideos: 1 }
        });

        while (!operation.done) {
            if(signal?.aborted) throw new Error("Video generation cancelled");
            console.log("Video generation in progress, checking again in 10s...");
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (downloadLink) {
            console.log("Video generated, fetching video data...");
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`, { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.statusText}`);
            }
            const blob = await response.blob();
            console.log("Video data fetched, creating object URL.");
            return URL.createObjectURL(blob);
        } else {
            console.error("Video generation finished but no download link was found.", operation);
            throw new Error("Video generation failed: no download link provided.");
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
             console.log("Video fetch aborted.");
             throw new Error("Video generation was cancelled by the user.");
        }
        console.error("An error occurred during video generation:", error);
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred during video generation.");
    }
};

export const generateImageSlideshow = async (images: GeneratedImage[]): Promise<SlideshowFrame[]> => {
    const captionPromises = images.map(async (image) => {
        const base64Image = image.url.split(',')[1];
        const mimeType = image.url.match(/data:(image\/[a-zA-Z]+);/)?.[1] || 'image/png';

        const textPart = { text: "Write a short, engaging one-sentence caption for this image, to be used in a video slideshow of a decorated party space." };
        const imagePart = { inlineData: { data: base64Image, mimeType } };

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
            });

            const caption = response.text || "A beautiful view of the decorated space.";
            
            return {
                url: image.url,
                title: image.title,
                caption: caption.trim()
            };
        } catch (error) {
            console.error(`Failed to generate caption for ${image.title}`, error);
            return {
                url: image.url,
                title: image.title,
                caption: `A closer look at the ${image.title}.`
            };
        }
    });

    return Promise.all(captionPromises);
};


const getCloseupAreas = async (planningGuide: string, formData: DecorFormData): Promise<string[]> => {
    const prompt = `Based on the following event details and the generated planning guide, identify 3 to 4 key decorated areas, surfaces, or specific furniture pieces that would be most impactful to visualize in detailed close-up images. Focus on areas with distinct decorative elements.

    **Event Details:**
    - Occasion: ${formData.occasion}
    - Theme: ${formData.theme}
    - Color Scheme: ${formData.colorScheme}
    - Dining: ${formData.diningSetting}
    - Activity Corner: ${formData.activityCorner ? 'Yes' : 'No'}
    - Photobooth: ${formData.photobooth ? 'Yes' : 'No'}

    **Planning Guide Snippet:**
    "${planningGuide.substring(0, 1000)}..." 

    Provide your answer as a JSON object with a single key "areas" which is an array of short, descriptive strings (max 5 words each). For example: {"areas": ["Main dining table centerpiece", "Welcome sign at the entrance", "Themed photo booth backdrop", "Ceiling light fixtures with decor"]}.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        areas: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A short, descriptive name for a decorated area to be visualized.'
                            }
                        }
                    }
                },
            },
        });
        
        const jsonResponse = JSON.parse(response.text);
        if (jsonResponse && Array.isArray(jsonResponse.areas)) {
            return jsonResponse.areas.slice(0, 4);
        }
        return [];
    } catch (e) {
        console.error("Failed to get closeup areas, falling back to defaults.", e);
        return ["Main Dining Table", "A Decorated Wall or Corner"];
    }
};

const generateSummaries = async (planningGuide: string, shoppingList: string, images: GeneratedImage[]): Promise<{ planningSummary: string, shoppingSummary: string }> => {
    const imageTitles = images.map(img => `- ${img.title}`).join('\n');
    const prompt = `You are an expert event planner who creates concise, visual summaries.

    **Task:**
    Based on the detailed "Planning Guide" and "Shopping List" provided, create two brief, glanceable summaries.
    1.  **Planning Summary:** A short, easy-to-read summary of the key steps and ideas from the planning guide.
    2.  **Shopping Summary:** A high-level overview of the essential items from the shopping list.

    **Instructions:**
    - Keep the summaries concise and use markdown for readability (bolding, bullet points).
    - Where relevant, embed ONE or TWO of the most appropriate images directly into each summary to make it more visual.
    - Use the placeholder format \`[IMAGE: Image Title]\` to indicate where an image should go.
    - You MUST use the exact titles from the "Available Images" list provided below.

    **Available Images:**
    ${imageTitles}

    **Full Content:**
    ---
    **Planning Guide:**
    ${planningGuide}
    ---
    **Shopping List:**
    ${shoppingList}
    ---

    Return your response as a single JSON object with two keys: "planningSummary" and "shoppingSummary".
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        planningSummary: {
                            type: Type.STRING,
                            description: 'A concise markdown summary of the planning guide with image placeholders.'
                        },
                        shoppingSummary: {
                            type: Type.STRING,
                            description: 'A concise markdown summary of the shopping list with image placeholders.'
                        }
                    }
                },
            },
        });
        const summaries = JSON.parse(response.text);
        return {
            planningSummary: summaries.planningSummary || "Summary could not be generated.",
            shoppingSummary: summaries.shoppingSummary || "Summary could not be generated."
        };
    } catch (e) {
        console.error("Failed to generate summaries", e);
        return {
            planningSummary: "Summary could not be generated.",
            shoppingSummary: "Summary could not be generated."
        };
    }
};


const createPromptFromData = (formData: DecorFormData, task: string): string => {
    const intensityDescription = intensityMap[formData.decorIntensity] || 'A balanced amount of decorations.';
    
    let prompt = `You are an expert event planner and interior decorator. 
    
    **Task:** ${task}

    **Event Details:**
    - Occasion: ${formData.occasion}
    - Theme: ${formData.theme}
    - Space Type: ${formData.spaceType}
    - Number of Guests: ${formData.guests}
    - Venue Area: ${formData.area} sq ft
    - Budget: $${formData.budget}
    - Planning Time: ${formData.timeToPlan} days
    - Color Scheme: ${formData.colorScheme}
    - Decoration Intensity: ${intensityDescription}
    - Decor Style: ${formData.decorElements}
    - Furniture: ${formData.furniture}
    - Dining: ${formData.diningSetting}
    - Activity Corner: ${formData.activityCorner ? 'Yes' : 'No'}
    - Photobooth: ${formData.photobooth ? 'Yes' : 'No'}
    - Eco-Friendly Focus: ${formData.ecoFriendly ? 'Yes, prioritize sustainable options' : 'No'}
    `;

    switch(task) {
        case "Planning Guide":
            prompt += `
            **Instructions:** Generate a comprehensive, practical, step-by-step planning and setup guide. Include a timeline, layout plan, setup instructions, and professional tips. Format the output nicely using markdown-like headings (e.g., **Timeline**).`;
            break;
        case "Shopping List":
            prompt += `
            **Instructions:** Create a detailed, categorized shopping list. Where possible, suggest generic online store links for item categories (e.g., Amazon, Etsy, Party City). Be mindful of the budget and eco-friendly preference. Format the output nicely using markdown-like headings and bullet points.`;
            break;
    }
    return prompt;
};

const generateSuggestions = async (prompt: string, schema: any, fallback: string[]): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const jsonResponse = JSON.parse(response.text);
        const key = Object.keys(jsonResponse)[0];
        if (jsonResponse && Array.isArray(jsonResponse[key])) {
            return jsonResponse[key];
        }
        return fallback;
    } catch (e) {
        console.error("Failed to generate suggestions, falling back to defaults.", e);
        return fallback;
    }
};

export const generateThemeSuggestions = (occasion: string): Promise<string[]> => {
    const prompt = `Generate a list of 5 popular and creative party themes for a "${occasion}".`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            themes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    };
    return generateSuggestions(prompt, schema, DEFAULT_THEME_SUGGESTIONS);
};

export const generateColorSchemeSuggestions = (theme: string): Promise<string[]> => {
    const prompt = `Generate a list of 5 fitting and stylish color schemes for a party with a "${theme}" theme.`;
     const schema = {
        type: Type.OBJECT,
        properties: {
            colorSchemes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    };
    return generateSuggestions(prompt, schema, DEFAULT_COLOR_SCHEME_SUGGESTIONS);
};


export const generateDecorPlan = async (
    formData: DecorFormData,
    base64Image?: string,
    mimeType?: string,
    signal?: AbortSignal
): Promise<DecorOutput> => {
    try {
        if (signal?.aborted) throw new Error("Operation cancelled");
        const planningPrompt = createPromptFromData(formData, "Planning Guide");
        const shoppingPrompt = createPromptFromData(formData, "Shopping List");

        const [planningGuide, shoppingList] = await Promise.all([
            generateText(planningPrompt),
            generateText(shoppingPrompt),
        ]);
        
        if (signal?.aborted) throw new Error("Operation cancelled");

        const closeupAreas = await getCloseupAreas(planningGuide, formData);
        
        const imageGenerator = base64Image && mimeType 
            ? (prompt: string, title: string) => editImage(base64Image, mimeType, prompt, title)
            : (prompt: string, title: string) => generateImageFromText(prompt, title);
        
        const intensityDescription = intensityMap[formData.decorIntensity] || 'A balanced amount of decorations.';
        
        const baseImagePrompt = base64Image 
            ? `Using the provided image as the base, re-imagine and decorate the space for a ${formData.occasion} with a "${formData.theme}" theme. The color scheme is ${formData.colorScheme}. The dining setup is ${formData.diningSetting}. The decoration intensity should be: **${intensityDescription}**`
            : `Generate a photorealistic image of a decorated ${formData.spaceType} for a ${formData.occasion} with a "${formData.theme}" theme. The color scheme is ${formData.colorScheme}. The dining setup is ${formData.diningSetting}. The decoration intensity should be: **${intensityDescription}**`;

        const imagePromises: Promise<GeneratedImage>[] = [];
        imagePromises.push(imageGenerator(`${baseImagePrompt} Show a wide, front-facing overall view of the fully decorated space.`, "Overall View (Front)"));
        imagePromises.push(imageGenerator(`${baseImagePrompt} Show a top-down, bird's-eye view of the decorated space layout.`, "Overall View (Top)"));
        
        closeupAreas.forEach(area => {
            const frontCloseupPrompt = `${baseImagePrompt} Show a detailed, close-up front view plainly showing the items used in the decoration for this specific area: **${area}**.`;
            const angledCloseupPrompt = `${baseImagePrompt} Show a detailed, close-up angled or top view plainly showing the items used in the decoration for this specific area: **${area}**.`;
            
            imagePromises.push(imageGenerator(frontCloseupPrompt, `${area} (Front View)`));
            imagePromises.push(imageGenerator(angledCloseupPrompt, `${area} (Angled View)`));
        });
        
        if (signal?.aborted) throw new Error("Operation cancelled");

        const images = await Promise.all(imagePromises);
        
        if (signal?.aborted) throw new Error("Operation cancelled");
        
        const { planningSummary, shoppingSummary } = await generateSummaries(planningGuide, shoppingList, images);

        return { planningGuide, shoppingList, images, planningSummary, shoppingSummary };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
             console.log("Generation process aborted by user.");
        }
        console.error("Error generating decor plan:", error);
        throw new Error("Failed to generate the decor plan. The AI may be experiencing high traffic. Please try again later.");
    }
};