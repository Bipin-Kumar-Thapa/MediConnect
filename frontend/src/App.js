import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MediConnect from "./components/MediConnect";
import Login from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import PatientPage from "./components/PatientPage";
import DoctorPage from "./components/DoctorPage";
import StaffPage from "./components/StaffPage";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

// Patient pages
import PatientOverview from "./components/patient/PatientOverview";
import Appointments from "./components/patient/Appointments";
import Prescriptions from "./components/patient/Prescriptions";
import LabReports from "./components/patient/LabReports";
import MedicineSchedule from "./components/patient/MedicineSchedule";
import ConsultationHistory from "./components/patient/ConsultationHistory";
import Profile from "./components/patient/Profile";

// Doctor pages
import DoctorOverview from "./components/doctor/DoctorOverview";
import DoctorAppointments from "./components/doctor/DoctorAppointments";
import DoctorPatients from "./components/doctor/DoctorPatients";
import DoctorPrescriptions from "./components/doctor/DoctorPrescriptions";
import DoctorLabReports from "./components/doctor/DoctorLabReports";
import DoctorConsultations from "./components/doctor/DoctorConsultations";
import DoctorSchedule from "./components/doctor/DoctorSchedule";
import DoctorProfile from "./components/doctor/DoctorProfile";
import Doctors from "./components/patient/Doctors";

//Staff pages
import StaffOverview from "./components/staff/StaffOverview";
import StaffUpload from "./components/staff/StaffUpload";
import StaffLabReports from "./components/staff/StaffLabReports";
import StaffProfile from "./components/staff/StaffProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MediConnect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* PATIENT ROUTES */}
        <Route path="/patient" element={<PatientPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PatientOverview />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="reports" element={<LabReports />} />
          <Route path="medicine" element={<MedicineSchedule />} />
          <Route path="history" element={<ConsultationHistory />} />
          <Route path="profile" element={<Profile />} />
          <Route path="doctors" element={<Doctors />} />
        </Route>

        {/* DOCTOR ROUTES */}
        <Route path="/doctor" element={<DoctorPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<DoctorOverview />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
          <Route path="reports" element={<DoctorLabReports />} />
          <Route path="consultations" element={<DoctorConsultations />} />
          <Route path="schedule" element={<DoctorSchedule />} />
          <Route path="profile" element={<DoctorProfile />} />
        </Route>

        {/* STAFF ROUTES */}
        <Route path="/staff" element={<StaffPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<StaffOverview />} />
          <Route path="upload" element={<StaffUpload />} />
          <Route path="reports" element={<StaffLabReports />} />
          <Route path="profile" element={<StaffProfile />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
