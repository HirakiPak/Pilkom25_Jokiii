
import React, { useState, useCallback, ChangeEvent } from 'react';
import { generateSolution } from './services/geminiService';
import { PythonIcon, WordIcon, SparklesIcon, DownloadIcon, UploadIcon, LoadingIcon } from './components/icons';

type OutputFormat = 'python' | 'word';
type FontSelection = 'Arial' | 'Times New Roman';

declare global {
  interface Window { mammoth: any; }
}

const App: React.FC = () => {
  const [assignmentText, setAssignmentText] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('python');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  const [selectedFont, setSelectedFont] = useState<FontSelection>('Arial');
  const [resultFormat, setResultFormat] = useState<OutputFormat | null>(null);


  const handleGenerate = useCallback(async () => {
    if (!assignmentText.trim()) {
      setError('Harap masukkan deskripsi tugas atau unggah file.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      const solution = await generateSolution(assignmentText, outputFormat);
      setResult(solution);
      setResultFormat(outputFormat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.');
    } finally {
      setIsLoading(false);
    }
  }, [assignmentText, outputFormat]);

  const handleDownload = useCallback(() => {
    if (!result) return;

    const fileExtension = outputFormat === 'python' ? 'py' : 'doc';
    const filename = `solusi_tugas.${fileExtension}`;

    let blob;

    if (outputFormat === 'word') {
      const formattedHtml = result
        .split('\n')
        .map(line => {
          if (line.trim() === '') return '<br>';
          // Matches lines that are fully bolded, treating them as headings
          if (line.match(/^\s*\*\*.+\*\*\s*$/)) {
            return `<h3>${line.replace(/\*\*/g, '')}</h3>`;
          }
          // Replaces bolding within a line
          const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return `<p>${processedLine}</p>`;
        })
        .join('');
      
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Solusi Tugas</title>
            <style>
                body { font-family: ${selectedFont === 'Arial' ? 'Arial, sans-serif' : '"Times New Roman", serif'}; font-size: 12pt; }
                h3 { font-weight: bold; font-size: 14pt; margin-top: 1.2em; margin-bottom: 0.6em; }
                p { margin: 0; padding: 0; margin-bottom: 0.8em; }
                strong { font-weight: bold; }
                code { font-family: 'Courier New', monospace; background-color: #f1f1f1; padding: 2px 5px; border-radius: 4px; }
            </style>
        </head>
        <body>${formattedHtml}</body>
        </html>
      `;
      blob = new Blob([fullHtml], { type: 'application/msword' });

    } else {
      blob = new Blob([result], { type: 'text/plain' });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, outputFormat, selectedFont]);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    setError(null);

    if (fileExtension === 'doc' || fileExtension === 'docx') {
      if (!window.mammoth) {
        setError("Pustaka untuk membaca file Word tidak dapat dimuat.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result;
        if (arrayBuffer) {
          window.mammoth.extractRawText({ arrayBuffer })
            .then((result: { value: string; }) => {
              setAssignmentText(result.value);
            })
            .catch((err: Error) => {
              console.error("Error parsing Word document:", err);
              setError("Gagal memproses file Word. Pastikan file tidak rusak.");
            });
        }
      };
      reader.onerror = () => {
        setError("Gagal membaca file.");
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAssignmentText(text);
      };
      reader.onerror = () => {
        setError("Gagal membaca file.");
      };
      reader.readAsText(file);
    }
  };


  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isOver: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(isOver);
  }

  const renderFormattedWordResult = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
        if (line.trim() === '') {
            return <br key={index} />;
        }
        // Basic check for headings like **1. Title**
        if (line.match(/^\s*\*\*.+\*\*\s*$/)) {
             return <h3 key={index} className="text-lg font-bold my-3 text-indigo-300">{line.replace(/\*\*/g, '')}</h3>;
        }
         // Handle bolding within a line
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
            <p key={index} className="mb-2">
                {parts.map((part, i) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={i}>{part.slice(2, -2)}</strong>
                    ) : (
                        part
                    )
                )}
            </p>
        );
    });
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Joki Tugas AI
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Dapatkan solusi tugas koding Anda dengan bantuan Gemini AI.
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-6">
          
          <div className="space-y-2">
            <label htmlFor="assignment-input" className="font-semibold text-gray-300">
              1. Masukkan Tugas Anda
            </label>
            <div className="relative">
              <textarea
                id="assignment-input"
                value={assignmentText}
                onChange={(e) => setAssignmentText(e.target.value)}
                placeholder="Tulis atau tempel deskripsi tugas Anda di sini..."
                className="w-full h-48 p-4 bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none"
              />
              <label 
                htmlFor="file-upload"
                className={`absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer rounded-lg transition-colors duration-300 ${isDragOver ? 'bg-indigo-500/20 border-indigo-400' : 'bg-transparent border-gray-600'} ${assignmentText ? 'opacity-0 hover:opacity-100 bg-gray-900/80' : ''}`}
                onDragOver={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onDrop={(e) => {
                  handleDragEvents(e, false);
                  const file = e.dataTransfer.files?.[0];
                  if(file) {
                    const syntheticEvent = { target: { files: e.dataTransfer.files } } as unknown as ChangeEvent<HTMLInputElement>;
                    handleFileChange(syntheticEvent);
                  }
                }}
              >
                <UploadIcon className="w-8 h-8 mb-2 text-gray-500" />
                <p className="text-gray-400">
                  <span className="font-semibold text-indigo-400">Klik untuk unggah</span> atau seret file
                </p>
                <p className="text-xs text-gray-500">.doc, .docx, .py, .txt, .md</p>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".py,.txt,.md,.doc,.docx" />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="font-semibold text-gray-300">2. Pilih Format Hasil</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setOutputFormat('python')}
                className={`flex items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${outputFormat === 'python' ? 'bg-indigo-600 border-indigo-500 shadow-lg' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
              >
                <PythonIcon className="w-6 h-6 mr-3" />
                <span className="font-semibold">File Python (.py)</span>
              </button>
              <button
                onClick={() => setOutputFormat('word')}
                className={`flex items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${outputFormat === 'word' ? 'bg-indigo-600 border-indigo-500 shadow-lg' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
              >
                <WordIcon className="w-6 h-6 mr-3" />
                <span className="font-semibold">Format Word (.doc)</span>
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !assignmentText}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              {isLoading ? (
                <>
                  <LoadingIcon className="w-6 h-6 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-6 h-6" />
                  <span>Kerjakan Tugas</span>
                </>
              )}
            </button>
          </div>

          {error && <div className="p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg">{error}</div>}

          {result && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-300">Hasil Solusi:</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Font:</span>
                    <button onClick={() => setSelectedFont('Arial')} className={`px-3 py-1 text-sm rounded transition-colors ${selectedFont === 'Arial' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Arial</button>
                    <button onClick={() => setSelectedFont('Times New Roman')} className={`px-3 py-1 text-sm rounded transition-colors ${selectedFont === 'Times New Roman' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Times New Roman</button>
                </div>
              </div>

              <div 
                className="relative bg-gray-900 rounded-lg border border-gray-700 p-4 text-sm text-gray-200 overflow-x-auto max-h-96 leading-relaxed"
                style={{ fontFamily: selectedFont === 'Arial' ? 'Arial, sans-serif' : '"Times New Roman", serif' }}
              >
                {resultFormat === 'word' ? (
                    <div>{renderFormattedWordResult(result)}</div>
                ) : (
                    <pre><code className="font-mono">{result}</code></pre>
                )}
                <button 
                  onClick={handleDownload}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors z-10"
                  title="Unduh solusi"
                >
                  <DownloadIcon className="w-5 h-5"/>
                </button>
              </div>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors"
              >
                <DownloadIcon className="w-5 h-5" />
                <span>Unduh Hasil</span>
              </button>
            </div>
          )}
        </main>
        
        <footer className="text-center">
            <p className="text-sm text-gray-500">Ditenagai oleh Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
