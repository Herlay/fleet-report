import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Link, Globe } from 'lucide-react';
import { uploadFile, uploadGoogleSheet } from '../services/api'; // Ensure you add uploadGoogleSheet to your api.js

const UploadPage = () => {
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' | 'link'
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls')) {
        setFile(selected);
        setStatus('idle');
        setMessage('');
        setStats(null);
      } else {
        setMessage('Please select a valid Excel file (.xlsx)');
        setStatus('error');
      }
    }
  };

  const handleProcessData = async () => {
    setStatus('uploading');
    setMessage('');
    try {
      let result;
      if (uploadMethod === 'file') {
        if (!file) return;
        result = await uploadFile(file);
      } else {
        if (!sheetUrl) {
          throw new Error("Please enter a Google Sheets URL");
        }
        result = await uploadGoogleSheet(sheetUrl);
      }

      setStatus('success');
      setMessage('Data Upload Successful!');
      setStats(result.data);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err.response?.data?.error || err.message || "Process failed. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <UploadCloud size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Data</h2>
          <p className="text-slate-500 mt-2">
            Choose a method to upload your file.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
          <button
            onClick={() => { setUploadMethod('file'); setStatus('idle'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${uploadMethod === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileSpreadsheet size={16} /> Local File
          </button>
          <button
            onClick={() => { setUploadMethod('link'); setStatus('idle'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${uploadMethod === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Globe size={16} /> Google Sheets Link
          </button>
        </div>

        {/* Input Areas */}
        {uploadMethod === 'file' ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {!file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="mx-auto text-slate-400" size={40} />
                <p className="text-sm text-slate-600 font-medium">Click to select or drag file here</p>
                <p className="text-xs text-slate-400">Supported formats: .xlsx, .xls</p>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <FileSpreadsheet className="text-blue-600" size={24} />
                <span className="font-medium text-slate-700">{file.name}</span>
                <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Link size={20} className="text-slate-400" />
              <input
                type="text"
                placeholder="Paste public Google Sheets URL here..."
                className="bg-transparent w-full outline-none text-sm text-slate-700"
                value={sheetUrl}
                onChange={(e) => { setSheetUrl(e.target.value); setStatus('idle'); }}
              />
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-1">
              Note: Ensure the sheet is shared as "Anyone with the link can view"
            </p>
          </div>
        )}

        {/* Status Messages */}
        {status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
            <AlertCircle size={18} className="mr-2" />
            {message}
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
            <div className="flex items-center font-medium mb-1">
              <CheckCircle size={18} className="mr-2" />
              {message}
            </div>
          </div>
        )}

    
        <button
          onClick={handleProcessData}
          disabled={status === 'uploading' || (uploadMethod === 'file' && !file) || (uploadMethod === 'link' && !sheetUrl)}
          className={`w-full mt-6 py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center transition-all ${status === 'uploading' || (uploadMethod === 'file' && !file) || (uploadMethod === 'link' && !sheetUrl)
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
            }`}
        >
          {status === 'uploading' ? (
            <>
              <Loader2 size={20} className="animate-spin mr-2" />
              Processing Data...
            </>
          ) : (
            uploadMethod === 'file' ? 'Upload Data' : 'Upload Google Sheet'
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadPage;