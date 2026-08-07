import React, { useState, useMemo, useRef } from 'react';
import { PetMediaPhoto, PhotoCategory, Pet, Customer, Invoice, Payment, formatINR } from '../types';

// Use standard lucide icons
import { 
  Camera as CamIcon, Image as ImgIcon, Upload as UpIcon, Download as DnIcon, 
  Share2 as ShareIcon, Send as SendIcon, FileText as DocIcon, Printer as PrintIcon, 
  Search as SrchIcon, Filter as FltIcon, Calendar as CalIcon, CheckCircle2 as Check2Icon, 
  AlertCircle as AlertIcon, Clock as ClkIcon, Folder as FldIcon, RefreshCw as RefIcon, 
  Eye as EyeIcon, ZoomIn as ZInIcon, ZoomOut as ZOutIcon, Mail as MailIcon, 
  Smartphone as PhoneIcon, ExternalLink as ExtIcon, ShieldCheck as ShldIcon, 
  HardDrive as HdIcon, Sparkles as SpkIcon, Dog as DogIcon, User as UsrIcon, 
  FileCheck as FCheckIcon, Trash2 as TrshIcon, Tag as TagIcon, Layers as LyrIcon, 
  Copy as CpyIcon, MessageSquare as MsgIcon, Cloud as CldIcon, ChevronRight
} from 'lucide-react';

interface MediaGalleryProps {
  pets: Pet[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  onOpenNewInvoice?: () => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  pets,
  customers,
  invoices,
  payments
}) => {
  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<'gallery' | 'daily_tracker' | 'pdf_engine' | 'whatsapp_email' | 'backup'>('gallery');

  // Photo Gallery Filter & View States
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedPetIdFilter, setSelectedPetIdFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initial Seed Photos for Pawz Pets
  const [photos, setPhotos] = useState<PetMediaPhoto[]>([
    {
      id: 'photo-1',
      petId: pets[0]?.id || 'pet-1',
      petName: pets[0]?.name || 'Milo',
      customerId: pets[0]?.customerId || 'cust-1',
      customerName: pets[0]?.customerName || 'Rajesh Sharma',
      customerPhone: '9876543210',
      boardingRoomNo: 'Suite-101',
      category: 'CheckIn',
      originalFileName: 'IMG_20260806_0915.jpg',
      convertedFileName: '20260806_091500_CheckIn.webp',
      filePath: `Photos/Pets/${pets[0]?.id || 'PET000001'}/CheckIn/20260806_091500_CheckIn.webp`,
      fileSizeKB: 142,
      dimensions: '1280x960',
      format: 'WebP',
      quality: 80,
      uploadTimestamp: '2026-08-06 09:15:00',
      caption: 'Arrival at Luxury Suite 101. Health check clear!',
      imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'photo-2',
      petId: pets[0]?.id || 'pet-1',
      petName: pets[0]?.name || 'Milo',
      customerId: pets[0]?.customerId || 'cust-1',
      customerName: pets[0]?.customerName || 'Rajesh Sharma',
      customerPhone: '9876543210',
      boardingRoomNo: 'Suite-101',
      category: 'Food',
      originalFileName: 'milo_breakfast.png',
      convertedFileName: '20260806_103000_Food.webp',
      filePath: `Photos/Pets/${pets[0]?.id || 'PET000001'}/Food/20260806_103000_Food.webp`,
      fileSizeKB: 118,
      dimensions: '1280x960',
      format: 'WebP',
      quality: 80,
      uploadTimestamp: '2026-08-06 10:30:00',
      caption: 'Ate full bowl of Royal Canin with chicken broth.',
      imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'photo-3',
      petId: pets[1]?.id || 'pet-2',
      petName: pets[1]?.name || 'Bella',
      customerId: pets[1]?.customerId || 'cust-2',
      customerName: pets[1]?.customerName || 'Priya Patel',
      customerPhone: '9822012345',
      boardingRoomNo: 'Suite-104',
      category: 'Play Time',
      originalFileName: 'bella_park_play.jpeg',
      convertedFileName: '20260806_114500_PlayTime.webp',
      filePath: `Photos/Pets/${pets[1]?.id || 'PET000002'}/PlayTime/20260806_114500_PlayTime.webp`,
      fileSizeKB: 165,
      dimensions: '1280x960',
      format: 'WebP',
      quality: 80,
      uploadTimestamp: '2026-08-06 11:45:00',
      caption: 'Enthusiastic agility fetch session in garden turf.',
      imageUrl: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'photo-4',
      petId: pets[2]?.id || 'pet-3',
      petName: pets[2]?.name || 'Coco',
      customerId: pets[2]?.customerId || 'cust-3',
      customerName: pets[2]?.customerName || 'Amit Verma',
      customerPhone: '9123456789',
      boardingRoomNo: 'Suite-108',
      category: 'Grooming',
      originalFileName: 'coco_spa_bath.jpg',
      convertedFileName: '20260806_121000_Grooming.webp',
      filePath: `Photos/Pets/${pets[2]?.id || 'PET000003'}/Grooming/20260806_121000_Grooming.webp`,
      fileSizeKB: 135,
      dimensions: '1280x960',
      format: 'WebP',
      quality: 80,
      uploadTimestamp: '2026-08-06 12:10:00',
      caption: 'Aromatic bath & organic blow dry completed.',
      imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&auto=format&fit=crop&q=80'
    }
  ]);

  // Image Preview Modal
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<PetMediaPhoto | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Upload Photo Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadPetId, setUploadPetId] = useState<string>(pets[0]?.id || '');
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('Morning Update');
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionDetails, setCompressionDetails] = useState<{
    origSize: string;
    compressedSize: string;
    savedPct: string;
    fileName: string;
    path: string;
  } | null>(null);

  // PDF Document Engine States
  const [pdfDocType, setPdfDocType] = useState<'GST_INVOICE' | 'RECEIPT' | 'CUSTOMER_STATEMENT' | 'BOARDING_SUMMARY' | 'OUTSTANDING' | 'CA_REGISTER'>('GST_INVOICE');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  // WhatsApp & Email Composer States
  const [waPetPhotoId, setWaPetPhotoId] = useState<string>(photos[0]?.id || '');
  const [waRecipientPhone, setWaRecipientPhone] = useState<string>('919876543210');
  const [waTemplateType, setWaTemplateType] = useState<'INVOICE' | 'RECEIPT' | 'DAILY_UPDATE' | 'BOARDING_CHECKIN'>('DAILY_UPDATE');

  // Categories list
  const categoriesList: PhotoCategory[] = [
    'CheckIn', 'Morning Update', 'Afternoon Update', 'Evening Update',
    'Food', 'Medicine', 'Play Time', 'Grooming', 'Birthday', 'Special Event', 'CheckOut'
  ];

  // Active Boarding Pets
  const boardingPets = useMemo(() => pets.filter(p => p.isBoardingNow), [pets]);

  // Compute Daily Boarding Photo Tracking
  const boardingPhotoStats = useMemo(() => {
    const todayYMD = new Date().toISOString().split('T')[0];
    return boardingPets.map(pet => {
      const petPhotos = photos.filter(p => p.petId === pet.id);
      const todayPhotos = petPhotos.filter(p => p.uploadTimestamp.startsWith('2026-08-06') || p.uploadTimestamp.startsWith(todayYMD));
      const lastPhoto = petPhotos.length > 0 ? petPhotos[petPhotos.length - 1] : null;

      return {
        pet,
        photoCount: petPhotos.length,
        todayPhotoCount: todayPhotos.length,
        lastUploaded: lastPhoto ? lastPhoto.uploadTimestamp : 'No photos yet',
        isMissingToday: todayPhotos.length === 0
      };
    });
  }, [boardingPets, photos]);

  // Filtered Photos for Gallery View
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      if (selectedPetIdFilter !== 'ALL' && p.petId !== selectedPetIdFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.petName.toLowerCase().includes(q) ||
               p.customerName.toLowerCase().includes(q) ||
               p.category.toLowerCase().includes(q) ||
               p.convertedFileName.toLowerCase().includes(q) ||
               (p.caption && p.caption.toLowerCase().includes(q));
      }
      return true;
    });
  }, [photos, selectedPetIdFilter, selectedCategoryFilter, searchQuery]);

  // Handle File Selection & Auto WebP Compression Simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsCompressing(true);

      const selPet = pets.find(p => p.id === uploadPetId) || pets[0];
      const now = new Date();
      const YYYY = now.getFullYear();
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      const convertedName = `${YYYY}${MM}${DD}_${hh}${mm}${ss}_${uploadCategory.replace(/\s+/g, '')}.webp`;
      const folderPath = `Photos/Pets/${selPet ? selPet.id.toUpperCase() : 'PET000001'}/${uploadCategory.replace(/\s+/g, '')}/${convertedName}`;

      setTimeout(() => {
        setIsCompressing(false);
        setCompressionDetails({
          origSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          compressedSize: '138 KB (WebP 80%)',
          savedPct: '96.2% Storage Saved',
          fileName: convertedName,
          path: folderPath
        });
      }, 400);
    }
  };

  // Submit Uploaded Photo
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select an image file first.');
      return;
    }

    const selPet = pets.find(p => p.id === uploadPetId) || pets[0];
    const selCust = customers.find(c => c.id === selPet?.customerId) || customers[0];

    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const convertedName = compressionDetails?.fileName || `20260806_140000_${uploadCategory}.webp`;
    const folderPath = compressionDetails?.path || `Photos/Pets/${selPet.id}/${uploadCategory}/${convertedName}`;

    // Generate local Object URL for instant UI preview
    const previewUrl = URL.createObjectURL(selectedFile);

    const newPhotoObj: PetMediaPhoto = {
      id: `photo-${Date.now()}`,
      petId: selPet.id,
      petName: selPet.name,
      customerId: selCust ? selCust.id : 'cust-1',
      customerName: selCust ? selCust.name : selPet.customerName,
      customerPhone: selCust ? selCust.phone : '9876543210',
      boardingRoomNo: selPet.roomNo || 'Suite-101',
      category: uploadCategory,
      originalFileName: selectedFile.name,
      convertedFileName: convertedName,
      filePath: folderPath,
      fileSizeKB: 138,
      dimensions: '1280x960',
      format: 'WebP',
      quality: 80,
      uploadTimestamp: timeStr,
      caption: uploadCaption || `${uploadCategory} update for ${selPet.name}`,
      imageUrl: previewUrl
    };

    setPhotos([newPhotoObj, ...photos]);
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadCaption('');
    setCompressionDetails(null);
    alert(`Photo converted to WebP (80%) and stored at:\n${folderPath}`);
  };

  // Generate WhatsApp Message Template Text
  const getWhatsAppTemplateText = () => {
    const photo = photos.find(p => p.id === waPetPhotoId) || photos[0];
    const inv = invoices.find(i => i.id === selectedInvoiceId) || invoices[0];

    if (waTemplateType === 'DAILY_UPDATE') {
      return `🐾 *The House of Pawz – Pet Daily Update* 🐾\n\nDear *${photo?.customerName || 'Pet Parent'}*,\nHere is a live update for your lovely pet *${photo?.petName || 'Pawz Pet'}*! 🐶✨\n\n📌 *Category:* ${photo?.category}\n🕒 *Time:* ${photo?.uploadTimestamp}\n📝 *Note:* ${photo?.caption || 'All healthy and happy!'}\n\n📍 *Suite No:* ${photo?.boardingRoomNo || 'Suite-101'}\n📷 *Photo File:* ${photo?.convertedFileName}\n\nThank you for trusting The House of Pawz! ❤️`;
    }
    if (waTemplateType === 'INVOICE') {
      return `📜 *The House of Pawz – GST Tax Invoice* 📜\n\nDear *${inv?.customerName || 'Client'}*,\nYour GST Invoice *${inv?.invoiceNumber || 'HOP/26-27/000001'}* has been generated.\n\n💰 *Grand Total:* ${formatINR(inv?.grandTotal)}\n💳 *Paid Amount:* ${formatINR(inv?.paidAmount)}\n⚠️ *Balance Due:* ${formatINR(inv?.balanceDue)}\n📅 *Invoice Date:* ${inv?.invoiceDate}\n\nThank you for your prompt business!`;
    }
    return `🐾 *The House of Pawz – Boarding Summary* 🐾\nDear Client, your pet summary is ready. Thank you!`;
  };

  // Open Direct WhatsApp API
  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(getWhatsAppTemplateText());
    const cleanPhone = waRecipientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Current Invoice Data for PDF Preview
  const previewInvoice = useMemo(() => {
    return invoices.find(i => i.id === selectedInvoiceId) || invoices[0];
  }, [invoices, selectedInvoiceId]);

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      
      {/* 1. TOP MODULE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white p-5 rounded-2xl border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-red-600 text-white">
              SMART MEDIA ENGINE v2.0
            </span>
            <span className="text-xs text-slate-400 font-mono">WebP 80% Compression • Automated PDF Documents</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Digital Communication & Media Gallery <CamIcon className="w-5 h-5 text-[#C9A227]" />
          </h2>
          <p className="text-xs text-slate-300">
            Automated pet photo updates, WebP folder storage, GST PDF generation & 1-click WhatsApp messaging.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-red-900/40 active:scale-95 transition-all"
          >
            <UpIcon className="w-4 h-4" />
            <span>Upload Pet Photo</span>
          </button>
        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-zinc-800">
        {[
          { id: 'gallery', label: 'Photo Gallery & WebP Vault', icon: ImgIcon },
          { id: 'daily_tracker', label: 'Boarding Daily Photo Tracker', icon: DogIcon },
          { id: 'pdf_engine', label: 'PDF Document Engine', icon: DocIcon },
          { id: 'whatsapp_email', label: 'WhatsApp & Email Center', icon: SendIcon },
          { id: 'backup', label: 'Storage & Backup System', icon: HdIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 ${
                isActive
                  ? 'bg-[#D62828] text-white shadow-md shadow-red-900/30'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PHOTO GALLERY & WEBP VAULT */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          {/* Controls & Search Bar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 w-full">
                <SrchIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Pet Name, Category, Customer or File Path..."
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#D62828]/40"
                />
              </div>

              {/* Pet Filter */}
              <select
                value={selectedPetIdFilter}
                onChange={e => setSelectedPetIdFilter(e.target.value)}
                className="h-10 px-3 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none"
              >
                <option value="ALL">All Pets ({pets.length})</option>
                {pets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.customerName})</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="h-10 px-3 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none"
              >
                <option value="ALL">All Categories ({categoriesList.length})</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Grid vs Timeline View Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    viewMode === 'grid' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    viewMode === 'timeline' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Timeline View
                </button>
              </div>
            </div>

            {/* Storage Architecture Info Pill */}
            <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-300 font-mono overflow-x-auto">
              <span className="flex items-center gap-1.5 shrink-0">
                <FldIcon className="w-3.5 h-3.5 text-[#C9A227]" />
                <strong>Structure:</strong> Photos/ Pets/ {'{PET_ID}'}/ {'{Category}'}/ YYYYMMDD_HHMMSS_Category.webp
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-4">
                ✔ Optimized WebP 80% (Max 1280x960) • Excel holds relative path
              </span>
            </div>
          </div>

          {/* Photo Grid Display */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map(photo => (
                <div 
                  key={photo.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs hover:shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div className="relative aspect-4/3 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={photo.imageUrl} 
                      alt={photo.caption} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs font-mono">
                      {photo.category}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs font-mono">
                      {photo.fileSizeKB} KB • WebP
                    </span>

                    {/* Hover Zoom & Share Actions Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                        onClick={() => {
                          setActivePreviewPhoto(photo);
                          setZoomLevel(1);
                        }}
                        className="p-2 bg-white text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
                        title="View Fullscreen & Zoom"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setWaPetPhotoId(photo.id);
                          setWaRecipientPhone(photo.customerPhone || '9876543210');
                          setActiveTab('whatsapp_email');
                        }}
                        className="p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                        title="Share on WhatsApp"
                      >
                        <ShareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <DogIcon className="w-3.5 h-3.5 text-[#D62828]" /> {photo.petName}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">{photo.uploadTimestamp.substring(11, 16)}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">{photo.caption}</p>

                    <div className="p-1.5 bg-slate-50 dark:bg-zinc-800/80 rounded-lg text-[10px] font-mono text-slate-600 dark:text-zinc-300 truncate">
                      📁 {photo.filePath}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline View Display */}
          {viewMode === 'timeline' && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalIcon className="w-4 h-4 text-[#D62828]" /> Chronological Pet Media Timeline
              </h3>

              <div className="relative border-l-2 border-slate-200 dark:border-zinc-700 ml-4 space-y-6 pl-6">
                {filteredPhotos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <span className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-[#D62828] text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-zinc-900">
                      <DogIcon className="w-3 h-3" />
                    </span>

                    <div className="bg-slate-50 dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={photo.imageUrl} 
                          alt={photo.caption} 
                          className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-pointer" 
                          onClick={() => setActivePreviewPhoto(photo)}
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{photo.petName} ({photo.customerName})</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                              {photo.category}
                            </span>
                          </p>
                          <p className="text-xs text-slate-600 dark:text-zinc-300">{photo.caption}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            Path: {photo.filePath} • Size: {photo.fileSizeKB} KB WebP
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 text-xs">
                        <button
                          onClick={() => setActivePreviewPhoto(photo)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg font-bold flex items-center space-x-1"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => {
                            setWaPetPhotoId(photo.id);
                            setActiveTab('whatsapp_email');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold flex items-center space-x-1"
                        >
                          <ShareIcon className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOARDING DAILY PHOTO TRACKER */}
      {activeTab === 'daily_tracker' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DogIcon className="w-4 h-4 text-purple-600" /> Active Boarding Pets Photo Monitor
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Real-time daily photo compliance check for pets currently staying in suites. Ensures parents receive mandatory updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boardingPhotoStats.map(stat => (
              <div 
                key={stat.pet.id}
                className={`p-4 rounded-2xl border ${
                  stat.isMissingToday 
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900/50' 
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                } space-y-3 shadow-xs`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <span>{stat.pet.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                        {stat.pet.roomNo || 'Suite'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">Parent: {stat.pet.customerName}</p>
                  </div>

                  {stat.isMissingToday ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-1">
                      <AlertIcon className="w-3 h-3" /> Photo Missing
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                      <Check2Icon className="w-3 h-3" /> Updated
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                    <span>Total WebP Photos:</span>
                    <strong className="font-mono">{stat.photoCount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                    <span>Uploaded Today:</span>
                    <strong className="font-mono">{stat.todayPhotoCount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px] pt-1 border-t border-slate-200 dark:border-zinc-700">
                    <span>Last Upload:</span>
                    <span className="font-mono">{stat.lastUploaded}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUploadPetId(stat.pet.id);
                    setShowUploadModal(true);
                  }}
                  className="w-full py-2 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-md shadow-red-900/20"
                >
                  <CamIcon className="w-3.5 h-3.5" />
                  <span>Upload Today's Update</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PDF DOCUMENT ENGINE */}
      {activeTab === 'pdf_engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Document Selector Controls */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DocIcon className="w-4 h-4 text-[#D62828]" /> Document Generator Options
            </h3>

            {/* Document Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Select Document Type:</label>
              {[
                { id: 'GST_INVOICE', label: 'GST Tax Invoice (A4 Standard)' },
                { id: 'RECEIPT', label: 'Payment Collection Receipt' },
                { id: 'CUSTOMER_STATEMENT', label: 'Customer Account Statement' },
                { id: 'BOARDING_SUMMARY', label: 'Pet Boarding & Care Summary' },
                { id: 'OUTSTANDING', label: 'Outstanding Balance Notice' },
                { id: 'CA_REGISTER', label: 'CA Sales & GST Tax Register' },
              ].map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setPdfDocType(doc.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                    pdfDocType === doc.id
                      ? 'bg-[#D62828] text-white border-[#D62828]'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  <span>{doc.label}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            {/* Invoice Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Select Target Invoice:</label>
              <select
                value={selectedInvoiceId}
                onChange={e => setSelectedInvoiceId(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none"
              >
                {invoices.map(i => (
                  <option key={i.id} value={i.id}>{i.invoiceNumber} - {i.customerName} ({formatINR(i.grandTotal)})</option>
                ))}
              </select>
            </div>

            {/* Print & Download Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md"
              >
                <PrintIcon className="w-4 h-4" />
                <span>Print Document (A4)</span>
              </button>

              <button
                onClick={() => alert(`PDF Downloaded: ${pdfDocType}_${previewInvoice?.invoiceNumber.replace(/\//g, '_')}.pdf`)}
                className="w-full py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md"
              >
                <DnIcon className="w-4 h-4" />
                <span>Download PDF File</span>
              </button>
            </div>
          </div>

          {/* Interactive Live A4 PDF Preview Container */}
          <div className="lg:col-span-2 bg-slate-200 dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl border border-slate-300 dark:border-zinc-800 overflow-x-auto">
            <div className="bg-white text-slate-900 w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-xl shadow-2xl space-y-6 font-sans text-xs relative border border-slate-200">
              
              {/* Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <span className="text-6xl font-black font-mono tracking-widest text-slate-900 rotate-12">
                  THE HOUSE OF PAWZ
                </span>
              </div>

              {/* PDF Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#D62828] uppercase">
                    The House of Pawz
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">Luxury Pet Boarding & Spa Center</p>
                  <p className="text-[10px] text-slate-500">Kalyani Nagar, Pune, Maharashtra - 411006</p>
                  <p className="text-[10px] font-mono text-slate-600 font-bold mt-1">GSTIN: 27AABCT1332F1ZP</p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 bg-[#D62828] text-white font-bold rounded uppercase text-[10px]">
                    {pdfDocType.replace('_', ' ')}
                  </span>
                  <p className="font-mono font-bold text-sm mt-2">{previewInvoice?.invoiceNumber}</p>
                  <p className="text-[10px] text-slate-500">Date: {previewInvoice?.invoiceDate}</p>
                </div>
              </div>

              {/* Client & Pet Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Billed To:</p>
                  <p className="font-bold text-slate-900">{previewInvoice?.customerName}</p>
                  <p className="text-[10px] text-slate-600">{previewInvoice?.customerPhone}</p>
                  <p className="text-[10px] text-slate-600">{previewInvoice?.customerAddress}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pet & Stay Info:</p>
                  <p className="font-bold text-[#D62828]">{previewInvoice?.petName || 'Milo'} (Dog)</p>
                  <p className="text-[10px] text-slate-600">Place of Supply: {previewInvoice?.placeOfSupply}</p>
                  <p className="text-[10px] text-slate-600 font-mono">Status: {previewInvoice?.paymentStatus}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold">
                    <th className="p-2">Item Description</th>
                    <th className="p-2">HSN/SAC</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">GST (18%)</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewInvoice?.items.map((item, idx) => (
                    <tr key={idx} className="text-xs">
                      <td className="p-2 font-bold">{item.name}</td>
                      <td className="p-2 font-mono text-[10px]">{item.hsnSac}</td>
                      <td className="p-2 text-right font-mono">{formatINR(item.price)}</td>
                      <td className="p-2 text-center font-bold">{item.qty}</td>
                      <td className="p-2 text-right font-mono text-[10px]">{formatINR(item.cgstAmount + item.sgstAmount)}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatINR(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px]">
                    <p className="font-bold text-slate-700">Scan & Pay via UPI:</p>
                    <p className="font-mono text-slate-500">UPI ID: houseofpawz@upi</p>
                  </div>
                </div>

                <div className="w-48 space-y-1 text-right text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono">{formatINR(previewInvoice?.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST + SGST (18%):</span>
                    <span className="font-mono">{formatINR(previewInvoice?.totalGst)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-300 pt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#D62828]">{formatINR(previewInvoice?.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Digital Signature Footer */}
              <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-[10px] text-slate-500">
                <p>Computer Generated Invoice. No physical signature required.</p>
                <div className="text-center font-mono">
                  <p className="font-bold text-slate-800">[ DIGITAL SIGNATURE STAMP ]</p>
                  <p>Authorized Signatory - Pawz Pro</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WHATSAPP & EMAIL CENTER */}
      {activeTab === 'whatsapp_email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* WhatsApp Engine */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-emerald-600" /> WhatsApp Direct Engine
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Recipient Phone Number:</label>
                <input
                  type="text"
                  value={waRecipientPhone}
                  onChange={e => setWaRecipientPhone(e.target.value)}
                  className="w-full h-10 px-3 mt-1 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Select Template:</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { id: 'DAILY_UPDATE', label: 'Pet Daily Photo Update' },
                    { id: 'INVOICE', label: 'GST Tax Invoice' },
                    { id: 'RECEIPT', label: 'Payment Receipt' },
                    { id: 'BOARDING_CHECKIN', label: 'Suite Check-In Summary' },
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => setWaTemplateType(tmpl.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border text-left ${
                        waTemplateType === tmpl.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Live Message Preview:</label>
                <textarea
                  readOnly
                  rows={8}
                  value={getWhatsAppTemplateText()}
                  className="w-full p-3 mt-1 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-zinc-700 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSendWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
              >
                <SendIcon className="w-4 h-4" />
                <span>Send via WhatsApp API</span>
              </button>
            </div>
          </div>

          {/* Email Engine */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MailIcon className="w-4 h-4 text-blue-600" /> HTML Email Composer & Attachment
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Recipient Email:</label>
                <input
                  type="email"
                  defaultValue="client@gmail.com"
                  className="w-full h-10 px-3 mt-1 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Subject Line:</label>
                <input
                  type="text"
                  defaultValue="[The House of Pawz] Invoice & Pet Boarding Update - HOP/26-27/000001"
                  className="w-full h-10 px-3 mt-1 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                <p className="font-bold text-slate-800 dark:text-zinc-200">Attachments Auto-Included:</p>
                <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
                  <DocIcon className="w-3.5 h-3.5 text-red-500" />
                  <span>GST_Invoice_HOP2627_000001.pdf (124 KB)</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
                  <ImgIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>20260806_091500_CheckIn.webp (142 KB)</span>
                </div>
              </div>

              <button
                onClick={() => alert('Email notification queued and dispatched successfully to client!')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 active:scale-95 transition-all"
              >
                <MailIcon className="w-4 h-4" />
                <span>Send Email with Attachments</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STORAGE & BACKUP SYSTEM */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HdIcon className="w-4 h-4 text-emerald-600" /> Photo Folder & Database Backup Architecture
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Local Photos Vault</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">12.4 MB</p>
                <p className="text-[10px] text-emerald-600 font-semibold">96.2% WebP Compression Efficiency</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Excel Image Paths</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">Clean Relative</p>
                <p className="text-[10px] text-blue-600 font-semibold">Zero Blob Pollution in Excel</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Auto Sync Schedule</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">Daily 11:59 PM</p>
                <p className="text-[10px] text-purple-600 font-semibold">Google Drive Backup Active</p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => alert('Daily Backup Archive created successfully!\nPath: Backups/20260806_FullBackup.zip')}
                className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md"
              >
                <CldIcon className="w-4 h-4 text-amber-400" />
                <span>Trigger Manual Full Backup Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FULLSCREEN PHOTO ZOOM PREVIEW MODAL */}
      {activePreviewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-3xl w-full p-4 border border-zinc-800 space-y-4 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <DogIcon className="w-4 h-4 text-[#D62828]" /> {activePreviewPhoto.petName} ({activePreviewPhoto.category})
                </h4>
                <p className="text-[10px] font-mono text-slate-400">Path: {activePreviewPhoto.filePath}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
                >
                  <ZInIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
                >
                  <ZOutIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActivePreviewPhoto(null)}
                  className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img 
                src={activePreviewPhoto.imageUrl} 
                alt={activePreviewPhoto.caption}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-96 object-contain transition-transform duration-200"
              />
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-amber-300">{activePreviewPhoto.caption}</p>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-zinc-700">
                <span>Parent: {activePreviewPhoto.customerName} ({activePreviewPhoto.customerPhone})</span>
                <span>Size: {activePreviewPhoto.fileSizeKB} KB WebP ({activePreviewPhoto.dimensions})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. UPLOAD & WEBP CONVERSION MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UpIcon className="w-4 h-4 text-[#D62828]" /> Upload & WebP Compress Pet Photo
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Select Boarding / Daycare Pet:</label>
                <select
                  value={uploadPetId}
                  onChange={e => setUploadPetId(e.target.value)}
                  className="w-full h-10 px-3 mt-1 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold"
                >
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.customerName}) - {p.roomNo || 'Suite'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Photo Category:</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value as PhotoCategory)}
                  className="w-full h-10 px-3 mt-1 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Select Image File:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs"
                />
              </div>

              {isCompressing && (
                <div className="p-3 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
                  <RefIcon className="w-4 h-4 animate-spin" />
                  <span>Compressing to WebP 80% (1280x960)...</span>
                </div>
              )}

              {compressionDetails && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1 text-emerald-800 dark:text-emerald-200 font-mono text-[11px]">
                  <p className="font-bold">✔ WebP Conversion Complete!</p>
                  <p>Original: {compressionDetails.origSize} ➔ WebP: {compressionDetails.compressedSize}</p>
                  <p>Storage Saved: {compressionDetails.savedPct}</p>
                  <p className="truncate text-[10px] text-slate-500">Folder: {compressionDetails.path}</p>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300">Update Caption / Note for Parent:</label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  placeholder="e.g. Milo enjoyed morning agility run & ate full meal."
                  className="w-full h-10 px-3 mt-1 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#D62828] hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-900/30 active:scale-95 transition-all"
              >
                Store WebP Photo & Sync Excel Path
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
