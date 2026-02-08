import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import "./ImageDropzone.css";

function FileThumb({ file }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={file.name} className="file-thumb" /> : <span className="file-thumb file-thumb--placeholder" />;
}

const API_BASE = "/api";

export default function ImageDropzone({ onSuccess, onError, onReset }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0] ?? null);
    onReset?.();
  }, [onReset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
    disabled: loading,
  });

  const insertImage = async () => {
    if (!file) {
      onError?.({ message: "Please drop an image first" });
      return;
    }

    setLoading(true);
    onReset?.();

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_BASE}/insert-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      a.click();
      URL.revokeObjectURL(url);

      onSuccess?.();
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    onReset?.();
  };

  return (
    <div className="image-dropzone">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "dropzone--active" : ""} ${
          loading ? "dropzone--disabled" : ""
        }`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <svg
            className="dropzone-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="dropzone-text">
            {isDragActive ? "Drop image here..." : "Drag & drop an image to insert into your PDF"}
          </p>
          <p className="dropzone-hint">or click to browse (JPEG, PNG)</p>
        </div>
      </div>

      {file && (
        <div className="file-list">
          <div className="file-list-header">
            <span>Image selected</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={clearFile}
              disabled={loading}
            >
              Remove
            </button>
          </div>
          <div className="file-item">
            <FileThumb file={file} />
            <span className="file-name" title={file.name}>
              {file.name}
            </span>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={insertImage}
            disabled={loading}
          >
            {loading ? "Inserting into PDF..." : "Insert image & Download PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
