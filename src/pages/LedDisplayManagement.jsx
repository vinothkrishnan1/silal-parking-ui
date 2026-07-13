import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash, Image as ImageIcon, X, Save, Film } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {
  addStoredLedVideos,
  APP_LED_VIDEOS_EVENT,
  deleteStoredLedVideo,
  getStoredLedVideos,
} from '../utils/appStorage';
import { useLanguage } from '../context/LanguageContext';

const LedDisplayManagement = () => {
  const { language, t } = useLanguage();
  const [images, setImages] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [, setCurrentImage] = useState(null); // Reserved for future editing flow
  const [formData, setFormData] = useState({
    title: '',
    imageFiles: [],
    imagePreviews: [],
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const fileInputRef = useRef(null);
  const selectedPreviewUrlsRef = useRef([]);

  const revokePreviewUrls = useCallback((urls = []) => {
    urls.forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const storedImages = await getStoredLedVideos();
      setImages(storedImages);
    } catch (error) {
      console.error('Failed to load LED images:', error);
    }
  }, []);

  useEffect(() => {
    loadImages();

    const syncImages = () => {
      loadImages();
    };

    window.addEventListener(APP_LED_VIDEOS_EVENT, syncImages);
    window.addEventListener('storage', syncImages);

    return () => {
      window.removeEventListener(APP_LED_VIDEOS_EVENT, syncImages);
      window.removeEventListener('storage', syncImages);
      revokePreviewUrls(selectedPreviewUrlsRef.current);
    };
  }, [loadImages, revokePreviewUrls]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length) {
      const invalidFiles = selectedFiles.filter((file) => !file.type.startsWith('image/'));
      const validFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));

      if (invalidFiles.length) {
        alert(t('ledDisplay.invalidFiles'));
      }

      if (!validFiles.length) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const nextPreviews = validFiles.map((file) => ({
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      }));

      revokePreviewUrls(selectedPreviewUrlsRef.current);
      selectedPreviewUrlsRef.current = nextPreviews.map((file) => file.previewUrl);

      setFormData((prevFormData) => ({
        ...prevFormData,
        imageFiles: validFiles,
        imagePreviews: nextPreviews,
      }));
    }
  };

  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetForm = () => {
    revokePreviewUrls(selectedPreviewUrlsRef.current);
    selectedPreviewUrlsRef.current = [];
    setFormData({ title: '', imageFiles: [], imagePreviews: [] });
    setCurrentImage(null); // For future editing
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = '';
      } catch (error) {
        console.warn('Could not reset file input:', error);
      }
    }
  };

  const handleOpenFormModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageFiles.length) {
      alert(t('ledDisplay.noFileError'));
      return;
    }

    try {
      const manualTitle = formData.title.trim();

      await addStoredLedVideos(
        formData.imageFiles.map((file, index) => ({
          title:
            formData.imageFiles.length === 1 && manualTitle
              ? manualTitle
              : file.name.replace(/\.[^.]+$/, '') || `Image ${index + 1}`,
          file,
        }))
      );

      await loadImages();
      handleCloseFormModal();
    } catch (error) {
      console.error('Failed to save LED images:', error);
      alert(t('ledDisplay.uploadError'));
    }
  };

  const handleDeleteImage = (image) => {
    setDeleteModal({ isOpen: true, id: image.id, name: image.title });
  };

  const confirmDeleteImage = async () => {
    try {
      await deleteStoredLedVideo(deleteModal.id);
      await loadImages();
      setDeleteModal({ isOpen: false, id: null, name: '' });
    } catch (error) {
      console.error('Failed to delete LED image:', error);
      alert(t('ledDisplay.deleteError'));
    }
  };

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header Section */}
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('ledDisplay.title')}</h1>
          <p className="text-gray-500 mt-2 font-medium">{t('ledDisplay.subtitle')}</p>
        </div>
        <button
          className="ripple-button px-6 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none"
          onClick={() => handleOpenFormModal()}
        >
          <Plus size={18} className={language === 'ar' ? 'ml-2' : 'mr-2'} />
          {t('ledDisplay.addVideo')}
        </button>
      </div>

      {/* Images Grid Card */}
      <div className="premium-card p-6 overflow-hidden">
        {images.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Film size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-bold text-gray-900 mb-1">{t('ledDisplay.noVideos')}</p>
            <p className="text-sm font-medium text-gray-400">{t('ledDisplay.noVideosHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {images.map((image) => (
              <div key={image.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:shadow-black/5 hover:border-premium-gold/30 transition-all duration-300 group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                <div className="p-5 bg-gray-50/50">
                  <h3 className="text-base font-black text-premium-black truncate" title={image.title}>
                    {image.title}
                  </h3>
                  <p className="text-xs text-premium-gold font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1">
                    <ImageIcon size={12} />
                    {t('ledDisplay.uploaded')}: {new Date(image.uploadedAt).toLocaleDateString(language === 'ar' ? 'ar-OM' : 'en-GB')}
                  </p>
                </div>
                {image.sourceUrl && (
                  <div className="aspect-video bg-premium-black relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                    <img
                      src={image.sourceUrl}
                      alt={image.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-2 relative z-20">
                  <button
                    onClick={() => handleDeleteImage(image)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-300 focus:outline-none shadow-sm hover:shadow-md hover:shadow-red-500/20"
                    title={t('ledDisplay.deleteVideo')}
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col transform transition-all ${language === 'ar' ? 'text-right' : ''}`}>
            {/* Modal Header */}
            <div className={`flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-bold text-gray-900">
                {t('ledDisplay.addLedVideos')}
              </h3>
              <button
                onClick={handleCloseFormModal}
                className="text-gray-400 hover:text-[#121212] focus:outline-none transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form id="ledUploadForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-grow">
              <div>
                <label htmlFor="imageTitle" className="block text-sm font-semibold text-gray-700 mb-2">{t('ledDisplay.videoTitle')}</label>
                <input
                  type="text"
                  name="title"
                  id="imageTitle"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  placeholder={language === 'ar' ? 'مثلاً: صورة ترحيب، إعلانات' : 'e.g., Welcome Image, Advertisements'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ledDisplay.uploadVideoFiles')}</label>
                <div className={`mt-1 flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={triggerImageUpload}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all focus:outline-none flex items-center"
                  >
                    <ImageIcon size={16} className={language === 'ar' ? 'ml-2' : 'mr-2'} />
                    {formData.imageFiles.length ? t('ledDisplay.changeVideos') : t('ledDisplay.selectVideos')}
                  </button>
                  <input
                    type="file"
                    name="imageFile"
                    id="imageFile"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    className="hidden"
                    accept="image/*"
                    multiple
                  />
                  {formData.imageFiles.length > 0 && (
                    <span className="text-sm font-medium text-gray-500 truncate max-w-xs" title={`${formData.imageFiles.length} ${t('ledDisplay.videosSelected')}`}>
                      {formData.imageFiles.length} {t('ledDisplay.videosSelected')}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400 font-medium">{t('ledDisplay.formatHelp')}</p>
              </div>

              {formData.imagePreviews.length > 0 && (
                <div className="mt-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{t('ledDisplay.selectedPreview')}</label>
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                    {formData.imagePreviews.map((imagePreview) => (
                      <div key={imagePreview.previewUrl} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 text-xs font-bold text-gray-700">
                          <span className="truncate pr-3" title={imagePreview.name}>{imagePreview.name}</span>
                          <span className="whitespace-nowrap text-gray-400 font-semibold">
                            {(imagePreview.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                        <div className="aspect-video bg-black/95">
                          <img src={imagePreview.previewUrl} alt={imagePreview.name} className="h-full w-full object-contain" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className={`p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={handleCloseFormModal}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#121212]/20"
              >
                {t('ledDisplay.cancel')}
              </button>
              <button
                type="submit"
                form="ledUploadForm"
                className="px-5 py-2.5 bg-gradient-to-r from-[#121212] to-[#2a2a2a] text-white rounded-xl hover:from-black hover:to-[#1a1a1a] shadow-md active:scale-95 flex items-center gap-2 font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#121212]/50"
                disabled={!formData.imageFiles.length}
              >
                <Save size={16} />
                {t('ledDisplay.uploadVideos')}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDeleteImage}
        title={t('ledDisplay.deleteLedVideo')}
        message={t('ledDisplay.deleteConfirm')}
        itemName={deleteModal.name}
      />
    </div>
  );
};

export default LedDisplayManagement;
