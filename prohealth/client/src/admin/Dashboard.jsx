import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, Spinner, money, useLoad } from '../ui.jsx';

export default function Dashboard() {
  useHeader('Dashboard', 'What needs attention today');
  const { data, error, loading } = useLoad(() => api.get('/api/admin/dashboard'), []);
  if (loading) return <Spinner />; if (error) return <ErrorBox error={error} />;
  const { kpi, week, recent } = data; const max = Math.max(1, ...week.map((w) => Number(w.total)));
  const cards = [['Sales today', money(kpi.today), 'fa-sack-dollar', 'success', '/admin/reports'], ['Open orders', kpi.openOrders, 'fa-bag-shopping', 'primary', '/admin/orders'], ['Prescriptions to check', kpi.rx, 'fa-file-prescription', 'warning', '/admin/prescriptions'],
    ['Low or out of stock', kpi.low, 'fa-triangle-exclamation', 'danger', '/admin/inventory?filter=low'], ['Expiring in 60 days', kpi.expiring, 'fa-hourglass-half', 'warning', '/admin/inventory?filter=expiring']];
  return (
    <>
      <div className="row g-3 mb-4">{cards.map(([l, v, i, c, to]) => (
        <div className="col-6 col-xl" key={l}><Link className="stat-card text-decoration-none" to={to}><span className={`stat-icon bg-${c}-subtle text-${c}-emphasis`}><i className={`fa-solid ${i}`} /></span><div><div className="stat-value">{v}</div><div className="stat-label">{l}</div></div></Link></div>))}</div>
      <div className="row g-4">
        <div className="col-lg-6"><div className="card card-body"><h2 className="h6 mb-3">Sales, last 7 days</h2>
          <div className="bar-chart" role="img" aria-label="Sales for the last seven days">{week.map((w) => <div className="bar-col" key={w.day}><div className="bar" style={{ height: `${Math.round((w.total / max) * 100)}%` }} title={money(w.total)} /><small>{new Date(w.day + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</small></div>)}</div></div></div>
        <div className="col-lg-6"><div className="card"><div className="card-header">Recent orders</div><div className="table-responsive"><table className="table align-middle mb-0"><tbody>
          {recent.map((o) => <tr key={o.order_id}><td><Link to={`/admin/orders/${o.order_id}`}>#{o.order_id}</Link></td><td>{o.full_name}</td><td>{money(o.total_amount)}</td><td><Badge status={o.status} /></td></tr>)}
          {!recent.length && <tr><td className="text-muted p-3">No orders yet.</td></tr>}</tbody></table></div></div></div>
      </div>
    </>);
}
