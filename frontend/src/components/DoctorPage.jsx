import React from "react";
import { Outlet } from "react-router-dom";
import DoctorSidebar from "./doctor/DoctorSidebar";

const DoctorPage = () => {
  return (
    <div className="doctor-layout">
      <DoctorSidebar />

      <div className="doctor-content">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorPage;
