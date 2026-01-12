import React from 'react'
import Sidebar from './Sidebar/Sidebar'
import Nav from '../../Components/NavBar/nav'
import { ToastContainer } from 'react-toastify'
import './layout.css'

const Layout = ({ children }) => {
  return (
    <>
      <div className="d-flex layout-container">
        <div className="side-bar-container">
          <Sidebar />
        </div>
        <div className="flex-grow-1 content-box">
          <Nav />
          <div className="p-3">
             {children}
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  )
}

export default Layout
