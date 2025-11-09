import {
  FaBox,
  FaCog,
  FaHome,
FaSignOutAlt,
FaUsers,
FaDatabase,
FaTruckLoading,
FaExchangeAlt,
FaCheckCircle,
FaChevronLeft,
FaChevronRight,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from '../assets/Personal_Logo_Inverted.png';

const Sidebar = ({ collapsed, setCollapsed }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    if (!user) {
        return null;
   }
   const adminMenu = [
    { name: "Dashboard", path: "/admin", icon: <FaHome />, isParent: true },
    { name: "Products", path: "/admin/products", icon: <FaBox /> },
    { name: "Data Management", path: "/admin/data-management", icon: <FaDatabase /> },
    { name: "Transactions", path: "/admin/transactions", icon: <FaExchangeAlt /> },
    { name: "Procurement", path: "/admin/procurement", icon: <FaTruckLoading /> },
    { name: "Approvals", path: "/admin/approvals", icon: <FaCheckCircle /> },
    { name: "Users", path: "/admin/users", icon: <FaUsers /> },
    { name: "Profile", path: "/admin/profile", icon: <FaCog /> },
    { name: "Logout", path: "/admin/logout", icon: <FaSignOutAlt /> },
  ];

  const viewerMenu = [
    { name: "Products", path: "/user/products", icon: <FaBox /> },
    { name: "Transactions", path: "/user/transactions", icon: <FaExchangeAlt /> },
    { name: "Profile", path: "/user/profile", icon: <FaCog /> },
    { name: "Logout", path: "/user/logout", icon: <FaSignOutAlt /> },
  ];

  const menuItems = user.role === "admin" ? adminMenu : viewerMenu

  return (
    <div
        className={`fixed left-0 top-0 h-screen bg-blue-900 text-white z-50 flex flex-col
        transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
    >
        {/* Header Section */}
        <div className="flex items-center justify-center border-b border-blue-800 p-4">
        <img
            src={logo}
            alt="Agile DevGrit Logo"
            className={`object-cover transition-all duration-300
            ${collapsed ? "h-10 w-10" : "h-16 w-16"}`}
        />
        {!collapsed && (
            <span className="ml-3 text-sm font-bold leading-tight text-center">
            IPMS
            </span>
        )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 mt-4 overflow-y-auto">
        <ul className="space-y-2">
            {menuItems.map((item) => (
            <li key={item.name}>
                <NavLink
                end={item.isParent}
                to={item.path}
                className={({ isActive }) =>
                    (isActive ? "bg-blue-700 " : "") +
                    "flex items-center p-2 rounded-md hover:bg-blue-600 transition-colors duration-200"
                }
                >
                <span className="flex items-center justify-center w-8 h-8 text-xl">
                    {item.icon}
                </span>
                {!collapsed && (
                    <span className="truncate ml-3 text-sm font-medium">{item.name}</span>
                )}
                </NavLink>
            </li>
            ))}
        </ul>
        </div>

        {/* Collapse/Expand Button (Center Middle on Sidebar Edge) */}
        <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-[-12px] top-1/2 -translate-y-1/2 
        bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-full shadow-md 
        transition-all duration-300"
        >
        {collapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
        </button>
        {/* Sidebar Footer */}
        <div className="mt-auto mb-3 text-center text-[11px] text-green-100/70 select-none">
            Powered by{" "}
            <span className="text-white font-semibold">Agile DevGrit, Inc.</span>
        </div>
    </div>
    );
    }
export default Sidebar;


