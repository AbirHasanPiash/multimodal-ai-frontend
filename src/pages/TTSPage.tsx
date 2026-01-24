import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import api from '../api/client';
import { 
  SpeakerWaveIcon, 
  PlayCircleIcon, 
  ArrowPathIcon,
  CloudArrowDownIcon,
  MicrophoneIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import DeleteModal from '../components/DeleteModal';

// Types
interface AudioFile {
  id: string;
  text_prompt: string;
  public_url: string;
  created_at: string;
  voice_name: string;
}

interface Voice {
  id: string;
  name: string;
}

// Available Voices Configuration
const AVAILABLE_VOICES: Voice[] = [
  { id: 'en-US-Neural2-A', name: 'Male (Calm)'},
  { id: 'en-US-Neural2-C', name: 'Female (Professional)'},
  { id: 'en-US-Neural2-D', name: 'Male (Deep)'},
  { id: 'en-US-Neural2-E', name: 'Female (Soft)'},
  { id: 'en-US-Neural2-F', name: 'Female (Energetic)'},
  { id: 'en-US-Neural2-H', name: 'Female (Bright)'},
  { id: 'en-US-Neural2-I', name: 'Male (Assertive)'},
  { id: 'en-US-Neural2-J', name: 'Male (Steady)'},
];

// SWR Fetcher
const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function TTSPage() {
  const { refreshProfile } = useAuth();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[4]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: audioFiles, mutate, isLoading } = useSWR<AudioFile[]>('/media/list', fetcher);

  const handleGenerate = async () => {
    if (!text.trim()) return;

    // Clear previous result & start loading
    setLastGeneratedId(null);
    setIsGenerating(true);

    try {
      // Trigger Generation (returns immediately with task_id)
      await api.post('/media/generate', { 
        text,
        voice_name: selectedVoice.id
      });
      
      refreshProfile();
      
      // Poll for the new file
      const startTime = Date.now();
      const currentLatestId = audioFiles && audioFiles.length > 0 ? audioFiles[0].id : null;
      
      const pollInterval = setInterval(async () => {
        // Force refresh data
        const updatedList = await mutate();
        
        if (!updatedList || updatedList.length === 0) return;

        const newestFile = updatedList[0];

        // Check if a new file has appeared (ID is different from what we had before)
        if (newestFile.id !== currentLatestId) {
            clearInterval(pollInterval);
            setLastGeneratedId(newestFile.id);
            setText('');
            setIsGenerating(false); // Stop loading animation only now
        }

        // Timeout after 30 seconds to prevent infinite loading
        if (Date.now() - startTime > 30000) {
            clearInterval(pollInterval);
            setIsGenerating(false);
            alert("Generation took too long. Please check history.");
        }
      }, 2000); // Check every 2 seconds

    } catch (err) {
      console.error('TTS Failed', err);
      alert('Failed to generate audio. Please try again.');
      setIsGenerating(false);
    }
  };

  // DELETE HANDLERS
  const promptDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    
    // OPTIMISTIC UPDATE
    const previousData = audioFiles;
    mutate(
      (currentData) => currentData?.filter((audio) => audio.id !== itemToDelete), 
      false 
    );

    try {
        await api.delete(`/media/audio/${itemToDelete}`);
        // Success
        mutate(); 
        setDeleteModalOpen(false);
        setItemToDelete(null);
    } catch (error) {
        console.error("Failed to delete audio", error);
        alert("Failed to delete audio.");
        // Revert optimistic update
        mutate(previousData, false);
    } finally {
        setIsDeleting(false);
    }
  };

  // Get last generated audio to show below generator
  const lastGeneratedAudio = lastGeneratedId && audioFiles 
    ? audioFiles.find(f => f.id === lastGeneratedId) 
    : null;

  // Filter out the last generated from history if it exists
  const historyAudioFiles = audioFiles?.filter(f => f.id !== lastGeneratedId) || [];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0b0f] via-[#0d0e14] to-[#0a0b0f] relative overflow-hidden">
      
      {/* Delete Confirmation Modal */}
      <DeleteModal 
        isOpen={deleteModalOpen}
        onClose={() => { if(!isDeleting) setDeleteModalOpen(false); }}
        onConfirm={confirmDelete}
        title="Delete Audio"
        message="Are you sure you want to delete this audio file? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 animate-pulse"></div>
                <SpeakerWaveIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 relative z-10" />
              </div>
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white">
                Voice Studio
              </h1>
            </div>
            <p className="text-gray-400 text-sm sm:text-base ml-0 sm:ml-16">
              Transform text into lifelike speech with neural AI voices
            </p>
          </div>

          {/* Generator Section */}
          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            <div className="lg:col-span-2 space-y-6">
              {/* Text Input Card */}
              <div className="relative z-30"> 
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 shadow-xl transition-all">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <SparklesIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Input Text</span>
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Enter your text here to convert into natural-sounding speech..."
                      className="w-full h-32 sm:h-40 bg-slate-950/30 text-gray-100 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-600 text-base sm:text-lg border border-slate-800/50 transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                      maxLength={4096}
                    />
                  </div>
                  
                  {/* Toolbar */}
                  <div className="px-4 sm:px-6 py-4 border-t border-slate-800/50 bg-slate-950/20 rounded-b-2xl">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                      {/* Voice Selector */}
                      <div className="flex-1 max-w-full sm:max-w-xs z-50">
                        <VoiceSelector selected={selectedVoice} onChange={setSelectedVoice} voices={AVAILABLE_VOICES} />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-xs text-gray-500 font-mono">
                          {text.length} / 4096
                        </span>
                        
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !text.trim()}
                          className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25 ${
                            isGenerating || !text.trim()
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 active:scale-95'
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <ArrowPathIcon className="w-5 h-5 animate-spin" />
                              <span className="hidden sm:inline">Generating...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <PlayCircleIcon className="w-5 h-5" />
                              Generate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Generated Audio */}
              {lastGeneratedAudio && !isGenerating && (
                <div className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Just Generated</span>
                  </div>
                  <AudioCard file={lastGeneratedAudio} isHighlighted onDelete={promptDelete} />
                </div>
              )}
            </div>

            {/* Feature Cards */}
            <div className="space-y-4 relative z-0">
              <div className="bg-blue-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-blue-800/20 shadow-lg hover:border-blue-500/30 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <MicrophoneIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold mb-1">Studio Quality</h4>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Powered by Google's Neural2 engine for human-like intonation and emotion.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-purple-800/20 shadow-lg hover:border-purple-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                    <CloudArrowDownIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-semibold mb-1">Instant Download</h4>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      High-quality MP3 files stored securely and ready for immediate use.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="relative z-0 mb-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-800/50 pb-4">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Recent Generations</h2>
            </div>

            {/* Loading Skeletons */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && audioFiles?.length === 0 && (
              <div className="text-center py-16 sm:py-24 bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-dashed border-slate-800/50">
                <SpeakerWaveIcon className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500 text-sm sm:text-base">No audio generated yet. Start creating!</p>
              </div>
            )}

            {/* Audio Files Grid */}
            {!isLoading && historyAudioFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {historyAudioFiles.map((file) => (
                  <AudioCard key={file.id} file={file} onDelete={promptDelete} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Audio Card Component
function AudioCard({ 
    file, 
    isHighlighted = false,
    onDelete
}: { 
    file: AudioFile; 
    isHighlighted?: boolean;
    onDelete: (id: string) => void;
}) {
  const voiceName = AVAILABLE_VOICES.find(v => v.id === file.voice_name)?.name || 'Standard Voice';
  const [isDownloading, setIsDownloading] = useState(false);

  // Direct Download Handler
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
        const response = await fetch(file.public_url, {
             mode: 'cors', 
             cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `generated-audio-${file.created_at.split('T')[0]}.mp3`; 
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Direct download failed", err);
        alert("Unable to download directly due to browser security restrictions. Opening in new tab instead.");
        window.open(file.public_url, '_blank');
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className={`group bg-slate-900/50 backdrop-blur-sm border ${isHighlighted ? 'border-green-500/50 shadow-green-900/20' : 'border-slate-800/50 hover:border-slate-700'} p-5 sm:p-6 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 relative`}>
      
      {/* Delete Button (Top Right) */}
      <button 
        onClick={() => onDelete(file.id)}
        className="absolute top-4 right-4 p-1.5 bg-slate-800/60 hover:bg-red-500/80 text-gray-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        title="Delete Audio"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      <div className="flex justify-between items-start mb-4 pr-8">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full ${isHighlighted ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'} flex items-center justify-center shadow-md`}>
            <SpeakerWaveIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-300 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
            {voiceName}
          </span>
        </div>
        <span className="text-[10px] text-gray-600 font-mono bg-slate-800/40 px-2 py-1 rounded">
          {new Date(file.created_at).toLocaleDateString()}
        </span>
      </div>
      
      <p className="text-gray-300 text-sm line-clamp-2 mb-4 min-h-[2.5rem] italic leading-relaxed">
        "{file.text_prompt}"
      </p>

      <div className="bg-black/40 rounded-xl p-3 mb-4 border border-slate-800/40 shadow-inner group-hover:border-slate-700/50 transition-colors">
        <audio 
          controls 
          src={file.public_url} 
          className="w-full opacity-90 hover:opacity-100 transition-opacity"
          style={{ height: '32px' }}
        />
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-slate-800/30">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs px-3 py-2 hover:bg-slate-800/50 rounded-lg font-medium disabled:opacity-50"
        >
          {isDownloading ? (
             <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
             <CloudArrowDownIcon className="w-4 h-4" />
          )}
          {isDownloading ? 'Downloading...' : 'Download MP3'}
        </button>
      </div>
    </div>
  );
}

// Skeleton Loader Component
function SkeletonCard() {
  return (
    <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800/50 p-5 sm:p-6 rounded-2xl animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-slate-800/50"></div>
          <div className="w-24 h-6 bg-slate-800/50 rounded-full"></div>
        </div>
        <div className="w-16 h-5 bg-slate-800/50 rounded"></div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-800/50 rounded w-full"></div>
        <div className="h-4 bg-slate-800/50 rounded w-3/4"></div>
      </div>

      <div className="bg-black/40 rounded-xl p-3 mb-4 border border-slate-800/40">
        <div className="h-8 bg-slate-800/50 rounded"></div>
      </div>

      <div className="flex justify-end pt-3 border-t border-slate-800/30">
        <div className="w-28 h-8 bg-slate-800/50 rounded-lg"></div>
      </div>
    </div>
  );
}

// Voice Selector Component
function VoiceSelector({ selected, onChange, voices }: { selected: Voice; onChange: (v: Voice) => void; voices: Voice[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full cursor-pointer rounded-xl bg-slate-950/50 py-2.5 pl-4 pr-10 text-left border border-slate-700/50 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm backdrop-blur-sm flex justify-between items-center"
      >
        <span className="block truncate text-gray-200">
          <span className="text-gray-500 mr-2">Voice:</span>
          <span className="font-medium">{selected.name}</span>
        </span>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute mt-2 w-full overflow-auto rounded-xl bg-[#0f1117] backdrop-blur-xl py-1 text-sm shadow-2xl border border-slate-700 z-[60] max-h-60 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] animate-in fade-in zoom-in-95 duration-200"
        >
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => {
                onChange(voice);
                setIsOpen(false);
              }}
              className={`w-full text-left relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors ${
                selected.id === voice.id ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-800/70'
              }`}
            >
              <span className={`block truncate ${selected.id === voice.id ? 'font-semibold text-white' : 'font-normal'}`}>
                <span className="text-gray-500 mr-2">{voice.name}</span>
              </span>
              {selected.id === voice.id && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-400">
                  <CheckIcon className="h-5 w-5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}