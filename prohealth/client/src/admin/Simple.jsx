import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { ErrorBox, Spinner, confirmThen, useLoad } from '../ui.jsx';

/** One screen for list + add/edit form, used by categories and suppliers. */
function Crud({ title, base, fields, blank, columns, search }) {
  useHeader(title); const { flash } = useApp(); const [q, setQ] = useState(''); const [edit, setEdit] = useState(null); const [f, setF] = useState(blank);
  const { data, error, loading, reload } = useLoad(() => api.get(`${base}${search ? `?q=${encodeURIComponent(q)}` : ''}`), [q]);
  useEffect(() => setF(edit ? Object.fromEntries(Object.keys(blank).map((k) => [k, edit[k] ?? ''])) : blank), [edit]); // eslint-disable-line
  const idKey = Object.keys(data?.[0] ?? edit ?? {})[0];
  const save = async (e) => { e.preventDefault(); try { edit ? await api.put(`${base}/${edit[idKey]}`, f) : await api.post(base, f); flash('success', 'Saved.'); setEdit(null); setF(blank); reload(); } catch (x) { flash('danger', x.message); window.scrollTo(0, 0); } };
  const del = (r) => confirmThen('Delete this record?', async () => { try { await api.del(`${base}/${r[idKey]}`); flash('success', 'Deleted.'); reload(); } catch (x) { flash('warning', x.message); } });
  return (
    <div className="row g-4"><div className="col-lg-7">
      {search && <form className="mb-3 d-flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(e.currentTarget.q.value); }}><input className="form-control" name="q" placeholder="Search suppliers" aria-label="Search" /><button className="btn btn-primary">Search</button></form>}
      <ErrorBox error={error} />{loading && !data ? <Spinner /> : data && <div className="card"><table className="table align-middle mb-0"><thead><tr>{columns.map((c) => <th key={c.h}>{c.h}</th>)}<th /></tr></thead><tbody>
        {data.map((r) => <tr key={r[idKey]}>{columns.map((c) => <td key={c.h} className={c.cls}>{c.v(r)}</td>)}<td className="text-end text-nowrap"><button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEdit(r)}>Edit</button><button className="btn btn-sm btn-outline-danger" aria-label="Delete" onClick={del(r)}><i className="fa-solid fa-trash" /></button></td></tr>)}
        {!data.length && <tr><td colSpan={columns.length + 1} className="text-center text-muted py-4">Nothing found.</td></tr>}</tbody></table></div>}
    </div>
    <div className="col-lg-5"><form className="card card-body" onSubmit={save} noValidate><h2 className="h6">{edit ? 'Edit' : 'Add'}</h2>
      {fields.map(([k, l]) => <div key={k}><label className="form-label" htmlFor={k}>{l}</label><input className="form-control mb-3" id={k} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
      <div className="d-flex gap-2"><button className="btn btn-primary">Save</button>{edit && <button type="button" className="btn btn-link" onClick={() => setEdit(null)}>Cancel</button>}</div></form></div></div>);
}
export const Categories = () => <Crud title="Categories" base="/api/admin/categories" blank={{ name: '', description: '' }} fields={[['name', 'Name'], ['description', 'Description']]}
  columns={[{ h: 'Name', v: (r) => r.name, cls: 'fw-semibold' }, { h: 'Description', v: (r) => r.description, cls: 'text-muted small' }, { h: 'Medicines', v: (r) => r.n }]} />;
export const Suppliers = () => <Crud title="Suppliers" base="/api/admin/suppliers" search blank={{ name: '', phone: '', email: '', address: '' }} fields={[['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address']]}
  columns={[{ h: 'Supplier', v: (r) => <>{r.name}<div className="small text-muted fw-normal">{r.address}</div></>, cls: 'fw-semibold' }, { h: 'Contact', v: (r) => <>{r.phone}<br />{r.email}</>, cls: 'small' }]} />;
