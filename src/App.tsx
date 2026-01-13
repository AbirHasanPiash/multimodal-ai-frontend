import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardLayout from "./layouts/DashboardLayout";
import ChatPage from "./pages/ChatPage";
import BillingPage from "./pages/BillingPage";
import HistoryPage from "./pages/HistoryPage";
import { ChatResetProvider } from "./context/ChatResetContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatResetProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ChatPage />} />
              <Route path="chat/:chatId" element={<ChatPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="billing" element={<BillingPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ChatResetProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
