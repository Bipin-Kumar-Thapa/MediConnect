import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./pharmacy/PharmacySidebar";

const PharmacyPage = () => {
  return (
    <div className="pharmacy-layout">
      <Sidebar />

      <div className="pharmacy-content">
        <Outlet />
      </div>
    </div>
  );
};

export default PharmacyPage;
