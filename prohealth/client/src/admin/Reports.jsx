import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, Spinner, fmtDate, money, useLoad } from '../ui.jsx';

const MONEY = ['total', 'revenue', 'value']; const DATES = ['date', 'expiry'];
const cell = (k, v) => k === 'status' ? <Badge status={v} /> : MONEY.includes(k) ? money(v) : k === 'created' ? fmtDate(v) : DATES.includes(k) ? fmtDate(v, false) : String(v);

export default function Reports() {
  useHeader('Reports', 'Filter, sort, print or export');
  const [sp, setSp] = useSearchParams(); const { me } = useApp(); const ph = me?.pharmacy ?? {};
  const params = { type: sp.get('type') ?? 'sales', from: sp.get('from') ?? '', to: sp.get('to') ?? '', sort: sp.get('sort') ?? '', dir: sp.get('dir') ?? '' };
  const { data, error, loading } = useLoad(() => api.get('/api/admin/reports' + qs(params)), [sp.toString()]);
  const [f, setF] = useState(params);
  useEffect(() => { if (data) setF({ type: data.type, from: data.from ?? '', to: data.to ?? '', sort: data.sort, dir: data.dir }); }, [data]);
  const apply = (e) => { e.preventDefault(); setSp(Object.fromEntries(Object.entries(f).filter(([, v]) => v))); };
  const sortBy = (k) => setSp({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), sort: k, dir: data.sort === k && data.dir === 'desc' ? 'asc' : 'desc' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const typeChange = (e) => setF({ type: e.target.value, from: f.from, to: f.to, sort: '', dir: '' });
  return (
    <>
      <form className="card card-body mb-3 d-print-none" onSubmit={apply}><div className="row g-2 align-items-end">
        <div className="col-md-3"><label className="form-label" htmlFor="type">Report</label><select className="form-select" id="type" value={f.type} onChange={typeChange}>{Object.entries(data?.types ?? { sales: 'Daily sales' }).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        {data?.from && <><div className="col-md-2"><label className="form-label" htmlFor="from">From</label><input className="form-control" type="date" id="from" value={f.from} onChange={set('from')} /></div>
          <div className="col-md-2"><label className="form-label" htmlFor="to">To</label><input className="form-control" type="date" id="to" value={f.to} onChange={set('to')} /></div></>}
        <div className="col-md-2"><label className="form-label" htmlFor="sort">Sort by</label><select className="form-select" id="sort" value={f.sort} onChange={set('sort')}>{data && Object.entries(data.cols).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="col-md-2"><label className="form-label" htmlFor="dir">Order</label><select className="form-select" id="dir" value={f.dir} onChange={set('dir')}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>
        <div className="col"><button className="btn btn-primary">Generate</button></div></div></form>
      <ErrorBox error={error} />{loading && !data ? <Spinner /> : data && (
        <div className="card"><div className="card-body">
          <div className="report-head"><img className="report-logo" src="/prohealth-mark.svg" alt="ProHealth pharmacy mark" /><div><strong>{ph.name}</strong><br />{ph.address} &middot; {ph.phone}</div></div>
          <div className="d-flex justify-content-between flex-wrap mb-3 align-items-start"><div><h2 className="h5 mb-0">{data.title}</h2>
            <small className="text-muted">{data.from ? `${fmtDate(data.from, false)} to ${fmtDate(data.to, false)} · ` : ''}Generated {fmtDate(new Date().toISOString().slice(0, 16).replace('T', ' '))} by {data.generatedBy}</small></div>
            <div className="d-print-none"><a className="btn btn-outline-secondary btn-sm me-1" href={`/api/admin/reports${qs({ ...params, sort: data.sort, dir: data.dir, export: 'csv' })}`}><i className="fa-solid fa-file-csv me-1" />CSV</a>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}><i className="fa-solid fa-print me-1" />Print / PDF</button></div></div>
          <div className="table-responsive"><table className="table table-sm align-middle"><thead><tr>{Object.entries(data.cols).map(([k, l]) => <th key={k}><a href="#sort" className="text-decoration-none text-reset" onClick={(e) => { e.preventDefault(); sortBy(k); }}>{l}{data.sort === k ? (data.dir === 'desc' ? ' ↓' : ' ↑') : ''}</a></th>)}</tr></thead>
            <tbody>{data.rows.map((r, i) => <tr key={i}>{Object.keys(data.cols).map((k) => <td key={k}>{cell(k, r[k])}</td>)}</tr>)}
              {!data.rows.length && <tr><td colSpan={Object.keys(data.cols).length} className="text-center text-muted py-4">No data for these filters.</td></tr>}</tbody></table></div>
          <p className="fw-semibold mb-0">{data.summary}</p>
        </div></div>)}
    </>);
}
