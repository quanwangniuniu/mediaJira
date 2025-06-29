import { useState } from 'react';
import axios from 'axios';

export default function ConnectionTest() {
  const [status, setStatus] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus('');
    try {
      const response = await axios.get('/api/test/connection/');
      setStatus(response.data.status || 'Success');
    } catch (error) {
      setStatus('Failed');
    }
    setLoading(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/test/data/');
      setData(response.data);
    } catch (error) {
      setData([]);
    }
    setLoading(false);
  };

  const createData = async () => {
    setLoading(true);
    try {
      await axios.post('/api/test/data/create/');
      fetchData();
    } catch (error) {
      // handle error
    }
    setLoading(false);
  };

  const clearData = async () => {
    setLoading(true);
    try {
      await axios.delete('/api/test/data/clear/');
      setData([]);
    } catch (error) {
      // handle error
    }
    setLoading(false);
  };

  return (
    <div className="connection-test">
      <h2 className="test-title">Connection Test</h2>
      <div className="test-actions">
        <button className="btn btn-primary" onClick={testConnection} disabled={loading}>Test Connection</button>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>Fetch Data</button>
        <button className="btn btn-secondary" onClick={createData} disabled={loading}>Create Data</button>
        <button className="btn btn-secondary" onClick={clearData} disabled={loading}>Clear Data</button>
      </div>
      <div className="test-status">Status: {status}</div>
      <div className="test-data">
        <h3>Test Data</h3>
        <ul>
          {data.map((item, idx) => (
            <li key={idx}>{item.value}</li>
          ))}
        </ul>
      </div>
    </div>
  );
} 