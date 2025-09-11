import { useState, useEffect } from 'react';
import { Holding } from '../types/holding';

interface EditHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding?: Holding | null;
  onSave: (data: { ticker: string; quantity: number; averagePrice: number }) => Promise<void>;
  isNew?: boolean;
}

export default function EditHoldingModal({ 
  isOpen, 
  onClose, 
  holding, 
  onSave, 
  isNew = false 
}: EditHoldingModalProps) {
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: 0,
    averagePrice: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (holding && !isNew) {
      setFormData({
        ticker: holding.ticker,
        quantity: holding.quantity,
        averagePrice: holding.averageBuyPrice
      });
    } else if (isNew) {
      setFormData({
        ticker: '',
        quantity: 0,
        averagePrice: 0
      });
    }
  }, [holding, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker.trim() || formData.quantity <= 0 || formData.averagePrice <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving holding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/[0.06] rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white/90">
            {isNew ? 'Add Stock' : 'Edit Holding'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 hover:bg-white/[0.03] rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              value={formData.ticker}
              onChange={(e) => setFormData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
              placeholder="e.g., RELIANCE"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
              disabled={isLoading}
              required
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) || 0 }))}
              placeholder="0"
              min="0"
              step="1"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
              disabled={isLoading}
              required
            />
          </div>

          {/* Average Price */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Average Price (₹)
            </label>
            <input
              type="number"
              value={formData.averagePrice || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, averagePrice: Number(e.target.value) || 0 }))}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
              disabled={isLoading}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg text-white/70 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.ticker.trim() || formData.quantity <= 0 || formData.averagePrice <= 0}
              className="flex-1 px-4 py-2 bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.06] rounded-lg text-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin mr-2" />
                  Saving...
                </div>
              ) : (
                isNew ? 'Add Stock' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
