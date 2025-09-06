import React, { useState, useEffect, useCallback } from 'react';
import type { DecorFormData } from '../types';
import { SpaceType, DecorElements, FurnitureOption, DiningSetting } from '../types';
import { OCCASION_SUGGESTIONS, DEFAULT_THEME_SUGGESTIONS, DEFAULT_COLOR_SCHEME_SUGGESTIONS } from '../constants';
import { generateThemeSuggestions, generateColorSchemeSuggestions } from '../services/geminiService';

interface DecorFormProps {
  initialData: DecorFormData;
  onSubmit: (data: DecorFormData, imageFile: File | null) => void;
  isLoading: boolean;
  hasGeneratedPlan: boolean;
  onCancel: () => void;
}

const intensityLabels: { [key: number]: string } = {
  1: 'Minimalist',
  2: 'Light',
  3: 'Balanced',
  4: 'Festive',
  5: 'Extravagant',
};

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-primary inline-block ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const DynamicField: React.FC<{
    label: string;
    name: keyof DecorFormData;
    value: string;
    suggestions: string[];
    onChange: (name: keyof DecorFormData, value: string) => void;
    isLoading?: boolean;
}> = ({ label, name, value, suggestions, onChange, isLoading = false }) => {
    const customValueKey = 'CUSTOM_VALUE';
    // We need local state to track if we're in custom mode, because the derived value from props isn't enough.
    const [isCustomMode, setIsCustomMode] = useState(() => !suggestions.includes(value) && value !== '');

    // This effect syncs the local state if the `value` prop changes from the parent (e.g., on a reset).
    useEffect(() => {
        const shouldBeCustom = !suggestions.includes(value) && value !== '';
        if (shouldBeCustom !== isCustomMode) {
          setIsCustomMode(shouldBeCustom);
        }
        // We only want this effect to run when the `value` or `suggestions` props change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, suggestions]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;
        if (selectedValue === customValueKey) {
            // User explicitly chose to enter a custom value.
            setIsCustomMode(true);
            onChange(name, '');
        } else {
            // User chose a suggestion.
            setIsCustomMode(false);
            onChange(name, selectedValue);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(name, e.target.value);
    };

    // The <select> element should show "Enter your own..." if we're in custom mode.
    const selectValue = isCustomMode ? customValueKey : value;

    return (
        <div className="mb-4">
            <label htmlFor={`${name}-select`} className="block text-sm font-medium text-gray-700 mb-1">
                {label} {isLoading && <Spinner />}
            </label>
            <select
                id={`${name}-select`}
                value={selectValue}
                onChange={handleSelectChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                disabled={isLoading}
            >
                <option value="" disabled>Select an option</option>
                {suggestions.map(option => <option key={option} value={option}>{option}</option>)}
                <option value={customValueKey}>Enter your own...</option>
            </select>
            {/* The input field is shown based on our reliable local state. */}
            {isCustomMode && (
                <input
                    type="text"
                    id={`${name}-input`}
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    placeholder={`Enter custom ${label.toLowerCase()}`}
                    autoFocus
                />
            )}
        </div>
    );
};


export const DecorForm: React.FC<DecorFormProps> = ({ initialData, onSubmit, isLoading, hasGeneratedPlan, onCancel }) => {
  const [formData, setFormData] = useState<DecorFormData>(initialData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'upload' | 'describe'>('upload');

  const [themeSuggestions, setThemeSuggestions] = useState<string[]>(DEFAULT_THEME_SUGGESTIONS);
  const [colorSuggestions, setColorSuggestions] = useState<string[]>(DEFAULT_COLOR_SCHEME_SUGGESTIONS);
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [isColorLoading, setIsColorLoading] = useState(false);

  useEffect(() => {
    const fetchThemes = async () => {
        if (formData.occasion && !OCCASION_SUGGESTIONS.includes(formData.occasion)) {
             // If custom occasion, it might be better to fetch suggestions as well
        }
        if (!formData.occasion) return;

        setIsThemeLoading(true);
        try {
            const suggestions = await generateThemeSuggestions(formData.occasion);
            setThemeSuggestions(suggestions);
        } catch (e) {
            console.error("Failed to fetch themes", e);
            setThemeSuggestions(DEFAULT_THEME_SUGGESTIONS);
        } finally {
            setIsThemeLoading(false);
        }
    };
    fetchThemes();
  }, [formData.occasion]);

  useEffect(() => {
    const fetchColors = async () => {
        if (!formData.theme) return;
        setIsColorLoading(true);
        try {
            const suggestions = await generateColorSchemeSuggestions(formData.theme);
            setColorSuggestions(suggestions);
        } catch (e) {
            console.error("Failed to fetch color schemes", e);
            setColorSuggestions(DEFAULT_COLOR_SCHEME_SUGGESTIONS);
        } finally {
            setIsColorLoading(false);
        }
    };
    fetchColors();
  }, [formData.theme]);

  const handleFieldChange = useCallback((name: keyof DecorFormData, value: any) => {
    setFormData(prev => {
        const newState = { ...prev, [name]: value };
        // If occasion changes, reset theme and color
        if (name === 'occasion') {
            newState.theme = '';
            newState.colorScheme = '';
            setThemeSuggestions(DEFAULT_THEME_SUGGESTIONS);
            setColorSuggestions(DEFAULT_COLOR_SCHEME_SUGGESTIONS);
        }
        // If theme changes, reset color
        if (name === 'theme') {
            newState.colorScheme = '';
            setColorSuggestions(DEFAULT_COLOR_SCHEME_SUGGESTIONS);
        }
        return newState;
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        handleFieldChange(name as keyof DecorFormData, checked);
    } else {
        handleFieldChange(name as keyof DecorFormData, type === 'number' || type === 'range' ? Number(value) : value);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, inputMethod === 'upload' ? imageFile : null);
  };
  
  const handleMethodChange = (method: 'upload' | 'describe') => {
    setInputMethod(method);
    if (method === 'describe') {
        setImageFile(null);
        setImagePreview(null);
    }
  }

  const renderSelect = (name: keyof DecorFormData, label: string, options: string[]) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select id={name} name={name} value={formData[name] as string} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );

  const renderInput = (name: keyof DecorFormData, label: string, type: string, props: object = {}) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} id={name} name={name} value={formData[name] as any} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" {...props}/>
    </div>
  );

  const renderToggle = (name: keyof DecorFormData, label: string) => (
    <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <label htmlFor={name} className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id={name} name={name} checked={formData[name] as boolean} onChange={handleChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
    </div>
  );
  
  const buttonText = hasGeneratedPlan ? 'Adjust My Plan' : 'Generate Decor Plan';

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-text-primary">Event Details</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button type="button" onClick={() => handleMethodChange('upload')} className={`w-1/2 p-2 text-sm font-medium transition-colors focus:outline-none ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    Upload My Space
                </button>
                <button type="button" onClick={() => handleMethodChange('describe')} className={`w-1/2 p-2 text-sm font-medium transition-colors focus:outline-none ${inputMethod === 'describe' ? 'bg-primary text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    Describe My Space
                </button>
            </div>
        </div>
        
        {inputMethod === 'upload' ? (
            <div className="mb-4">
                <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-1">Image of Space</label>
                <input type="file" id="image-upload" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" required={inputMethod === 'upload'}/>
                {imagePreview && <img src={imagePreview} alt="Space preview" className="mt-4 rounded-md w-full h-auto" />}
            </div>
        ) : (
            renderSelect('spaceType', 'Type of Space', Object.values(SpaceType))
        )}

        <DynamicField
            label="Occasion"
            name="occasion"
            value={formData.occasion}
            suggestions={OCCASION_SUGGESTIONS}
            onChange={handleFieldChange}
        />
        <DynamicField
            label="Theme"
            name="theme"
            value={formData.theme}
            suggestions={themeSuggestions}
            onChange={handleFieldChange}
            isLoading={isThemeLoading}
        />
        <DynamicField
            label="Color Scheme"
            name="colorScheme"
            value={formData.colorScheme}
            suggestions={colorSuggestions}
            onChange={handleFieldChange}
            isLoading={isColorLoading}
        />

        {renderInput('guests', 'Number of Guests', 'number', { min: 1 })}
        {renderInput('area', 'Approximate Area (sq ft)', 'number', { min: 1 })}
        {renderInput('budget', 'Budget ($)', 'number', { min: 1 })}
        {renderInput('timeToPlan', 'Time to Plan (days)', 'number', { min: 1 })}
        
        <div className="mb-6">
            <label htmlFor="decorIntensity" className="block text-sm font-medium text-gray-700 mb-2">
            Decoration Intensity: <span className="font-bold text-primary">{intensityLabels[formData.decorIntensity]}</span>
            </label>
            <input
            type="range"
            id="decorIntensity"
            name="decorIntensity"
            min="1"
            max="5"
            step="1"
            value={formData.decorIntensity}
            onChange={handleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
        </div>

        {renderSelect('decorElements', 'Decor Elements', Object.values(DecorElements))}
        {renderSelect('furniture', 'Furniture', Object.values(FurnitureOption))}
        {renderSelect('diningSetting', 'Dining Setting', Object.values(DiningSetting))}

        {renderToggle('activityCorner', 'Activity Corner?')}
        {renderToggle('photobooth', 'Photobooth?')}
        {renderToggle('ecoFriendly', 'Eco-Friendly Decor?')}

        <div className="mt-4">
            <button type="submit" disabled={isLoading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
              {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              ) : null}
              {isLoading ? (hasGeneratedPlan ? 'Adjusting...' : 'Generating...') : buttonText}
            </button>
            {isLoading && (
                <button type="button" onClick={onCancel} className="mt-2 w-full bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                    Cancel
                </button>
            )}
        </div>
      </form>
    </div>
  );
};