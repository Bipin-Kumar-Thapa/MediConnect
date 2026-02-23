import "../styles/MediConnect.css";
import { FaCalendarAlt, FaFileAlt, FaClipboardList, FaStoreAlt, FaClock, FaBell,FaShieldAlt, FaBolt, FaUsers, FaHeart, FaUserAlt, FaUserMd, FaPills, FaFlask, FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import React, { useState } from "react";


const services = [
  {
    icon: <FaCalendarAlt />,
    title: "Doctor Appointments",
    desc: "Book appointments with specialists instantly. Choose your preferred doctor and time slot.",
    color: "#1677ff",
  },
  {
    icon: <FaFileAlt />,
    title: "Lab Reports",
    desc: "Access all your medical reports digitally. Download, share, and track your health records.",
    color: "#28a745",
  },
  {
    icon: <FaClipboardList />,
    title: "Digital Prescriptions",
    desc: "Get prescriptions from doctors directly on the platform. No more paper hassles.",
    color: "#8b3dff",
  },
  {
    icon: <FaStoreAlt />,
    title: "Online Pharmacy",
    desc: "Order medicines from verified pharmacies. Get doorstep delivery with genuine products.",
    color: "#ff6a00",
  },
  {
    icon: <FaClock />,
    title: "Medication Schedule",
    desc: "Personalized medicine timetable created by your pharmacy. Never miss a dose.",
    color: "#ff0f7b",
  },
  {
    icon: <FaBell />,
    title: "Smart Reminders",
    desc: "Timely notifications for appointments, medications, and lab tests. Stay on track.",
    color: "#00b894",
  },
];

const steps = [
    {
      number: "1",
      title: "Patient Books Appointment",
      desc: "Patient selects doctor and books appointment through the platform",
    },
    {
      number: "2",
      title: "Doctor Consultation",
      desc: "Doctor reviews medical history and provides consultation",
    },
    {
      number: "3",
      title: "Lab Tests & Reports",
      desc: "If needed, lab tests are ordered and results uploaded digitally",
    },
    {
      number: "4",
      title: "Digital Prescription",
      desc: "Doctor provides prescription directly on the platform",
    },
    {
      number: "5",
      title: "Pharmacy Fulfillment",
      desc: "Pharmacy receives prescription and prepares medication",
    },
    {
      number: "6",
      title: "Medicine Delivery & Schedule",
      desc: "Pharmacy delivers medicine with a personalized medication timetable",
    },
  ];

export default function MediConnect() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <img src="/images/Logo.png" alt="MediConnect" className="header-logo" />

          <div className="header-title">
            <h2>MediConnect</h2>
            <span>Healthcare Platform</span>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#services">Services</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>

        <div className="header-right">
          <Link to="/login" className="login-link">Login</Link>

          <Link to="/signup" className="signup-btn">Sign Up Free</Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/*  MOBILE MENU */}
      {menuOpen && (
        <div className="mobile-menu">
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>

          <div className="mobile-auth">
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/signup" className="signup-btn" onClick={() => setMenuOpen(false)}>
              Sign Up Free
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Complete Healthcare Management at Your Fingertips
          </h1>

          <p className="hero-desc">
            Book appointments, access lab reports, receive digital prescriptions,
            and manage your medications with smart reminders – all in one seamless
            platform.
          </p>

          <Link to="/login">
            <button className="get-started-btn">
              Get Started <span className="arrow">→</span>
            </button>
          </Link>

          <ul className="hero-list">
            <li>No credit card required</li>
            <li>24/7 customer support</li>
            <li>Secure & HIPAA compliant</li>
          </ul>
        </div>

        <div className="hero-image-wrapper">
          <img src="/images/Doctor.jpg" alt="Healthcare" className="hero-image" />
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section" id="services">
        <div className="services-badge">Our Services</div>

        <h2 className="services-title">Everything You Need for Better Health</h2>
        
        <p className="services-subtitle">
          From booking appointments to managing medications, MediConnect brings all your healthcare
          needs under one roof
        </p>

        <div className="services-grid">
          {services.map((service, index) => (
            <div className="service-card" key={index}>
              <div className="service-icon" style={{ backgroundColor: service.color + "15" }}>
                <span style={{ color: service.color }}>{service.icon}</span>
              </div>

              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform features */}
      <section className="features-section" id="features">
      
        {/* Left Image Box */}
        <div className="features-image-wrapper">
          <img
            src="/images/corridor.jpg"
            alt="Hospital Corridor"
            className="features-image"
          />

          <div className="floating-label">
            <h4>Advanced Technology</h4>
            <span>100% Digital</span>
          </div>
        </div>

        {/* Right Content */}
        <div className="features-content">
          
          <div className="features-badge">Platform Features</div>

          <h2 className="features-title">
            Everything Connected, Everything Simple
          </h2>

          <p className="features-desc">
            MediConnect eliminates the complexity of healthcare management by
            connecting all healthcare providers on a single platform.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon blue">
                <FaShieldAlt />
              </div>
              <div>
                <h4>Secure Health Records</h4>
                <p>
                  All your medical data is encrypted and securely stored with
                  complete privacy protection.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon green">
                <FaBolt />
              </div>
              <div>
                <h4>Real-Time Updates</h4>
                <p>
                  Get instant notifications for appointments, reports,
                  prescriptions, and medication reminders.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon purple">
                <FaUsers />
              </div>
              <div>
                <h4>Multi-Party Coordination</h4>
                <p>
                  Seamless communication between patients, doctors, labs, and
                  pharmacies in one place.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon pink">
                <FaHeart />
              </div>
              <div>
                <h4>Complete Care Tracking</h4>
                <p>
                  Track your entire healthcare journey from consultation to
                  medication completion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
        
        {/* Platform Overview */}
      <section className="platform-overview" id="about">
        <div className="po-left">

          <div className="po-tag">Platform Overview</div>

          <h2 className="po-title">Complete Healthcare Ecosystem</h2>

          <p className="po-desc">
            MediConnect connects patients, doctors, laboratories, and pharmacies in one
            integrated platform. Every stakeholder plays a crucial role in delivering seamless
            healthcare.
          </p>

          <div className="po-list">

            <div className="po-item">
              <div className="po-icon blue"><FaUserAlt /></div>
              <div>
                <h3>Patients</h3>
                <p>
                  Book appointments, view lab reports, receive prescriptions, order medicines,
                  and get medication schedules with reminders.
                </p>
              </div>
            </div>

            <div className="po-item">
              <div className="po-icon green"><FaUserMd /></div>
              <div>
                <h3>Doctors</h3>
                <p>
                  Manage appointments, access patient history, view lab reports, and provide
                  digital prescriptions directly through the platform.
                </p>
              </div>
            </div>

            <div className="po-item">
              <div className="po-icon purple"><FaPills /></div>
              <div>
                <h3>Pharmacies</h3>
                <p>
                  Receive prescriptions, process medicine orders, provide medications, and
                  create personalized medication timetables for patients.
                </p>
              </div>
            </div>

            <div className="po-item">
              <div className="po-icon orange"><FaFlask /></div>
              <div>
                <h3>Laboratories</h3>
                <p>
                  Upload test results, share reports with doctors and patients, and maintain a
                  digital archive of all medical tests.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Right image + card */}
        <div className="po-right">
          <div className="po-image-box">
            <img src="/images/Operation.jpg" alt="Healthcare" />

            <div className="po-floating-card">
              <h4>Patients</h4>
              <p>
                Book appointments, view lab reports, receive prescriptions, order medicines,
                and get medication schedules with reminders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="howitworks-container">
        <div className="hiw-badge">How It Works</div>

        <h2 className="hiw-title">Seamless Healthcare Journey</h2>
        <p className="hiw-subtitle">
          From appointment to medication management, every step is connected and streamlined for
          your convenience
        </p>

        {/* Steps Grid */}
        <div className="hiw-grid">
          {steps.map((step, index) => (
            <div key={index} className="hiw-card">
              <div className="hiw-number">{step.number}</div>

              <div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>

              {/* Arrow under each row item */}
              {(index === 0 || index === 1 || index === 2) && (
                <div className="hiw-arrow">↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Medication Box*/}
      <section className="med-box">
        <div className="med-left">
          <h2>Personalized Medication Timetable</h2>

          <p className="med-description">
            Your pharmacy doesn't just provide medicine – they create a detailed
            medication schedule tailored to your prescription. Never miss a dose
            with our smart reminder system.
          </p>

          <ul className="med-list">
            <li>Morning, afternoon, and evening reminders</li>
            <li>Before or after meal instructions</li>
            <li>Dosage and duration tracking</li>
            <li>Automatic refill reminders</li>
          </ul>
        </div>

        <div className="med-right">
          <img src="/images/Medicine.jpg" alt="Medication" />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">

          {/* Logo + About */}
          <div className="footer-col">
            <div className="footer-logo-box">
              <div className="footer-logo-icon"><img src="/images/Logo.png" alt="MediConnect"/></div>
              <div>
                <h3 className="footer-logo-title">MediConnect</h3>
                <p className="footer-logo-sub">Healthcare Platform</p>
              </div>
            </div>

            <p className="footer-desc">
              Your complete healthcare solution — from appointments to medications, 
              all in one place.
            </p>

            <div className="footer-social">
              <FaFacebookF />
              <FaTwitter />
              <FaInstagram />
              <FaLinkedinIn />
            </div>
          </div>

          {/* Services */}
          <div className="footer-col">
            <h4 className="footer-heading">Services</h4>
            <ul>
              <li>Book Appointments</li>
              <li>Lab Reports</li>
              <li>Digital Prescriptions</li>
              <li>Online Pharmacy</li>
              <li>Medicine Reminders</li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h4 className="footer-heading">Company</h4>
            <ul>
              <li>About Us</li>
              <li>Our Doctors</li>
              <li>Careers</li>
              <li>Blog</li>
              <li>Press Kit</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="footer-heading">Contact Us</h4>

            <p className="footer-contact-item">
              <FaEnvelope /> support@mediconnect.com
            </p>

            <p className="footer-contact-item">
              <FaPhoneAlt /> +98 (800) 123-4567<br />
              <span className="footer-small">Mon–Fri 9am–6pm EST</span>
            </p>

            <p className="footer-contact-item">
              <FaMapMarkerAlt /> 123 Healthcare Avenue<br />
              Kathmandu,Nepal
            </p>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="footer-bottom">
          <p>© 2025 MediConnect. All rights reserved.</p>
          <div className="footer-bottom-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Cookie Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
