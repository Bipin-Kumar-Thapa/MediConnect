import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./staff/StaffSidebar";

const StaffPage = () => {
  return (
    <div className="staff-layout">
      <Sidebar />

      <div className="staff-content">
        <Outlet />
      </div>
    </div>
  );
};

export default StaffPage;
