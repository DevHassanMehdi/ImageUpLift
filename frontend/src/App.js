import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Convert from './pages/Convert';
import Gallery from './pages/Gallery';
import ApiDocs from './pages/ApiDocs';
import Analytics from './pages/Analytics';

export default function App(){
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/convert" replace/>} />
          <Route path="/convert" element={<Convert />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </div>
    </>
  );
}
