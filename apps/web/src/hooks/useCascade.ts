import { useState } from "react";

export interface ITask {
  taskId?: string | undefined;
  status?: string | undefined;
  progress?: number | undefined;
}

const useCascade = () => {
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<ITask | null>(null);

  const handleUploadCascade = async (files: File[]) => {
    setUploading(true);
    setError('');
    setUploadResult(null);
    try {
      // TODO:
      console.warn(files);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setUploading(false);
  }

  return {
    isUploading,
    error,
    uploadResult,
    handleUploadCascade,
  }
}

export default useCascade;
