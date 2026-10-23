"use client";

import { useState } from "react";
import { useChat } from "ai/react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Loader2, Send } from "lucide-react";

export default function ChatbotPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isIndexed, setIsIndexed] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadMessage("Uploading and indexing PDF...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setIsIndexed(true);
        setMessages([]);
        setUploadMessage("PDF successfully indexed! You can now ask questions.");
      } else {
        const error = await res.json();
        setUploadMessage(`Error: ${error.error}`);
      }
    } catch (error) {
      setUploadMessage("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center py-10 px-4">
      <div className="max-w-4xl w-full flex flex-col h-full bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-500" />
              PDF AI Chatbot
            </h1>
            <p className="text-gray-500 text-sm mt-1">Upload a PDF and ask anything about it.</p>
          </div>
          {isIndexed && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                title="Clear current conversation"
              >
                Clear Chat
              </button>
              <button
                onClick={() => {
                  setIsIndexed(false);
                  setFile(null);
                  setUploadMessage("");
                  setMessages([]);
                }}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
              >
                Upload New PDF
              </button>
            </div>
          )}
        </div>

        {!isIndexed ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div
              {...getRootProps()}
              className={`w-full max-w-md p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors
                ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Drop the PDF here...</p>
              ) : (
                <p className="text-gray-600">
                  <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">PDF files only (max 10MB)</p>
            </div>

            {file && (
              <div className="mt-6 flex flex-col items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-full mb-4">
                  <FileText size={16} className="text-blue-500" />
                  {file.name}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    "Upload & Index PDF"
                  )}
                </button>
              </div>
            )}
            {uploadMessage && (
              <p className={`mt-4 text-sm font-medium ${isIndexed ? "text-green-600" : "text-gray-600"}`}>
                {uploadMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-gray-50 h-[0px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                  <FileText className="h-16 w-16 text-gray-300" />
                  <p>Your document is ready. Ask a question below!</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                        m.role === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                 <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-500 rounded-2xl px-5 py-3 rounded-bl-none shadow-sm flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                  </div>
               </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question about your PDF..."
                  className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
