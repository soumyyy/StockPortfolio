import { useState, useEffect } from 'react';
import { Holding } from '../types/holding';

interface EditHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding?: Holding | null;
  onSave: (data: { ticker: string; quantity: number; averagePrice: number }) => Promise<void>;
  onDelete?: (ticker: string) => Promise<void>;
  isNew?: boolean;
}

export default function EditHoldingModal({ 
  isOpen, 
  onClose, 
  holding, 
  onSave, 
  onDelete,
  isNew = false 
}: EditHoldingModalProps) {
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: 0,
    averagePrice: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [additionalLot, setAdditionalLot] = useState({
    quantity: '',
    price: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setAdditionalLot({ quantity: '', price: '' });
    setShowDeleteConfirm(false);
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
    if (!isLoading && !isDeleting) {
      setAdditionalLot({ quantity: '', price: '' });
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !formData.ticker) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(formData.ticker);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting holding:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyAdditionalLot = () => {
    const addQuantity = Number(additionalLot.quantity);
    const addPrice = Number(additionalLot.price);
    if (!addQuantity || Number.isNaN(addQuantity)) {
      return;
    }

    const currentQuantity = Number(formData.quantity) || 0;
    const currentAverage = Number(formData.averagePrice) || 0;
    let totalQuantity = currentQuantity + addQuantity;
    if (totalQuantity < 0) {
      totalQuantity = 0;
    }

    let newAverage = currentAverage;

    if (addQuantity > 0) {
      if (!addPrice || addPrice <= 0) {
        return;
      }
      const totalValue = currentQuantity * currentAverage + addQuantity * addPrice;
      newAverage = totalQuantity === 0 ? 0 : totalValue / totalQuantity;
    } else if (totalQuantity === 0) {
      newAverage = 0;
    }

    setFormData(prev => ({
      ...prev,
      quantity: totalQuantity,
      averagePrice: Number(newAverage.toFixed(2))
    }));
    setAdditionalLot({ quantity: '', price: '' });
  };

  const additionalQuantityValue = Number(additionalLot.quantity);
  const additionalPriceValue = Number(additionalLot.price);
  const canApplyAdditionalLot = (
    (additionalQuantityValue > 0 && additionalPriceValue > 0) ||
    additionalQuantityValue < 0
  );

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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-white/90">
              {isNew ? 'Add Stock' : 'Edit Holding'}
            </h2>
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isLoading}
                className="p-1 rounded-full text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                title="Delete holding"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading || isDeleting}
            className="p-1 hover:bg-white/[0.03] rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-white/40">Update holding</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs text-white/60 mb-1.5">Stock Symbol</label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => setFormData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="e.g., RELIANCE"
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Average Price (₹)</label>
                <input
                  type="number"
                  value={formData.averagePrice || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, averagePrice: Number(e.target.value) || 0 }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          {!isNew && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-white/40">
                <span>Add purchase lot</span>
                <span className="text-white/30 normal-case">Buy/Sell</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={additionalLot.quantity}
                    onChange={(e) => setAdditionalLot(prev => ({ ...prev, quantity: e.target.value }))}
                    step="1"
                    placeholder="0"
                    className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    value={additionalLot.price}
                    onChange={(e) => setAdditionalLot(prev => ({ ...prev, price: e.target.value }))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleApplyAdditionalLot}
                  disabled={!canApplyAdditionalLot || isLoading}
                  className="px-4 py-2 text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply lot
                </button>
              </div>
            </div>
          )}

          {/* Delete confirmation */}
          {showDeleteConfirm && !isNew && onDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
              <div className="relative w-full max-w-sm bg-[#111] border border-white/[0.08] rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-red-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M5.64 5.64l12.72 12.72" />
                  </svg>
                  <span className="text-sm font-medium">Delete {formData.ticker}</span>
                </div>
                <p className="text-xs text-white/70">Are you sure you've sold this Holding?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-white/80 text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-lg text-red-100 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting…' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading || isDeleting}
              className="flex-1 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg text-white/70 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isDeleting || !formData.ticker.trim() || formData.quantity <= 0 || formData.averagePrice <= 0}
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
