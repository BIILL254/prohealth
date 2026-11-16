import { Route, Routes } from 'react-router-dom';
import { AdminLayout, AdminOnly, FrontLayout, RequireLogin } from './layouts.jsx';
import { Link } from './ui.jsx';
import Home from './front/Home.jsx';
import { Medicines, MedicineDetail } from './front/Catalogue.jsx';
import Cart from './front/Cart.jsx';
import Checkout from './front/Checkout.jsx';
import { PayOrder, PaymentWait } from './front/Pay.jsx';
import { Orders, OrderDetail } from './front/Orders.jsx';
import { Login, Register, Forgot, Reset } from './front/Auth.jsx';
import Profile from './front/Profile.jsx';
import Help from './front/Help.jsx';
import AdminLogin from './admin/Login.jsx';
import Dashboard from './admin/Dashboard.jsx';
import { AdminOrders, AdminOrderDetail } from './admin/Orders.jsx';
import AdminPrescriptions from './admin/Prescriptions.jsx';
import Inventory from './admin/Inventory.jsx';
import AdminMedicines from './admin/Medicines.jsx';
import { Categories, Suppliers } from './admin/Simple.jsx';
import Users from './admin/Users.jsx';
import Reports from './admin/Reports.jsx';
import Audit from './admin/Audit.jsx';
import Security from './admin/Security.jsx';

const NotFound = () => <div className="card card-body text-center py-5"><i className="fa-solid fa-map-location-dot fs-1 text-muted mb-3" /><h1 className="h4">Page not found</h1><p className="text-muted">The page you are looking for does not exist.</p><div><Link className="btn btn-primary" to="/">Go to the home page</Link></div></div>;

export default function App() {
  return (
    <Routes>
      <Route element={<FrontLayout />}>
        <Route index element={<Home />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="medicines/:id" element={<MedicineDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<Forgot />} />
        <Route path="reset-password" element={<Reset />} />
        <Route path="help" element={<Help />} />
        <Route element={<RequireLogin />}>
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/pay" element={<PayOrder />} />
          <Route path="orders/:id/waiting" element={<PaymentWait />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="prescriptions" element={<AdminPrescriptions />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="medicines" element={<AdminMedicines />} />
        <Route path="categories" element={<Categories />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="security" element={<Security />} />
        <Route element={<AdminOnly />}><Route path="users" element={<Users />} /><Route path="audit" element={<Audit />} /></Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>);
}
