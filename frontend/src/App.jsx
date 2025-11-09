import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProtectedRoutes from './utils/ProtectedRoutes.jsx';
import Root from './components/Root.jsx';
import Login from './layouts/Login.jsx';
import Products from './pages/Products.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import TempFeature from './pages/TempFeature.jsx';
import Logout from './components/Logout.jsx';
import DataManagement from './pages/DataManagement.jsx';
import Transaction from './pages/Transaction.jsx';
import Procurement from './pages/Procurement.jsx';

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
        >
          <Route index element = {<TempFeature/>} />
          <Route path="products" element = {<Products/>} />
          <Route path="data-management" element={<DataManagement/>} />
          <Route path="transactions" element={<Transaction/>} />
          <Route path="procurement" element={<Procurement/>} />
          <Route path="approvals" element={<TempFeature/>} />
          <Route path="users" element={<TempFeature/>} />
          <Route path="profile" element={<TempFeature/>} />
          <Route path="logout" element={<Logout/>} />
        </Route>

        {/* ================= User View ================= */}
        <Route
          path="/user"
          element={
            <ProtectedRoutes requireRole={["user"]}>
              <MainLayout/>
            </ProtectedRoutes>
          }
        >
          <Route index element = {<TempFeature/>} />
          <Route path="products" element = {<Products/>} />
          <Route path="transactions" element={<TempFeature/>} />
          <Route path="profile" element={<TempFeature/>} />
          <Route path="logout" element={<Logout/>} />
        </Route>
         {/* ================= Auth & Fallback ================= */}
         <Route path="/login" element={<Login />} />
         <Route path="/unauthorized" element={<h1 className='text-red-500 text-3xl'>Unauthorized Access</h1>} />
      </Routes>
    </Router>
  )
}

export default App
