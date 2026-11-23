#!/usr/bin/env python3
"""Fit the Attendance Explorer's contextual model and find each school's similar schools. Needs numpy.

Run by hand after a new school-level absence release or a new census (not part of the Cloudflare build):
  python3 scripts/model_attendance.py
Reads data/raw/attendance/{school_absence,schools,school_context}.csv; writes school_model.csv and model.json there.

Primary and secondary schools only. Special schools are left out: what a special school provides for shapes its
attendance far more than the context measured here, so an expected rate would mislead.

Expected rate: a fractional logit (logit link, fitted by iteratively reweighted least squares), one per phase and
measure, of the school's rate in the newest autumn-and-spring period on: free school meal eligibility, first language
other than English, SEN support, education, health and care plans, school size (log pupils), rural setting and, for
secondaries, selective admissions. Bounded between 0 and 100% by construction. Region is left out so that regional
differences stay visible. Ethnicity is never used.

"In line" band: base x sqrt(median enrolments / enrolments), the scaling held between 0.6 and 2. The base is set so
that half of schools fall inside their band.

Similar schools: the 20 nearest schools of the same phase by weighted squared distance over the same factors, each
standardised by its standard deviation and weighted by the size of its standardised coefficient in the overall
absence model, so the factors that matter most for absence count most. This is our own match, not the DfE's.
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
        med = float(np.median(n)); scale = np.clip(np.sqrt(med / n), 0.6, 2.0)
        res = {}
        for m in ('abs', 'pa'):
            y = np.array([int(A[u][m]) for u in urns]) / 10000
            b = fraclogit(X, y)
            mu = 1 / (1 + np.exp(-X @ b))
            assert mu.min() >= 0 and mu.max() <= 1
            r = (y - mu) * 100
            base = float(np.median(np.abs(r) / scale))
            res[m] = {'b': b, 'mu': mu, 'band': base * scale, 'base': base,
                      'r2': float(1 - np.sum((y - mu) ** 2) / np.sum((y - y.mean()) ** 2)), 'resid_sd': float(r.std())}
        w = np.abs(res['abs']['b'][1:]); w = w / w.sum()
        Zw = Z * np.sqrt(w)
        nn = []
        for i in range(0, len(Zw), 500):
            d = ((Zw[i:i + 500, None, :] - Zw[None, :, :]) ** 2).sum(2)
            d[np.arange(d.shape[0]), np.arange(i, i + d.shape[0])] = np.inf
            nn.extend(np.argpartition(d, K, axis=1)[:, :K].tolist())
        for i, u in enumerate(urns):
            out.append([u, round(res['abs']['mu'][i] * 10000), round(res['pa']['mu'][i] * 10000), round(res['abs']['band'][i] * 100),
                        round(res['pa']['band'][i] * 100), ' '.join(sorted((urns[j] for j in nn[i]), key=int))])
        model['phases'][ph] = {'n': len(urns), 'median_enrol': med, 'factors': fac, 'labels': [LABELS[f] for f in fac],
                               'mean': mean.round(4).tolist(), 'sd': sd.round(4).tolist(), 'weights': w.round(3).tolist(),
                               **{m: {'coef': res[m]['b'].round(5).tolist(), 'base': round(res[m]['base'], 2), 'r2': round(res[m]['r2'], 3),
                                      'resid_sd': round(res[m]['resid_sd'], 2)} for m in ('abs', 'pa')}}
        print(ph, len(urns), 'schools;', {m: (model['phases'][ph][m]['r2'], model['phases'][ph][m]['base']) for m in ('abs', 'pa')},
              'weights', dict(zip(fac, w.round(2))))
    with open(os.path.join(RAW, 'school_model.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['urn', 'exp_abs', 'exp_pa', 'band_abs', 'band_pa', 'nn'])
        w.writerows(sorted(out, key=lambda r: int(r[0])))
    json.dump(model, open(os.path.join(RAW, 'model.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
