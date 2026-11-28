#!/usr/bin/env python3
"""Tests for analysis.py, on synthetic text only (invented sentences; no report text).

  python3 scripts/language/test_analysis.py
"""
import math, os, sys, unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analysis as A  # noqa: E402


class Preparation(unittest.TestCase):
    def test_stopwords(self):
        self.assertEqual(len(A.STOPWORDS), 179)
        self.assertIn("don't", A.STOPWORDS)

    def test_normalise_quotes_dashes(self):
        self.assertEqual(A.normalise('Pupils’ “work” – well'), 'Pupils\' "work" - well')

    def test_tokens_apostrophes_andor_numbers(self):
        segs, allt = A.prepare_sentence("Pupils' learning and/or well-being in 2025, the school's 16-19 offer.")
        self.assertEqual(segs, [["pupils'", 'learning', 'and/or', 'well-being', 'in', '#', 'the', "school's", '#', 'offer']])
        self.assertEqual(allt, segs[0])

    def test_quote_marks_are_not_apostrophes(self):
        segs, _ = A.prepare_sentence("They call it 'the hub' at break.")
        self.assertEqual(segs, [['they', 'call', 'it', 'the', 'hub', 'at', 'break']])

    def test_placeholders_and_grade_words_break_segments(self):
        segs, allt = A.prepare_sentence('[name] leads an exceptional team and the needs attention list at [the trust] grows.')
        self.assertEqual(segs, [['leads', 'an'], ['team', 'and', 'the'], ['list', 'at'], ['grows']])
        self.assertIn('exceptional', allt)
        self.assertNotIn('name', allt)

    def test_sentences(self):
        s = A.split_sentences('Pupils read well, e.g. at St. Imaginary Way. Staff check work. [name] leads it! Is it 3.5? Yes.')
        self.assertEqual(s, ['Pupils read well, e.g. at St. Imaginary Way.', 'Staff check work.', '[name] leads it!',
                             'Is it 3.5?', 'Yes.'])

    def test_phrases_drop_stopword_only(self):
        p = A.phrases([['the', 'pupils', 'are', 'not', 'yet']])  # 'yet' is not a stop word
        self.assertIn('pupils', p)
        self.assertIn('the pupils are', p)
        self.assertIn('not yet', p)
        self.assertNotIn('are not', p)
        self.assertNotIn('the', p)
        self.assertEqual(max(len(x.split()) for x in p), 3)


class Echo(unittest.TestCase):
    def test_coverage_runs_of_five(self):
        grams = A.ngrams([['a', 'b', 'c', 'd', 'e', 'f']])
        cov, tot = A.coverage([['x', 'a', 'b', 'c', 'd', 'e', 'f', 'y'], ['a', 'b', 'c', 'd']], grams)
        self.assertEqual((cov, tot), (6, 12))
        cov, _ = A.coverage([['b', 'c', 'd', 'e', 'x']], grams)
        self.assertEqual(cov, 0)


class Hedges(unittest.TestCase):
    def tok(self, s):
        return A.prepare_sentence(s)[0]

    def test_longest_first_no_overlap(self):
        self.assertEqual(A.hedge_count(self.tok('In some lessons some pupils are not as well supported.')), 3)
        self.assertEqual(A.hedge_count(self.tok('A small number of pupils, a few staff.')), 2)

    def test_while_conjunction(self):
        self.assertEqual(A.hedge_count(self.tok('While most staff agree, it took a while.')), 1)
        self.assertEqual(A.hedge_count(self.tok('Pupils generally behave well, however.')), 2)

    def test_whole_tokens(self):
        self.assertEqual(A.hedge_count(self.tok('Pupils show consistency and variability.')), 0)


class Readability(unittest.TestCase):
    def test_rule(self):
        for w, n in [('cat', 1), ('table', 2), ('make', 1), ('stopped', 1), ('wanted', 2), ('boxes', 2), ('takes', 1), ('changes', 2), ('yearly', 2)]:
            self.assertEqual(A.syllables_rule(w), n, w)

    def test_flesch(self):
        sents = A.prepare_paragraphs(['The cat sat. The dog ran.'])
        r = A.readability(sents)
        self.assertEqual((r['words'], r['sentences']), (6, 2))
        spw = sum(A.syllables(w) for w in 'the cat sat the dog ran'.split()) / 6
        self.assertAlmostEqual(r['flesch'], 206.835 - 1.015 * 3 - 84.6 * spw)
        self.assertAlmostEqual(r['fk_grade'], 0.39 * 3 + 11.8 * spw - 15.59)


class LogOdds(unittest.TestCase):
    def test_against_hand_computation(self):
        yi, ni, yj, nj, aw, a0 = 30.0, 1000.0, 10.0, 800.0, 2.0, 1000.0
        d, z = A.log_odds(np.array([yi]), ni, np.array([yj]), nj, np.array([aw]), a0)
        dd = math.log((yi + aw) / (ni + a0 - yi - aw)) - math.log((yj + aw) / (nj + a0 - yj - aw))
        self.assertAlmostEqual(d[0], dd)
        self.assertAlmostEqual(z[0], dd / math.sqrt(1 / (yi + aw) + 1 / (yj + aw)))

    def test_symmetric(self):
        d1, z1 = A.log_odds(np.array([5.0]), 100, np.array([20.0]), 200, np.array([1.0]), 50)
        d2, z2 = A.log_odds(np.array([20.0]), 200, np.array([5.0]), 100, np.array([1.0]), 50)
        self.assertAlmostEqual(z1[0], -z2[0])


class Matching(unittest.TestCase):
    def test_bm25_self_is_one(self):
        docs = [['leaders', 'identify', 'needs', 'quickly'], ['pupils', 'behave', 'well', 'lessons'],
                ['attendance', 'improving', 'pupils']]
        bm = A.BM25(docs)
        for i, d in enumerate(docs):
            s = bm.score_norm(d)
            self.assertAlmostEqual(s[i], 1.0)
            self.assertEqual(int(np.argmax(s)), i)
        self.assertTrue(np.all(bm.score_norm(['unrelated', 'words']) == 0))

    def test_bm25_formula(self):
        docs = [['a', 'b', 'b'], ['b', 'c']]
        bm = A.BM25(docs)
        avg = 2.5
        idf_a = math.log(1 + (2 - 1 + 0.5) / (1 + 0.5))
        expect = idf_a * 1 * 2.2 / (1 + 1.2 * (1 - 0.75 + 0.75 * 3 / avg))
        self.assertAlmostEqual(bm.score(['a'])[0], expect)


class Helpers(unittest.TestCase):
    def test_sup(self):
        self.assertEqual([A.sup(0), A.sup(3), A.sup(9), A.sup(10)], ['0', '<10', '<10', '10'])

    def test_holm(self):
        self.assertEqual([round(x, 6) for x in A.holm([0.01, 0.04, 0.03])], [0.03, 0.06, 0.06])

    def test_month_labels(self):
        c = {'2025-11': 124, '2025-12': 88, '2026-01': 455, '2026-02': 50, '2026-03': 40, '2026-04': 300, '2026-11': 5}
        lab = A.month_labels(c)
        self.assertEqual(lab['2025-11'], '2025-11')
        self.assertEqual(lab['2025-12'], '2025-12+2026-01')
        self.assertEqual(lab['2026-03'], '2026-02+2026-03+2026-04')
        self.assertNotIn('2026-11', lab)

    def test_bootstrap_deterministic(self):
        v, c = [1, 2, 3, 4, 5, 6], ['a', 'a', 'b', 'c', 'c', 'd']
        self.assertEqual(A.boot_mean(v, c, B=200), A.boot_mean(v, c, B=200))
        m, lo, hi = A.boot_mean(v, c, B=500)
        self.assertAlmostEqual(m, 3.5)
        self.assertTrue(lo <= m <= hi)


if __name__ == '__main__':
    unittest.main()
