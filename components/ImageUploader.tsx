import React from 'react';
import { UploadIcon } from '../constants';

interface ImageUploaderProps {
  label: string;
  preview: string | null;
  onRemove: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadText: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, preview, onRemove, onChange, uploadText }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      {preview ? (
        <div className="relative group">
          <img src={preview} alt="Preview" className="w-full h-auto rounded-lg object-cover aspect-square" />
          <button type="button" onClick={onRemove} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white" aria-label={`Remove ${label}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col justify-center items-center w-full h-full min-h-48 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
          <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
          <span className="mt-2 block text-sm font-semibold text-gray-400">{uploadText}</span>
          <span className="mt-1 block text-xs text-gray-500">PNG, JPG, WEBP up to 4MB</span>
          <input type="file" onChange={onChange} accept="image/png, image/jpeg, image/webp" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label={label} />
        </div>
      )}
    </div>
);

export default ImageUploader;