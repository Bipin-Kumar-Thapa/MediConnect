import { Outlet } from "react-router-dom";
import Sidebar from "./patient/Sidebar";

const PatientPage = () => {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};

export default PatientPage;
