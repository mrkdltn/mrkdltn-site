#!/usr/bin/env python3
"""Tests for scripts/analysis/inspection_consistency.py, on SYNTHETIC data only (no inspector code is read).

  python3 scripts/analysis/test_inspection_consistency.py          about 3 minutes on 4 cores
  python3 scripts/analysis/test_inspection_consistency.py -q        the fast checks only (seconds)

What is checked:
  - the maximum-likelihood fit (used for the permutation benchmark) recovers a known inspector SD of 0 and 0.5;
  - the PyMC model recovers a known SD of 0 and 0.5, with converged chains, and the MOR reading follows;
  - the permutation benchmark puts the observed SD near the middle when the true SD is 0, and at the top when it is 0.5;
  - shuffling keeps every code's number of reports within each region x month x phase stratum;
  - the derived figures (MOR, ICC, MOR bands with the whole-interval rule) are computed as pre-registered;
  - the events rule stops a model when there are too few schools below Expected;
  - the output check refuses any code, URN, inspector-level list or cell of fewer than 10 schools;
  - the corpus guard refuses without a cut-off, with a future cut-off, below 95% coverage, or without --confirm-complete;
  - an end-to-end synthetic run writes files that hold no code and no URN.
"""
import json, math, os, sys, tempfile, time, unittest

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import inspection_consistency as ic  # noqa: E402

QUICK = '-q' in sys.argv
if QUICK:
    sys.argv.remove('-q')


def ml_on(df, area='g_ach', thr=5):
    d, _ = ic.model_frame(df, area, ic.MAIN_PHASES)
    X, y, _ = ic.design(d, 'region+month')
    g, J, _ = ic.groups(d['code'], thr)
    return ic.ml_sigma(X.to_numpy(), y, g, J), d, X.to_numpy(), y


class Figures(unittest.TestCase):
    def test_mor_icc(self):
        self.assertAlmostEqual(float(ic.mor(1.0)), math.exp(math.sqrt(2) * 0.6744897501960817), places=6)
        self.assertAlmostEqual(float(ic.mor(0.0)), 1.0)
        self.assertAlmostEqual(float(ic.icc(1.0)), 1 / (1 + math.pi ** 2 / 3), places=6)

    def test_bands_whole_interval(self):
        self.assertEqual(ic.mor_band(1.02, 1.18), 'little association with the lead inspector')
        self.assertEqual(ic.mor_band(1.21, 1.49), 'modest')
        self.assertEqual(ic.mor_band(1.55, 2.4), 'substantial')
        self.assertEqual(ic.mor_band(1.1, 1.3), 'uncertain between little and modest')
        self.assertEqual(ic.mor_band(1.1, 1.7), 'uncertain between little and substantial')
        self.assertEqual(ic.mor_band(1.4, 1.6), 'uncertain between modest and substantial')

    def test_spread_typical_school(self):
        s = np.full(4000, 0.5)
        b = np.zeros((4000, 2))
        f = ic.figures(s, b, np.array([1.0, 0.0]))
        p25, p75 = 1 / (1 + math.exp(0.5 * 0.6745)), 1 / (1 + math.exp(-0.5 * 0.6745))
        self.assertAlmostEqual(f['spread_pp']['median'], round(100 * (p75 - p25), 1), places=1)


class Guards(unittest.TestCase):
    codes = {'a1b2c3d4e5f6', '0123456789ab'}
    urns = {'100009', '145678'}

    def test_clean_passes(self):
        ic.check_output({'schools': 4000, 'events': 900, 'x': {'median': 0.3, 'lo': 0.1, 'hi': 0.5},
                         'reports_per_inspector': {'min': 1, 'median': 9, 'max': 80}, 'note': 'sha 1f' * 3},
                        '# results\n4000 schools', self.codes, self.urns)

    def test_refuses(self):
        bad = [({'note': 'lead a1b2c3d4e5f6'}, ''), ({'a1b2c3d4e5f6': 0.4}, ''), ({}, 'see 0123456789ab'),
               ({'note': 'school 145678'}, ''), ({'events': 7}, ''), ({'pooled_group_schools': 3}, ''),
               ({'effects': list(np.linspace(0, 1, 50))}, ''), ({'u': 0.1}, ''), ({'note': 'ffffffffffff'}, '')]
        for obj, md in bad:
            with self.assertRaises(SystemExit, msg=str(obj)):
                ic.check_output(obj, md, self.codes, self.urns)

    def test_cell_suppression(self):
        self.assertEqual(ic.cell(9), 'fewer than 10')
        self.assertEqual(ic.cell(10), 10)
        self.assertEqual(ic.cell(0), 0)

    def test_corpus_guard(self):
        with tempfile.TemporaryDirectory() as t:
            raw, corpus = os.path.join(t, 'raw'), os.path.join(t, 'corpus')
            os.makedirs(raw), os.makedirs(corpus)
            mi = 'urn,phase,f_start,f_rel,g_ach\n' + ''.join(f'{100000 + i},Primary,2026-03-0{1 + i % 9},Yes,Expected standard\n' for i in range(100))
            open(os.path.join(raw, 'ofsted_mi_latest.csv'), 'w').write(mi)
            open(os.path.join(raw, 'reports_daily.csv'), 'w').write('urn,phase,insp_date,published\n100000,Primary,2026-10-01,2026-11-01\n')
            def manifest(k):
                with open(os.path.join(corpus, 'manifest.jsonl'), 'w') as f:
                    for i in range(k):
                        d = '2026-10-01' if i == 0 else f'2026-03-0{1 + i % 9}'
                        f.write(json.dumps({'urn': str(100000 + i), 'insp_date': d, 'fetched': '2026-11-20T10:00:00+00:00'}) + '\n')
            manifest(94)
            kw = dict(corpus=corpus, raw=raw, today='2026-12-01')
            for args in [(None, True), ('2026-12-31', True), ('2026-11-30', True)]:
                with self.assertRaises(SystemExit):
                    ic.guard_corpus(*args, **kw)
            manifest(96)
            with self.assertRaises(SystemExit):
                ic.guard_corpus('2026-11-30', False, **kw)                  # complete, but not confirmed
            with self.assertRaises(SystemExit):
                ic.guard_corpus('2026-11-19', True, **kw)                   # nothing fetched by that cut-off
            c = ic.guard_corpus('2026-11-30', True, **kw)
            self.assertEqual(c['in_corpus_schools'], 96)

    def test_permutation_keeps_counts(self):
        df = ic.simulate(n=2000, sigma=0.0, seed=5)
        strata = df['region'] + '|' + df['month'] + '|' + df['phase']
        p = ic.permute_codes(df['code'], strata, np.random.default_rng(1))
        a = df.groupby([strata, df['code']]).size().sort_index()
        b = pd.DataFrame({'s': strata, 'c': p}).groupby(['s', 'c']).size().sort_index()
        self.assertTrue(np.array_equal(a.to_numpy(), b.to_numpy()) and list(a.index) == list(b.index))
        self.assertFalse((p == df['code']).all())

    def test_events_rule(self):
        df = ic.simulate(n=700, sigma=0.5, seed=2)
        r = ic.run_model(df, 'g_ach', 'main', {'seed': 1})
        self.assertTrue(r['status'].startswith('not fitted: events rule'))
        self.assertLess(r['events'] if isinstance(r['events'], int) else 0, r['events_needed'])


class MaximumLikelihood(unittest.TestCase):
    def test_recovers_known_sd(self):
        zero = [ml_on(ic.simulate(sigma=0.0, seed=s))[0] for s in (11, 12, 13)]
        half = [ml_on(ic.simulate(sigma=0.5, seed=s))[0] for s in (11, 12, 13)]
        print(f'\n  ML inspector SD, true 0: {np.round(zero, 3)}; true 0.5: {np.round(half, 3)}')
        self.assertLess(max(zero), 0.2)
        self.assertTrue(0.3 < np.mean(half) < 0.7)


@unittest.skipIf(QUICK, 'slow')
class Permutation(unittest.TestCase):
    def test_null_and_signal(self):
        pct = []
        for s in range(21, 29):
            _, d, X, y = ml_on(ic.simulate(sigma=0.0, seed=s))
            pct.append(ic.permutation_benchmark(d, X, y, 5, perms=40, seed=s)['observed_percentile'])
        _, d, X, y = ml_on(ic.simulate(sigma=0.5, seed=30))
        sig = ic.permutation_benchmark(d, X, y, 5, perms=40, seed=30)
        print(f'\n  observed percentile, true SD 0 (8 datasets, 40 shuffles each): {pct}; mean {np.mean(pct):.1f}')
        print(f'  true SD 0.5: observed ML SD {sig["observed_sd_ml"]}, shuffled median {sig["shuffled_sd_median"]}, percentile {sig["observed_percentile"]}')
        self.assertTrue(25 <= np.mean(pct) <= 75)
        self.assertGreaterEqual(sig['observed_percentile'], 97.5)


@unittest.skipIf(QUICK, 'slow')
class Bayes(unittest.TestCase):
    def test_recovers_known_sd(self):
        out = {}
        for true in (0.0, 0.5):
            r = ic.run_model(ic.simulate(sigma=true, seed=41), 'g_ach', 'main', {'seed': ic.SEED})
            out[true] = r
            print(f"\n  PyMC, true SD {true}: SD {r['inspector_sd']}, MOR {r['median_odds_ratio']} ({r['mor_reading']}), "
                  f"spread {r['spread_pp']} pp, ICC {r['icc_latent']}, R-hat max {r['convergence']['rhat_max']}, "
                  f"ESS min {r['convergence']['ess_min']}, {r['seconds_bayes']}s")
            self.assertTrue(r['convergence']['converged'])
        z, h = out[0.0]['inspector_sd'], out[0.5]['inspector_sd']
        # with a true SD of 0 the posterior of a positive SD cannot centre on 0 (half-Normal prior, chance clustering):
        # the check is that the interval reaches down to near 0 and stays well below the 0.5 case
        self.assertLess(z['lo'], 0.1)
        self.assertLess(z['median'], 0.3)
        self.assertLess(z['hi'], 0.45)
        self.assertTrue(h['lo'] < 0.5 < h['hi'] and 0.3 < h['median'] < 0.7)
        self.assertNotEqual(out[0.0]['mor_reading'], 'substantial')


@unittest.skipIf(QUICK, 'slow')
class EndToEnd(unittest.TestCase):
    def test_synthetic_run_writes_only_aggregates(self):
        df = ic.simulate(sigma=0.3, seed=51)
        res = ic.analyse(df, {'seed': ic.SEED, 'draws': 500, 'tune': 500}, perms=5, areas=['g_ach', 'g_ey'], sensitivity=False, log=lambda *_: None)
        res['plan'] = ic.PLAN
        res['run'] = {'mode': 'synthetic test', 'when': 'test'}
        with tempfile.TemporaryDirectory() as t:
            js, md = ic.write(res, set(df['code']), set(df['urn']), out_dir=t)
            text = open(js).read() + open(md).read()
        self.assertFalse(any(c in text for c in set(df['code'])))
        self.assertFalse(any(u in set(df['urn']) for u in ic.SIX.findall(text)))
        self.assertEqual(res['areas']['g_ach']['main']['status'], 'fitted')
        # a planted code must stop the write
        res['run']['when'] = 'x ' + df['code'].iloc[0]
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(SystemExit):
                ic.write(res, set(df['code']), set(df['urn']), out_dir=t)
            self.assertEqual(os.listdir(t), [])


if __name__ == '__main__':
    t0 = time.time()
    unittest.main(verbosity=2, exit=False)
    print(f'{time.time() - t0:.0f}s')
