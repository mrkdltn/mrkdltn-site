#!/usr/bin/env python3
"""Find each school's 20 similar schools for the Attendance Explorer. Needs numpy.

Run by hand after a new school-level absence release or a new census (not part of the Cloudflare build):
  python3 scripts/model_attendance.py
Reads data/raw/attendance/{school_absence,schools,school_context}.csv; writes school_model.csv and model.json there.

Primary and secondary schools only. Special schools are left out: what a special school provides for shapes its
attendance far more than the context measured here.

Similar schools: the 20 nearest schools of the same phase by weighted squared distance over: free school meal
eligibility, first language other than English, SEN support, education, health and care plans, school size (log
pupils), rural setting and, for secondaries, selective admissions. Each factor is standardised by its standard
deviation and weighted by how strongly it goes with overall absence across schools (the size of its standardised
coefficient in a fractional logit of the newest autumn-and-spring rates). Region and ethnicity are never used.
This is our own match, not the DfE's.

No expected rate is published (Mark, 23 November 2026): the regression is used only to set the weights, and its
predictions are not written out.
"""
import csv, json, os
import numpy as np

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'raw', 'attendance')
FACTORS = ['fsm_pct', 'eal_pct', 'sen_pct', 'ehcp_pct', 'log_pupils', 'rural', 'selective']
LABELS = {'fsm_pct': 'Eligible for free school meals', 'eal_pct': 'First language other than English', 'sen_pct': 'SEN support',
          'ehcp_pct': 'Education, health and care plans', 'log_pupils': 'School size', 'rural': 'Rural setting', 'selective': 'Selective admissions'}
K = 20


def fraclogit(X, y, iters=60):
    b = np.zeros(X.shape[1])
    for _ in range(iters):
        mu = 1 / (1 + np.exp(-X @ b))
        w = np.clip(mu * (1 - mu), 1e-9, None)
        z = X @ b + (y - mu) / w
        nb = np.linalg.solve(X.T @ (X * w[:, None]), X.T @ (w * z))
        if np.max(np.abs(nb - b)) < 1e-10:
            b = nb
            break
        b = nb
    return b


def main():
    rd = lambda n: list(csv.DictReader(open(os.path.join(RAW, n), encoding='utf-8')))
    absn = rd('school_absence.csv')
    for r in absn:      # the file holds counts; the match needs the overall rate, in hundredths of a point
        r['abs'] = str(round(10000 * int(r['missed']) / int(r['poss']))) if r['missed'] != '' and r['poss'] not in ('', '0') else ''
    latest = max(r['period'] for r in absn if r['period'].endswith('AS'))
    A = {r['urn']: r for r in absn if r['period'] == latest and r['abs'] != '' and int(r['enrol']) >= 10}
    M = {r['urn']: r for r in rd('schools.csv')}
    C = {r['urn']: r for r in rd('school_context.csv')}
    out, model = [], {'period': latest, 'k': K, 'phases': {}}
    for ph in 'PS':
        fac = [f for f in FACTORS if f != 'selective' or ph == 'S']
        urns, rows = [], []
        for u, a in A.items():
            c = C.get(u)
            if M[u]['phase'] != ph or not c or any(c[k] == '' for k in ('fsm_pct', 'eal_pct', 'sen_pct', 'ehcp_pct')):
                continue
            v = {k: float(c[k]) for k in ('fsm_pct', 'eal_pct', 'sen_pct', 'ehcp_pct', 'rural', 'selective')}
            v['log_pupils'] = float(np.log(max(10, int(a['enrol']))))
            urns.append(u); rows.append([v[f] for f in fac])
        F = np.array(rows); n = np.array([int(A[u]['enrol']) for u in urns])
        mean, sd = F.mean(0), F.std(0)
        Z = (F - mean) / sd
        X = np.column_stack([np.ones(len(Z)), Z])
        med = float(np.median(n))
        y = np.array([int(A[u]['abs']) for u in urns]) / 10000
        b = fraclogit(X, y)
        w = np.abs(b[1:]); w = w / w.sum()
        Zw = Z * np.sqrt(w)
        nn = []
        for i in range(0, len(Zw), 500):
            d = ((Zw[i:i + 500, None, :] - Zw[None, :, :]) ** 2).sum(2)
            d[np.arange(d.shape[0]), np.arange(i, i + d.shape[0])] = np.inf
            nn.extend(np.argpartition(d, K, axis=1)[:, :K].tolist())
        for i, u in enumerate(urns):
            out.append([u, ' '.join(sorted((urns[j] for j in nn[i]), key=int))])
        model['phases'][ph] = {'n': len(urns), 'median_enrol': med, 'factors': fac, 'labels': [LABELS[f] for f in fac],
                               'mean': mean.round(4).tolist(), 'weights': w.round(3).tolist()
                               }
        print(ph, len(urns), 'schools; weights', dict(zip(fac, [float(x) for x in w.round(2)])))
    with open(os.path.join(RAW, 'school_model.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['urn', 'nn'])
        w.writerows(sorted(out, key=lambda r: int(r[0])))
    json.dump(model, open(os.path.join(RAW, 'model.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
