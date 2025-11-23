import { NavLink } from 'react-router-dom';

export default function Navbar(){
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="brand"><a href="/">ImageUpLift</a></div>
        <div className="nav-links">
          <NavLink to="/convert">Convert</NavLink>
          <NavLink to="/gallery">Gallery</NavLink>
          {/* <NavLink to="/api-docs">API Docs</NavLink> */}
          <NavLink to="/analytics">Analytics</NavLink>
        </div>
        <div className="profile">
          <div className="avatar" />
          <span>Profile name</span>
        </div>
      </div>
    </nav>
  );
}
