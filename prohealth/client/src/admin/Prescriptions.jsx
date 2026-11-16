import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, Spinner, fmtDate, useLoad } from '../ui.jsx';

export default function AdminPrescriptions() {
  useHeader('Prescriptions', 'Check each prescription before the customer can pay');
  const [sp, setSp] = useSearchParams(); const status = sp.get('status') ?? 'pending'; const { flash } = useApp(); const [notes, setNotes] = useState({});
  const { data, error, loading, reload } = useLoad(() => api.get(`/api/admin/prescriptions?status=${status}`), [status]);
  const review = async (id, decision) => { try { await api.post(`/api/admin/prescriptions/${id}/review`, { decision, notes: notes[id] ?? '' }); flash('success', 'Prescription reviewed.'); reload(); } catch (e) { flash('danger', e.message); } };
  return (
    <>
      <div className="btn-group mb-3">{[['pending', 'To check'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => <button key={k} className={`btn btn-outline-primary${status === k ? ' active' : ''}`} onClick={() => setSp({ status: k })}>{l}</button>)}</div>
      <ErrorBox error={error} />{loading && !data && <Spinner />}
      {data && !data.length && <div className="card card-body text-center text-muted py-5">Nothing here.</div>}
      <div className="row g-3">{data?.map((p) => (
        <div className="col-lg-6" key={p.prescription_id}><div className="card card-body">
          <div className="d-flex justify-content-between"><div><strong>{p.full_name}</strong><div className="small text-muted">Uploaded {fmtDate(p.uploaded_at)}{p.order_id ? ` · order #${p.order_id}` : ''}</div></div><Badge status={p.status} /></div>
          <a className="btn btn-outline-secondary btn-sm my-3 align-self-start" target="_blank" rel="noopener" href={`/api/prescriptions/${p.prescription_id}/file`}><i className="fa-solid fa-file-lines me-1" />View prescription file</a>
          {p.status === 'pending' ? (<div>
            <input className="form-control mb-2" placeholder="Note to customer (required if rejecting)" aria-label="Note" value={notes[p.prescription_id] ?? ''} onChange={(e) => setNotes({ ...notes, [p.prescription_id]: e.target.value })} />
            <div className="d-flex gap-2"><button className="btn btn-success" onClick={() => review(p.prescription_id, 'approve')}>Approve</button><button className="btn btn-outline-danger" onClick={() => review(p.prescription_id, 'reject')}>Reject</button></div></div>
          ) : <div className="small text-muted">Reviewed by {p.reviewer} on {fmtDate(p.reviewed_at)}{p.reviewer_notes ? ` · ${p.reviewer_notes}` : ''}</div>}
        </div></div>))}</div>
    </>);
}
