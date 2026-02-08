import { useState } from "react";
import ImageDropzone from "./components/ImageDropzone";
import "./App.css";

function App() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleSuccess = () => {
    setStatus("PDF downloaded successfully!");
    setError(null);
  };

  const handleError = (err) => {
    setError(err?.message || "Something went wrong");
    setStatus(null);
  };

  const handleReset = () => {
    setStatus(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Insert Image into PDF</h1>
        <p>Drop an image to insert it into your template PDF and download</p>
      </header>

      <main className="app-main">
        <ImageDropzone
          onSuccess={handleSuccess}
          onError={handleError}
          onReset={handleReset}
        />

        {status && (
          <div className="message message--success" role="status">
            {status}
          </div>
        )}
        {error && (
          <div className="message message--error" role="alert">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
