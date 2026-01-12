import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginSignup from './view/auth/LoginSignup/LoginSignUp';
import MainContainer from './view/MainContainer/MainContainer';
// import Landing from './view/auth/LandingPage/Landing'

const isLoggedIn = () => !!localStorage.getItem('token');

// PublicRoute: For routes like login/signup, redirect to dashboard if logged in
function PublicRoute({ children }) {
  return isLoggedIn() ? <Navigate to="/dashboard" replace /> : children;
}

// PrivateRoute: For protected routes like dashboard, redirect to login if NOT logged in
function PrivateRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        /> */}
        <Route
        path="/"
        element={
          <PublicRoute>
            <LoginSignup />
          </PublicRoute>
        }
        />

        {/* Private routes */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainContainer/>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
