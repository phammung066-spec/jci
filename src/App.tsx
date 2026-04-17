/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Settings2, 
  Image as ImageIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- Types ---

type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface LogoOption {
  id: string;
  name: string;
  url: string;
  selected: boolean;
  isSystem?: boolean;
  category?: 'National' | 'Chapter' | 'Custom';
}

interface ProcessedImage {
  id: string;
  originalName: string;
  dataUrl: string;
}

// --- Constants ---

const POSITIONS: { label: string; value: Position }[] = [
  { label: 'Trên trái', value: 'top-left' },
  { label: 'Trên giữa', value: 'top-center' },
  { label: 'Trên phải', value: 'top-right' },
  { label: 'Dưới trái', value: 'bottom-left' },
  { label: 'Dưới giữa', value: 'bottom-center' },
  { label: 'Dưới phải', value: 'bottom-right' },
];

// Default logos
const JCI_VN_LOGO_URL = 'https://images.weserv.nl/?url=https://jci.vn/wp-content/uploads/2021/05/Logo-JCI-Vietnam-01.png';

const CHAPTERS = [
  'Thăng Long',
  'Hà Nội',
  'Hải Phòng',
  'Grace'
];

const INITIAL_LOGOS: LogoOption[] = [
  { id: 'jci-vn', name: 'JCI Việt Nam', url: JCI_VN_LOGO_URL, selected: true, isSystem: true, category: 'National' },
  ...CHAPTERS.map(name => ({
    id: `jci-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name: `JCI ${name}`,
    url: '', // Users will upload or we can provide a generic one
    selected: name === 'Thang Long',
    category: 'Chapter' as const
  }))
];

const LOGO_TEMPLATES = [
  { id: 't1', name: 'Logo Chuẩn', url: 'https://i.ibb.co/3sS1F9j/aqua-original.png' },
  { id: 't2', name: 'Logo Xanh', url: 'https://via.placeholder.com/150/0096D6/FFFFFF?text=JCI+Blue' },
  { id: 't3', name: 'Logo Trắng', url: 'https://via.placeholder.com/150/FFFFFF/000000?text=JCI+White' },
];

const CHAPTER_TEMPLATES: Record<string, { id: string, name: string, url: string }[]> = {
  'jci-vn': [
    { id: 'vn-std', name: 'Logo chuẩn', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1T5eysDJVsFRRlpyGLJ_OeihNyIzk5YZT' },
    { id: 'vn-black', name: 'Logo đen', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1KrmtN_25rwbT9c35YQkpHoRMY7k00MK0' },
    { id: 'vn-white', name: 'Logo trắng', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=11eg0LIAMkYOkq56_ggbNXyXXj772Q12l' },
  ],
  'jci-thăng-long': [
    { id: 'tl-std', name: 'Logo chuẩn', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=15uWpus3rL1BwdPriSjLFFlnzHGPjqqg2' },
    { id: 'tl-black', name: 'Logo đen', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1_Vi8OLUeSZCquj_QLza8074VZee5CSN-' },
    { id: 'tl-white', name: 'Logo trắng', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1DrRJmRemCWJiupVT8AQyTZ7WxMJSM2oO' },
  ],
  'jci-hà-nội': [
    { id: 'hn-std', name: 'Logo chuẩn', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1uTWc0zlZx_KEScvouDyBir_Dn6mLooDD' },
    { id: 'hn-black', name: 'Logo đen', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1d8X4RRW1JLn7SgR0AiuvjznlnpQUjJaC' },
    { id: 'hn-white', name: 'Logo trắng', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1aMDQA_yKpMzvwyrxlNE3tLGRZ6VlCG0b' },
  ],
  'jci-hải-phòng': [
    { id: 'hp-std', name: 'Logo chuẩn', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1xLbSgAn0ZjnOkNsZeorD4fEYCaDqjDG5' },
    { id: 'hp-black', name: 'Logo đen', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1W1Fwe8bzphTNOwXVlD5tQoUxmx2I6gTT' },
    { id: 'hp-white', name: 'Logo trắng', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1rSIMgLXU90mH8WfFCj75h6-cAxt4ykhU' },
  ],
  'jci-grace': [
    { id: 'grace-std', name: 'Logo chuẩn', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1PFOUXcvxxZ7HXOPuEKUqsj7PJ_-5K1GK' },
    { id: 'grace-black', name: 'Logo đen', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1W_iTHUoJ8NUXZ5DzEOOMKX3d8QItSiqR' },
    { id: 'grace-white', name: 'Logo trắng', url: 'https://images.weserv.nl/?url=https://drive.google.com/uc?id=1vYU8trkWHp3bDT35blDZtWMBpy_NZB4A' },
  ]
};

export default function App() {
  const [originalImages, setOriginalImages] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [logos, setLogos] = useState<LogoOption[]>(INITIAL_LOGOS);
  const [logoSearch, setLogoSearch] = useState('');
  const [logoSize, setLogoSize] = useState(15); // Percentage of image width
  const [logoPadding, setLogoPadding] = useState(5); // Percentage of image width
  const [position, setPosition] = useState<Position>('bottom-right');
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>('jci-vn');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [exportQuality, setExportQuality] = useState<'original' | '4k' | '8k' | '16k'>('original');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file as File,
      preview: URL.createObjectURL(file as File)
    }));
    setOriginalImages(prev => [...prev, ...newImages]);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setLogos(prev => prev.map(l => l.id === id ? { ...l, url } : l));
  };

  const toggleLogo = (id: string) => {
    setLogos(prev => prev.map(l => l.id === id ? { ...l, selected: !l.selected } : l));
  };

  const removeImage = (id: string) => {
    setOriginalImages(prev => prev.filter(img => img.id !== id));
    setProcessedImages(prev => prev.filter(img => img.id !== id));
  };

  const addCustomLogo = () => {
    if (!newLogoName) return;
    let finalUrl = newLogoUrl;
    
    // Try to convert Google Drive link to direct link
    if (newLogoUrl.includes('drive.google.com')) {
      const match = newLogoUrl.match(/\/d\/(.+?)\//) || newLogoUrl.match(/id=(.+?)(&|$)/);
      if (match && match[1]) {
        finalUrl = `https://images.weserv.nl/?url=https://drive.google.com/uc?id=${match[1]}`;
      }
    } else if (newLogoUrl && !newLogoUrl.startsWith('blob:')) {
      finalUrl = `https://images.weserv.nl/?url=${newLogoUrl}`;
    }

    const newLogo: LogoOption = {
      id: Math.random().toString(36).substr(2, 9),
      name: newLogoName,
      url: finalUrl,
      selected: true,
      category: 'Custom'
    };
    setLogos(prev => [newLogo, ...prev]);
    setNewLogoName('');
    setNewLogoUrl('');
    setShowAddCustom(false);
  };

  // --- Processing Logic ---

  const processImages = useCallback(async () => {
    if (originalImages.length === 0) return;
    setIsProcessing(true);
    const results: ProcessedImage[] = [];

    for (const img of originalImages) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const mainImg = await loadImage(img.preview);
      
      // Determine target resolution
      let targetWidth = mainImg.width;
      let targetHeight = mainImg.height;

      if (exportQuality === '4k') {
        const ratio = 3840 / mainImg.width;
        targetWidth = 3840;
        targetHeight = mainImg.height * ratio;
      } else if (exportQuality === '8k') {
        const ratio = 7680 / mainImg.width;
        targetWidth = 7680;
        targetHeight = mainImg.height * ratio;
      } else if (exportQuality === '16k') {
        const ratio = 15360 / mainImg.width;
        targetWidth = 15360;
        targetHeight = mainImg.height * ratio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Use high quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(mainImg, 0, 0, targetWidth, targetHeight);

      const selectedLogos = logos.filter(l => l.selected && l.url);
      
      if (selectedLogos.length > 0) {
        try {
          // Add high quality flags to weserv URLs if present
          const processedLogos = selectedLogos.map(l => {
            if (l.url.includes('images.weserv.nl')) {
              return { ...l, url: `${l.url}&n=-1&q=100` };
            }
            return l;
          });

          const loadedLogos = await Promise.all(processedLogos.map(l => loadImage(l.url)));
          const allLogoImgs = loadedLogos;
          
          // Calculate total width of all logos combined
          const spacing = canvas.width * 0.02; // 2% spacing between logos
          const targetLogoHeight = (canvas.width * (logoSize / 100));
          
          let totalLogosWidth = 0;
          const scaledLogos = allLogoImgs.map(lImg => {
            const ratio = targetLogoHeight / lImg.height;
            const w = lImg.width * ratio;
            totalLogosWidth += w;
            return { img: lImg, w, h: targetLogoHeight };
          });
          totalLogosWidth += (scaledLogos.length - 1) * spacing;

          const padding = canvas.width * (logoPadding / 100);
          let startX = 0;
          let startY = 0;

          switch (position) {
            case 'top-left':
              startX = padding;
              startY = padding;
              break;
            case 'top-center':
              startX = (canvas.width - totalLogosWidth) / 2;
              startY = padding;
              break;
            case 'top-right':
              startX = canvas.width - totalLogosWidth - padding;
              startY = padding;
              break;
            case 'bottom-left':
              startX = padding;
              startY = canvas.height - targetLogoHeight - padding;
              break;
            case 'bottom-center':
              startX = (canvas.width - totalLogosWidth) / 2;
              startY = canvas.height - targetLogoHeight - padding;
              break;
            case 'bottom-right':
              startX = canvas.width - totalLogosWidth - padding;
              startY = canvas.height - targetLogoHeight - padding;
              break;
          }

          let currentX = startX;
          scaledLogos.forEach(sl => {
            ctx.drawImage(sl.img, currentX, startY, sl.w, sl.h);
            currentX += sl.w + spacing;
          });
        } catch (err) {
          console.error("Error loading logos:", err);
        }
      }

      results.push({
        id: img.id,
        originalName: img.file.name,
        dataUrl: canvas.toDataURL('image/jpeg', 1.0) // Maximum quality
      });
    }

    setProcessedImages(results);
    setIsProcessing(false);
  }, [originalImages, logos, logoSize, logoPadding, position, exportQuality]);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Important for external URLs
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error(`Failed to load image at ${url}`, e);
        reject(e);
      };
      img.src = url;
    });
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    processedImages.forEach(img => {
      const base64Data = img.dataUrl.split(',')[1];
      zip.file(`watermarked_${img.originalName}`, base64Data, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'JCI_Standard_Logo_Images.zip');
  };

  // Auto-process when settings change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (originalImages.length > 0) {
        processImages();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [originalImages, logos, logoSize, logoPadding, position, exportQuality, processImages]);

  // --- UI Components ---

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-80 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
            <img 
              src="https://images.weserv.nl/?url=https://drive.google.com/uc?id=1ODrz-W07qqN070DnSImCIT8nLXdm3Vk2" 
              alt="Logo" 
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-[#00427A] uppercase leading-none">TỰ ĐỘNG CHÈN LOGO JCI TIÊU CHUẨN</h1>
            <p className="text-[10px] text-[#0096D6] font-bold tracking-[0.1em] mt-1">by Phạm Mừng JCI Thăng Long</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={processImages}
            disabled={originalImages.length === 0 || isProcessing}
            className={`px-8 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 text-sm ${
              originalImages.length === 0 || isProcessing 
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
              : 'bg-[#0096D6] text-white hover:bg-[#007BB0] shadow-[0_4px_14px_0_rgba(0,150,214,0.39)] hover:shadow-[0_6px_20px_rgba(0,150,214,0.23)] active:scale-95'
            }`}
          >
            {isProcessing ? 'Đang xử lý...' : 'XUẤT ẢNH NGAY'}
          </button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Column 1: Original Images */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-bold flex items-center gap-2 text-gray-700">
              <ImageIcon size={18} className="text-[#0096D6]" />
              Ảnh gốc ({originalImages.length})
            </h2>
            <label className="cursor-pointer p-2 hover:bg-gray-200 rounded-full transition-colors">
              <Upload size={18} className="text-gray-600" />
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {originalImages.length === 0 ? (
              <label className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors group">
                <Upload size={40} className="text-gray-300 mb-2 group-hover:text-[#0096D6] transition-colors" />
                <p className="text-sm text-gray-400 group-hover:text-gray-600">Nhấn vào đây để tải ảnh lên</p>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            ) : (
              originalImages.map((img) => (
                <div key={img.id} className="group relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Column 2: Logo Settings */}
        <section className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold flex items-center gap-2 text-gray-700">
              <Settings2 size={18} className="text-[#0096D6]" />
              Cấu hình Logo
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Chapter Navigation & Logo Config */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Danh sách Chapter</h3>
                <button 
                  onClick={() => setLogos(prev => prev.map(l => ({ ...l, selected: false })))}
                  className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                >
                  TẮT TẤT CẢ LOGO
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Tìm nhanh Chapter..." 
                  value={logoSearch}
                  onChange={(e) => setLogoSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0096D6] transition-all"
                />
                <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Chapter List (Vertical) */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {logos
                  .filter(l => l.name.toLowerCase().includes(logoSearch.toLowerCase()))
                  .map(logo => {
                    const isActive = activeChapterId === logo.id;
                    return (
                      <div key={logo.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          {/* Checkbox / Toggle Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLogo(logo.id);
                            }}
                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${
                              logo.selected 
                              ? 'bg-[#0096D6] border-[#0096D6] text-white shadow-lg shadow-blue-100' 
                              : 'bg-white border-gray-200 text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            {logo.selected ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-md border-2 border-gray-100" />}
                          </button>

                          <button
                            onClick={() => setActiveChapterId(isActive ? null : logo.id)}
                            className={`flex-1 flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${
                              isActive 
                              ? 'border-[#0096D6] bg-blue-50 shadow-sm' 
                              : logo.selected 
                                ? 'border-blue-100 bg-blue-50/20' 
                                : 'border-gray-50 bg-white hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <span className={`font-bold text-sm block ${isActive ? 'text-[#00427A]' : 'text-gray-700'}`}>
                                  {logo.name}
                                </span>
                                {logo.selected && (
                                  <span className="text-[9px] font-black text-[#0096D6] uppercase tracking-tighter">
                                    Logo {logos.filter(l => l.selected).findIndex(l => l.id === logo.id) + 1} đang bật
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* Quick Select Thumbnails (Always visible) */}
                              <div className="flex items-center gap-2 px-2 py-1 bg-white/60 rounded-xl border border-blue-100 shadow-inner">
                                {(CHAPTER_TEMPLATES[logo.id] || LOGO_TEMPLATES).map((template) => (
                                  <div 
                                    key={template.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLogos(prev => prev.map(l => l.id === logo.id ? { ...l, url: template.url, selected: true } : l));
                                    }}
                                    className={`w-[48px] h-[48px] rounded-lg border-2 transition-all p-1 flex items-center justify-center bg-white cursor-pointer hover:scale-110 shadow-sm ${
                                      logo.url === template.url ? 'border-[#0096D6] ring-2 ring-blue-100' : 'border-gray-100 hover:border-blue-200'
                                    }`}
                                  >
                                    <img src={template.url} alt={template.name} className="max-h-full max-w-full object-contain" />
                                  </div>
                                ))}
                              </div>
                              <ChevronRight size={16} className={`text-gray-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                            </div>
                          </button>
                        </div>

                        {/* Expanded Logo Detail / Link Config */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mx-2 p-5 bg-blue-50/30 rounded-2xl border border-blue-100 space-y-5 shadow-inner mb-4">
                                {/* Logo Templates Grid (Now at the top) */}
                                <div className="space-y-3">
                                  <p className="text-[10px] font-black text-[#0096D6] uppercase tracking-widest">
                                    Chọn nhanh mẫu Logo
                                  </p>
                                  <div className="grid grid-cols-3 gap-3">
                                    {(CHAPTER_TEMPLATES[logo.id] || LOGO_TEMPLATES).map((template) => (
                                      <button
                                        key={template.id}
                                        onClick={() => {
                                          setLogos(prev => prev.map(l => l.id === logo.id ? { ...l, url: template.url, selected: true } : l));
                                        }}
                                        className={`group relative aspect-square bg-white rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center gap-1 hover:shadow-md ${
                                          logo.url === template.url 
                                          ? 'border-[#0096D6] ring-4 ring-blue-100' 
                                          : 'border-white hover:border-blue-200'
                                        }`}
                                      >
                                        <img 
                                          src={template.url} 
                                          alt={template.name} 
                                          className="max-h-[70%] max-w-full object-contain transition-transform group-hover:scale-110" 
                                        />
                                        <span className="text-[8px] font-bold text-gray-400">{template.name}</span>
                                        {logo.url === template.url && (
                                          <div className="absolute -top-1 -right-1 bg-[#0096D6] text-white rounded-full p-0.5 shadow-sm">
                                            <CheckCircle2 size={10} />
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Library Header */}
                                <div className="flex flex-col gap-2 pt-2 border-t border-blue-100">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-[#0096D6] uppercase tracking-widest">
                                      Tùy chỉnh Link Logo
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => toggleLogo(logo.id)}
                                        className={`px-3 py-1 rounded-full text-[9px] font-black transition-all ${
                                          logo.selected 
                                          ? 'bg-[#0096D6] text-white' 
                                          : 'bg-white border border-gray-200 text-gray-400'
                                        }`}
                                      >
                                        {logo.selected ? 'ĐANG BẬT' : 'BẬT LOGO NÀY'}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-xl border border-blue-100">
                                    <span className="text-[9px] text-blue-600 font-bold">💡 Mẹo:</span>
                                    <p className="text-[9px] text-blue-500 leading-tight">
                                      Lấy logo từ Folder Drive 2026 của bạn, dán link vào ô dưới để dùng ngay.
                                    </p>
                                    <a 
                                      href="https://drive.google.com/drive/folders/1kq3HNkOaByCbqi_kMoTv9f19_cDySkWJ" 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="ml-auto px-2 py-1 bg-white text-[8px] font-bold text-[#0096D6] rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                    >
                                      MỞ FOLDER
                                    </a>
                                  </div>
                                </div>

                                {/* Custom Link Input */}
                                <div className="space-y-2 pt-2 border-t border-blue-100">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Hoặc dán link riêng (Drive/Web)</label>
                                    <label className="flex items-center gap-1 text-[9px] font-bold text-[#0096D6] cursor-pointer hover:underline">
                                      <Upload size={10} />
                                      Tải ảnh lên
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, logo.id)} />
                                    </label>
                                  </div>
                                  <input 
                                    type="text" 
                                    placeholder="Dán link logo vào đây..." 
                                    value={logo.url && !LOGO_TEMPLATES.some(t => t.url === logo.url) ? logo.url : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      let finalUrl = val;
                                      if (val.includes('drive.google.com')) {
                                        const match = val.match(/\/d\/(.+?)\//) || val.match(/id=(.+?)(&|$)/);
                                        if (match && match[1]) {
                                          finalUrl = `https://images.weserv.nl/?url=https://drive.google.com/uc?id=${match[1]}`;
                                        }
                                      } else if (val && !val.startsWith('blob:') && !val.includes('weserv.nl')) {
                                        finalUrl = `https://images.weserv.nl/?url=${val}`;
                                      }
                                      setLogos(prev => prev.map(l => l.id === logo.id ? { ...l, url: finalUrl, selected: true } : l));
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-blue-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0096D6] transition-all"
                                  />
                                </div>

                                {logo.category === 'Custom' && (
                                  <button 
                                    onClick={() => setLogos(prev => prev.filter(l => l.id !== logo.id))}
                                    className="w-full py-2 text-red-500 text-[10px] font-bold hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                                  >
                                    XÓA CHAPTER NÀY
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
              </div>

              {/* Add New Chapter Button */}
              <button 
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="mt-4 w-full py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                THÊM CHAPTER MỚI
              </button>

              {/* Add Custom Logo Form (Modal-like) */}
              <AnimatePresence>
                {showAddCustom && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
                  >
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">Thêm Chapter / Logo mới</h3>
                        <button onClick={() => setShowAddCustom(false)} className="p-2 hover:bg-gray-100 rounded-full">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Tên Chapter</label>
                          <input 
                            type="text" 
                            placeholder="VD: JCI South Saigon" 
                            value={newLogoName}
                            onChange={(e) => setNewLogoName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0096D6]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Link Logo (Drive/Web)</label>
                          <input 
                            type="text" 
                            placeholder="Dán link ảnh vào đây..." 
                            value={newLogoUrl}
                            onChange={(e) => setNewLogoUrl(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0096D6]"
                          />
                        </div>
                        <button 
                          onClick={addCustomLogo}
                          className="w-full py-4 bg-[#0096D6] text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-[#007BB0] transition-all"
                        >
                          THÊM VÀO DANH SÁCH
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Size & Padding */}
            <div className="space-y-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div>
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Kích thước</h3>
                  <span className="text-xs font-bold text-[#0096D6]">{logoSize}%</span>
                </div>
                <input 
                  type="range" min="5" max="40" value={logoSize} 
                  onChange={(e) => setLogoSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0096D6]"
                />
                <p className="text-[10px] text-gray-400 mt-2 italic">* Gợi ý: 12-18% cho ảnh ngang, 15-22% cho ảnh dọc</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Khoảng cách lề</h3>
                  <span className="text-xs font-bold text-[#0096D6]">{logoPadding}%</span>
                </div>
                <input 
                  type="range" min="0" max="20" value={logoPadding} 
                  onChange={(e) => setLogoPadding(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0096D6]"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Vị trí</h3>
                <span className="text-[10px] text-gray-400 italic">Gợi ý: Góc dưới bên phải</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map(pos => (
                  <button
                    key={pos.value}
                    onClick={() => setPosition(pos.value)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
                      position === pos.value 
                      ? 'border-[#0096D6] bg-[#0096D6] text-white' 
                      : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Quality */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Chất lượng xuất</h3>
                <span className="text-[10px] text-orange-500 font-bold animate-pulse">
                  {exportQuality === '16k' ? '⚠️ 16K Cực nặng' : exportQuality === '8k' ? '🔥 8K Sắc nét' : ''}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['original', '4k', '8k', '16k'] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setExportQuality(q)}
                    className={`px-2 py-2 text-[10px] font-black rounded-lg border-2 transition-all uppercase ${
                      exportQuality === q 
                      ? 'border-[#0096D6] bg-[#0096D6] text-white shadow-md shadow-blue-100' 
                      : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {q === 'original' ? 'Gốc' : q}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">
                * Mặc định là <b>Gốc</b>. Chọn <b>4K/8K/16K</b> để tự động nâng cấp độ phân giải và làm sắc nét logo. 
                <br/>
                <span className="text-red-400 font-bold">Lưu ý:</span> 16K có thể gây lag trình duyệt nếu máy yếu.
              </p>
            </div>
          </div>
        </section>

        {/* Column 3: Results */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-bold flex items-center gap-2 text-gray-700">
              <CheckCircle2 size={18} className="text-green-500" />
              Kết quả (Chất lượng cao)
            </h2>
            {processedImages.length > 0 && (
              <button 
                onClick={downloadAll}
                className="flex items-center gap-2 text-xs font-bold text-[#0096D6] hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
              >
                <Download size={14} /> Tải tất cả (.zip)
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {processedImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p>Kết quả sẽ hiển thị ở đây sau khi xử lý</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {processedImages.map((img, idx) => (
                  <div key={img.id} className="group relative rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                    <img 
                      src={img.dataUrl} 
                      alt="result" 
                      className="w-full aspect-square object-cover cursor-zoom-in"
                      onClick={() => setSelectedImageIndex(idx)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setSelectedImageIndex(idx)}
                        className="p-2 bg-white text-gray-800 rounded-full hover:scale-110 transition-transform"
                      >
                        <Maximize2 size={18} />
                      </button>
                      <button 
                        onClick={() => saveAs(img.dataUrl, `watermarked_${img.originalName}`)}
                        className="p-2 bg-[#0096D6] text-white rounded-full hover:scale-110 transition-transform"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Lightbox / Preview Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-10"
          >
            <button 
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>

            <div className="relative w-full h-full flex items-center justify-center">
              <button 
                onClick={() => setSelectedImageIndex(prev => prev! > 0 ? prev! - 1 : processedImages.length - 1)}
                className="absolute left-0 p-4 text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft size={48} />
              </button>

              <motion.img 
                key={selectedImageIndex}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={processedImages[selectedImageIndex].dataUrl} 
                className="max-w-full max-h-full object-contain shadow-2xl"
              />

              <button 
                onClick={() => setSelectedImageIndex(prev => prev! < processedImages.length - 1 ? prev! + 1 : 0)}
                className="absolute right-0 p-4 text-white/50 hover:text-white transition-colors"
              >
                <ChevronRight size={48} />
              </button>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <span className="text-white/70 font-mono text-sm">
                {selectedImageIndex + 1} / {processedImages.length}
              </span>
              <button 
                onClick={() => saveAs(processedImages[selectedImageIndex!].dataUrl, `watermarked_${processedImages[selectedImageIndex!].originalName}`)}
                className="bg-white text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <Download size={18} /> Tải ảnh này
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E0;
        }
      `}</style>
    </div>
  );
}
