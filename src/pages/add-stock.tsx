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
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">Add/Remove Stock</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div>
          <label className="block mb-1">Ticker Symbol:</label>
          <input
            type="text"
            name="ticker"
            value={formData.ticker}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block mb-1">Buy Price:</label>
          <input
            type="number"
            name="buyPrice"
            value={formData.buyPrice}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block mb-1">Quantity:</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block mb-1">Date of Purchase:</label>
          <input
            type="date"
            name="purchaseDate"
            value={formData.purchaseDate}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Add Stock
        </button>
      </form>

      <div>
        <h3 className="text-xl font-semibold mb-2">Or Upload CSV</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="border border-gray-300 p-2"
        />
      </div>
    </div>
  );
};

export default AddStock;