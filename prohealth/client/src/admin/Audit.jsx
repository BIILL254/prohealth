import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useHeader } from '../layouts.jsx';
import { ErrorBox, Pagination, Spinner, fmtDate, useLoad } from '../ui.jsx';

export default function Audit() {
  const [sp, setSp] = useSearchParams(); const p = { q: sp.get('q') ?? '', action: sp.get('action') ?? '', from: sp.get('from') ?? '', to: sp.get('to') ?? '', page: sp.get('page') ?? '' }; const [f, setF] = useState(p);
  const { data, error, loading } = useLoad(() => api.get('/api/admin/audit' + qs(p)), [sp.toString()]);
  useHeader('Audit log', data ? `${data.total} recorded actions` : '');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); setSp(Object.fromEntries(Object.entries({ ...f, page: '' }).filter(([, v]) => v))); }}>
        <div className="col-md-3"><input className="form-control" placeholder="User, detail or IP" aria-label="Search" value={f.q} onChange={set('q')} /></div>
        <div className="col-md-2"><select className="form-select" aria-label="Action" value={f.action} onChange={set('action')}><option value="">All actions</option>{data?.actions.map((a) => <option key={a}>{a}</option>)}</select></div>
        <div className="col-md-2"><input className="form-control" type="date" aria-label="From" value={f.from} onChange={set('from')} /></div><div className="col-md-2"><input className="form-control" type="date" aria-label="To" value={f.to} onChange={set('to')} /></div>
        <div className="col-auto"><button className="btn btn-primary">Filter</button> <a className="btn btn-outline-secondary" href={`/api/admin/audit${qs({ ...p, page: '', export: 'csv' })}`}>CSV</a></div></form>
      <ErrorBox error={error} />{loading && !data ? <Spinner /> : data && (<><div className="card"><div className="table-responsive"><table className="table table-sm align-middle mb-0"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th><th>IP</th></tr></thead><tbody>
        {data.rows.map((l) => <tr key={l.log_id}><td className="text-nowrap small">{fmtDate(l.created_at)}</td><td>{l.full_name ?? '(system)'}</td><td><code>{l.action}</code></td><td className="small">{l.table_name} {l.record_id ? `#${l.record_id}` : ''}</td><td className="small">{l.details}</td><td className="small text-muted">{l.ip_address}</td></tr>)}
        {!data.rows.length && <tr><td colSpan={6} className="text-center text-muted py-4">No entries match.</td></tr>}</tbody></table></div></div><div className="mt-3"><Pagination pages={data.pages} page={data.page} /></div></>)}
    </>);
}
