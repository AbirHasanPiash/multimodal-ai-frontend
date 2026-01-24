import { CpuChipIcon, SparklesIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { useState, useRef, useEffect } from "react";

interface ModelSelectorProps {
  model: string;
  setModel: (value: string) => void;
}

export default function ModelSelector({ model, setModel }: ModelSelectorProps) {
  const [isSmartMode, setIsSmartMode] = useState(model === "auto");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const newSmartMode = !isSmartMode;
    setIsSmartMode(newSmartMode);
    if (newSmartMode) {
      setModel("auto");
      setIsDropdownOpen(false);
    }
  };

  const handleModelSelect = (selectedModel: string) => {
    setModel(selectedModel);
    setIsDropdownOpen(false);
    setIsSmartMode(false);
  };

  const modelGroups = [
    {
      label: "Intelligence",
      models: [
        { value: "gpt-5.2-pro", label: "GPT-5.2 Pro" },
        { value: "claude-4.5-opus", label: "Claude 4.5 Opus" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
      ]
    },
    {
      label: "Standard",
      models: [
        { value: "gpt-5.2", label: "GPT-5.2" },
        { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
        { value: "claude-4.5-sonnet", label: "Claude 4.5 Sonnet" }
      ]
    },
    {
      label: "Speed",
      models: [
        { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
        { value: "gpt-5-mini", label: "GPT-5 Mini" },
        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { value: "claude-4.5-haiku", label: "Claude 4.5 Haiku" }
      ]
    }
  ];

  const getSelectedModelLabel = () => {
    for (const group of modelGroups) {
      const found = group.models.find(m => m.value === model);
      if (found) return found.label;
    }
    return "Select Model";
  };

  return (
    <div 
      ref={dropdownRef}
      className={`
        relative min-w-[180px] bg-[#1a1d26] sm:min-w-[220px] p-2 rounded-xl border transition-all duration-300
        ${isSmartMode 
          ? 'border-blue-500/50 shadow-[0_0_15px_-3px_rgba(59,130,246,0.25)]' 
          : 'border-blue-500/20'
        }
      `}
    >
      {/* Toggle Button Row */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
            isSmartMode ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
              isSmartMode ? 'translate-x-2.9' : 'translate-x-0.2'
            }`}
            style={{ transform: isSmartMode ? 'translateX(21px)' : 'translateX(1px)' }}
          />
        </button>
        
        <div className="flex items-center gap-1.5">
          <SparklesIcon className={`w-3.5 h-3.5 ${isSmartMode ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className={`text-xs font-semibold ${isSmartMode ? 'text-gray-200' : 'text-gray-400'}`}>
            Smart Select
          </span>
        </div>
      </div>

      {/* Selection Row - Fixed Height to prevent shift */}
      <div className="relative">
        {isSmartMode ? (
          // Smart Mode Message
          <div className="flex items-center gap-2 w-full h-9 bg-[#1a1d26] border border-blue-500/30 rounded-lg px-3">
            <SparklesIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-gray-300 leading-none truncate">
              AI will select intelligently
            </p>
          </div>
        ) : (
          // Manual Model Selection Button
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full h-9 bg-[#1a1d26] hover:bg-[#1f2229] text-gray-200 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all px-3 focus:ring-2 focus:ring-blue-500/30 outline-none cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CpuChipIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="truncate text-xs font-semibold">{getSelectedModelLabel()}</span>
            </div>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}

        {/* Dropdown Menu */}
        {isDropdownOpen && !isSmartMode && (
          <div className="absolute z-20 mt-1.5 w-full bg-[#1a1d26] border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
             <div className="absolute inset-0 bg-[#1a1d26]/95 backdrop-blur-xl -z-10" />
            <div className="max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {modelGroups.map((group, groupIdx) => (
                <div key={group.label}>
                  {groupIdx > 0 && <div className="h-px bg-gray-700/30 mx-2" />}
                  <div className="px-2 py-2">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
                      {group.label}
                    </div>
                    <div className="space-y-0.5">
                      {group.models.map((modelOption) => (
                        <button
                          key={modelOption.value}
                          onClick={() => handleModelSelect(modelOption.value)}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                            model === modelOption.value
                              ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 font-medium'
                              : 'text-gray-300 hover:bg-[#252833] hover:text-white border border-transparent'
                          }`}
                        >
                          {modelOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .max-h-\\[220px\\]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}