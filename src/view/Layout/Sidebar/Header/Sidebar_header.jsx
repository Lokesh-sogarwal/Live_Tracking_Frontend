import React from 'react'
import myimage from '../../../../Assets/logo.png';
import './header.css';

const Sidebar_header = () => {
  return (
    <div className="header-logo">
      <img src={myimage} alt="logo" width={65} />
      <span>Gowheeler</span>
    </div>
  )
}

export default Sidebar_header;
