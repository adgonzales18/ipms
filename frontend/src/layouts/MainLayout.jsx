import React, { use, useEffect, useState} from "react"
import Sidebar from "../components/Sidebar"
import { Outlet } from "react-router-dom"

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setCollapsed(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [])

    return (
        <div className="flex min-h-screen w-full bg-gray-100">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      {/* Main Content Area */}
      <div
        className={`flex-1 h-screen transition-all duration-300 ${
          collapsed ? "ml-20" : "ml-64"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto flex flex-col">
          {/* Page content */}
          <div className="flex-1 min-w-full overflow-x-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
