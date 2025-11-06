import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProtectedRoutes from './utils/ProtectedRoutes.jsx';
import Root from './components/Root.jsx';
import Login from './layouts/Login.jsx';
import Products from './pages/Products.jsx';
import MainLayout from './layouts/MainLayout.jsx';

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Root />} />
          {/* ================= Admin View ================= */}
        <Route 
        path="/admin" 
        element={
          <ProtectedRoutes requireRole = {["admin"]}>
            <MainLayout/>
          </ProtectedRoutes>
        } 
        />

        {/* ================= User View ================= */}
        <Route 
          path="/user"
          element={
            <ProtectedRoutes requireRole={["user"]}>
              <MainLayout/>
            </ProtectedRoutes>
          }
        />
         {/* ================= Auth & Fallback ================= */}
         <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<h1 className='text-red-500 text-3xl'>Unauthorized Access</h1>} />
      </Routes>
    </Router>
  )
}

export default App
