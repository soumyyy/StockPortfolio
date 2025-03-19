// src/components/AddStockForm.tsx
import { useState, ChangeEvent, FormEvent } from 'react';

const AddStockForm: React.FC = () => {
  const [formData, setFormData] = useState({
    ticker: '',
    buyPrice: '',
    quantity: '',
    purchaseDate: '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('New Stock Data:', formData);
    // Later: Update your JSON or call an API to persist this data.
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    console.log('CSV File:', file);
    // Later: Parse CSV and update holdings.
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Add Stock</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700">Ticker Symbol</label>
          <input
            type="text"
            name="ticker"
            value={formData.ticker}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Buy Price</label>
          <input
            type="number"
            name="buyPrice"
            value={formData.buyPrice}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Date of Purchase</label>
          <input
            type="date"
            name="purchaseDate"
            value={formData.purchaseDate}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-2 rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          Add Stock
        </button>
      </form>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Or Upload CSV</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="w-full border border-gray-300 p-2 rounded"
        />
      </div>
    </div>
  );
};

export default AddStockForm;