import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './services/auth';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import ChargedToday from './pages/ChargedToday';
import MonthlyRegister from './pages/MonthlyRegister';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';
import LogCharge from './pages/LogCharge';
import Recovery from './pages/Recovery';
import ConnectSync from './pages/ConnectSync';
import Cable from './pages/Cable';
import CableDetail from './pages/CableDetail';
import CashBook from './pages/CashBook';
import Invoices from './pages/Invoices';
import Quotations from './pages/Quotations';
import Reports from './pages/Reports';
import Topups from './pages/Topups';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import DealerConsole from './pages/DealerConsole';
import Landing from './pages/Landing';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public marketing landing (shown before login) */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/charged-today" element={<ChargedToday />} />
          <Route path="/monthly" element={<MonthlyRegister />} />
          <Route path="/log" element={<LogCharge />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/customers/:id/edit" element={<CustomerForm />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/connect-sync" element={<ConnectSync />} />
          <Route path="/cable" element={<Cable />} />
          <Route path="/cable/:id" element={<CableDetail />} />
          <Route path="/cashbook" element={<CashBook />} />
          <Route path="/topups" element={<Topups />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/reports" element={<Reports />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/console" element={<DealerConsole />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
