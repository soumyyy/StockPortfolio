import { useState, ChangeEvent, FormEvent } from 'react';
import type { NextPage } from 'next';

const AddStock: NextPage = () => {
  const [formData, setFormData] = useState({
    ticker: '',
    buyPrice: '',
    quantity: '',
    purchaseDate: ''
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('New Stock Data:', formData);
    // Later, you'll update your JSON file or connect to a database.
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    console.log('CSV File:', file);
    // Later, implement CSV parsing to update your holdings.
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white/90 py-6 safe-area-inset-top pb-safe">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4 text-white/90">Add/Remove Stock</h1>
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div>
            <label className="block mb-1 text-white/70">Ticker Symbol:</label>
            <input
              type="text"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block mb-1 text-white/70">Buy Price:</label>
            <input
              type="number"
              name="buyPrice"
              value={formData.buyPrice}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block mb-1 text-white/70">Quantity:</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block mb-1 text-white/70">Date of Purchase:</label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.06] rounded-lg text-white/90 transition-colors"
          >
            Add Stock
          </button>
        </form>

        <div>
          <h3 className="text-xl font-semibold mb-2 text-white/90">Or Upload CSV</h3>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-white/90 file:bg-transparent file:border-0 file:text-white/70 file:mr-4"
          />
        </div>
      </div>
    </div>
  );
};

export default AddStock;