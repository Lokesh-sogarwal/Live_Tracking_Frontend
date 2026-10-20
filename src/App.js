import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from './view/auth/LoginSignup/LoginSignUp';
import Signup from './view/auth/LoginSignup/Signup';
import MainContainer from './view/MainContainer/MainContainer';
import Landing from './view/auth/LandingPage/Landing';
import ForgotPassword from './view/auth/Password/ForgotPassword';
import ResetPassword from './view/auth/Password/ResetPassword';
import ChangePassword, { mustChangePassword } from './view/auth/Password/ChangePassword';
import Explore from './view/auth/LandingPage/Explore';
import ApplicationDashboard, { APPLICATION_TOKEN_KEY } from './view/Onboarding/ApplicationDashboard';

const isLoggedIn = () => !!localStorage.getItem('token');

// PublicRoute: For routes like login/signup, redirect to dashboard if logged in
function PublicRoute({ children }) {
  return isLoggedIn() ? <Navigate to="/dashboard" replace /> : children;
}

// PrivateRoute: For protected routes like dashboard, redirect to login if NOT logged in.
// A temporary password (set by an administrator) must be replaced before anything else.
// Logged-out visitors are asked to sign in only here, and come back to where they were going.
function PrivateRoute({ children }) {
  const location = useLocation();
  if (!isLoggedIn()) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return mustChangePassword() ? <Navigate to="/change-password" replace /> : children;
}

// Applicants hold a scoped application token instead of a user session. Checked at route
// time (a component), not when App first renders.
function ApplicationRoute({ children }) {
  return localStorage.getItem(APPLICATION_TOKEN_KEY) ? children : <Navigate to="/login" replace />;
}

// Signed-in only, but outside the app shell (which would call APIs the server refuses
// until the password is changed).
function SignedInRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* Public: routes and timetable, no account needed. */}
        <Route path="/explore" element={<Explore />} />

        {/* Driver/operator applicants (scoped application token, not a user session). */}
        <Route
          path="/application"
          element={
            <ApplicationRoute>
              <ApplicationDashboard />
            </ApplicationRoute>
          }
        />

        {/* Opened from the emailed link; works whether or not someone is signed in. */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/change-password"
          element={
            <SignedInRoute>
              <ChangePassword />
            </SignedInRoute>
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
