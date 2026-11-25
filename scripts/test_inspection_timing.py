#!/usr/bin/env python3
"""Hand-worked cases for scripts/inspection_timing.py. Run: python3 scripts/test_inspection_timing.py

Every URN here is invented. The expected dates are worked by hand from docs/inspection-timing-rules.md."""
import datetime as dt
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import inspection_timing as it

D = dt.date
AS_AT = D(2026, 11, 24)


def row(**kw):
    base = {'urn': '999001', 'open': '', 'f_start': '', 'f_pub': '', 'f_rel': '', 'f_urn': '', 'coc': '',
            'g_sg': '', 'o_start': '', 'o_pub': '', 'o_rel': '', 'o_urn': '', 'o_coc': '', 'o_oe': '',
            'u_start': '', 'u_pub': '', 'u_rel': '', 'u_urn': '', 'u_out': ''}
    for a in it.AREAS + it.OEIF_KEY:
        base[a] = ''
    base.update(kw)
    return base


def card(start, pub, **grades):
    g = {a: 'Expected standard' for a in it.AREAS}
    g.update(g_sg='Met', **grades)
    return row(f_start=start, f_pub=pub, f_rel='Yes', **g)


class Statutory(unittest.TestCase):
    """Reg. 2(1): a school year is 12 months from 1 August. Reg. 3(4): 5 years after the end of that school year."""

    def test_brief_example(self):
        # inspected October 2022: school year 1 Aug 2022 to 31 Jul 2023, so the latest date is 31 July 2028
        self.assertEqual(it.statutory_latest(D(2022, 10, 11)), D(2028, 7, 31))

    def test_july_august_boundary(self):
        self.assertEqual(it.statutory_latest(D(2022, 7, 31)), D(2027, 7, 31))   # last day of 2021/22
        self.assertEqual(it.statutory_latest(D(2022, 8, 1)), D(2028, 7, 31))    # first day of 2022/23

    def test_august_and_september_same_school_year(self):
        self.assertEqual(it.statutory_latest(D(2022, 8, 30)), it.statutory_latest(D(2022, 9, 6)))
        self.assertEqual(it.statutory_latest(D(2022, 9, 6)), D(2028, 7, 31))

    def test_covid_extension_window(self):
        # reg. 3ZA: an inspection begun 1 Aug 2014 to 27 Apr 2021 has 7 years, not 5
        self.assertEqual(it.statutory_latest(D(2014, 7, 31)), D(2019, 7, 31))
        self.assertEqual(it.statutory_latest(D(2014, 8, 1)), D(2022, 7, 31))
        self.assertEqual(it.statutory_latest(D(2021, 4, 27)), D(2028, 7, 31))
        self.assertEqual(it.statutory_latest(D(2021, 4, 28)), D(2026, 7, 31))

    def test_ungraded_resets_statutory_interval(self):
        r = row(o_start='2019-03-05', o_pub='2019-04-10', o_rel='Yes', o_oe='2',
                u_start='2023-11-14', u_pub='2024-01-09', u_rel='Yes', u_out='School remains Good')
        rec = it.classify(r, {}, AS_AT)
        self.assertEqual(rec['last_kind'], 'ungraded')
        self.assertEqual(rec['statutory'], D(2029, 7, 31))


class Rules(unittest.TestCase):

    def test_std4_report_card(self):
        rec = it.classify(card('2026-01-13', '2026-03-10'), {}, AS_AT)
        self.assertEqual(rec['rule'], 'STD4')
        self.assertEqual(rec['usual'], D(2030, 3, 10))
        self.assertEqual(rec['earliest'], D(2029, 3, 10))
        self.assertEqual(rec['statutory'], D(2031, 7, 31))
        self.assertEqual(rec['band_end'], D(2031, 3, 10))

    def test_std4_graded_good(self):
        rec = it.classify(row(o_start='2023-05-16', o_pub='2023-06-20', o_rel='Yes', o_oe='2'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['usual'], rec['statutory']), ('STD4', D(2027, 6, 20), D(2028, 7, 31)))

    def test_ri_overall_before_sept_2024(self):
        rec = it.classify(row(o_start='2024-03-05', o_pub='2024-04-17', o_rel='Yes', o_oe='3', o_qe='3'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['why']), ('RI25', 'RI_OE'))
        self.assertEqual(rec['usual'], D(2026, 10, 17))
        self.assertEqual(rec['statutory'], D(2029, 7, 31))

    def test_ri_key_judgement_after_sept_2024(self):
        rec = it.classify(row(o_start='2025-02-04', o_pub='2025-03-12', o_rel='Yes', o_oe='Not judged',
                              o_qe='2', o_ba='3', o_pd='2', o_lm='2'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['why'], rec['usual']), ('RI25', 'RI_KJ', D(2027, 9, 12)))

    def test_not_judged_without_ri_is_four_years(self):
        rec = it.classify(row(o_start='2025-02-04', o_pub='2025-03-12', o_rel='Yes', o_oe='Not judged',
                              o_qe='2', o_ba='1', o_pd='2', o_lm='2'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['usual']), ('STD4', D(2029, 3, 12)))

    def test_ungraded_concerns_before_sept_2024(self):
        rec = it.classify(row(u_start='2024-06-11', u_pub='2024-07-15', u_rel='Yes',
                              u_out='School remains Good (Concerns) - S5 Next'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['why'], rec['usual']), ('RI25', 'UNG_CONCERN', D(2027, 1, 15)))

    def test_ungraded_improving_is_not_a_concern(self):
        rec = it.classify(row(u_start='2024-06-11', u_pub='2024-07-15', u_rel='Yes',
                              u_out='School remains Good (Improving) - S5 Next'), {}, AS_AT)
        self.assertEqual(rec['rule'], 'STD4')

    def test_ungraded_slipped_after_sept_2024(self):
        rec = it.classify(row(u_start='2025-01-21', u_pub='2025-03-03', u_rel='Yes',
                              u_out='Some aspects not as strong'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['why'], rec['usual']), ('RI25', 'UNG_SLIP', D(2027, 9, 3)))

    def test_needs_attention_monitoring_with_four_year_clock(self):
        rec = it.classify(card('2026-02-03', '2026-04-01', g_ach='Needs attention'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['mon'], rec['mon_by']), ('MON_NA', 'NA', D(2028, 4, 1)))
        self.assertEqual(rec['usual'], D(2030, 4, 1))

    def test_category_of_concern(self):
        rec = it.classify(card('2026-02-03', '2026-04-01', g_lg='Urgent improvement', coc='SM'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['mon'], rec['mon_by'], rec['usual']), ('MON_COC', 'SM', D(2028, 4, 1), None))
        rec = it.classify(card('2026-02-03', '2026-04-01', g_lg='Urgent improvement', coc='RSI'), {}, AS_AT)
        self.assertEqual((rec['mon'], rec['mon_by']), ('RSI', D(2027, 10, 1)))

    def test_legacy_special_measures(self):
        rec = it.classify(row(o_start='2025-03-11', o_pub='2025-05-02', o_rel='Yes', o_oe='4', o_coc='SM'), {}, AS_AT)
        self.assertEqual((rec['rule'], rec['mon'], rec['usual']), ('MON_LEG', 'SM', None))
        self.assertEqual(rec['statutory'], D(2030, 7, 31))

    def test_academy_converter_not_yet_inspected(self):
        # the predecessor's inspection is context only: it never starts the new school's clock
        r = row(open='2024-09-01', o_start='2021-11-09', o_pub='2021-12-14', o_rel='No', o_urn='999002', o_oe='2')
        rec = it.classify(r, {'open_date': '2024-09-01', 'status': 'Open'}, AS_AT)
        self.assertEqual(rec['rule'], 'NEW')
        self.assertTrue(rec['new'])
        self.assertEqual((rec['pred_urn'], rec['pred_date']), ('999002', D(2021, 11, 9)))
        self.assertEqual(rec['anchor'], D(2024, 9, 1))
        self.assertEqual((rec['earliest'], rec['usual'], rec['band_end']), (D(2026, 9, 1), D(2027, 3, 1), D(2027, 8, 31)))
        self.assertIsNone(rec['statutory'])

    def test_never_inspected_new_provision(self):
        rec = it.classify(row(open='2025-09-01'), {'open_date': '2025-09-01'}, AS_AT)
        self.assertEqual((rec['rule'], rec['pred_urn'], rec['statutory']), ('NEW', '', None))

    def test_no_inspection_no_open_date(self):
        rec = it.classify(row(), {}, AS_AT)
        self.assertEqual(rec['rule'], 'UNCONF')
        self.assertIsNone(rec['statutory'])

    def test_closing_within_six_months(self):
        g = {'status': 'Open, but proposed to close', 'close_date': '2027-03-31'}
        rec = it.classify(card('2026-01-13', '2026-03-10'), g, AS_AT)
        self.assertEqual((rec['rule'], rec['close']), ('CLOSING', D(2027, 3, 31)))

    def test_closing_beyond_six_months_keeps_clock(self):
        g = {'status': 'Open, but proposed to close', 'close_date': '2027-08-31'}
        self.assertEqual(it.classify(card('2026-01-13', '2026-03-10'), g, AS_AT)['rule'], 'STD4')


class DailyReads(unittest.TestCase):

    def test_newer_report_card_wins(self):
        mi = row(o_start='2022-05-10', o_pub='2022-06-15', o_rel='Yes', o_oe='2')
        daily = {'insp_date': '2026-10-06', 'published': '2026-11-12', 'g_sg': 'Met',
                 **{a: 'Strong standard' for a in it.AREAS}}
        r, used = it.merge_daily(mi, daily)
        self.assertTrue(used)
        rec = it.classify(r, {}, AS_AT)
        self.assertEqual((rec['rule'], rec['anchor'], rec['statutory']), ('STD4', D(2026, 11, 12), D(2032, 7, 31)))

    def test_older_or_pre_framework_read_ignored(self):
        mi = card('2026-05-05', '2026-06-30')
        self.assertFalse(it.merge_daily(mi, {'insp_date': '2026-03-01', 'published': '2026-04-01'})[1])
        self.assertFalse(it.merge_daily(row(), {'insp_date': '2025-10-01', 'published': '2025-11-01'})[1])

    def test_daily_urgent_improvement_is_category(self):
        daily = {'insp_date': '2026-10-06', 'published': '2026-11-12', 'g_sg': 'Not met',
                 **{a: 'Expected standard' for a in it.AREAS}}
        r, _ = it.merge_daily(row(), daily)
        self.assertEqual(it.classify(r, {}, AS_AT)['rule'], 'MON_COC')

    def test_monitoring_letters_never_read(self):
        # the daily reader takes only documents titled 'School inspection', so a monitoring letter cannot restart the clock
        import fetch_reports
        page = ('<a href="https://files.ofsted.gov.uk/v1/file/1">School monitoring inspection, 2 October 2026</a>'
                '<a href="https://files.ofsted.gov.uk/v1/file/2">School inspection, 12 March 2026</a>')
        self.assertEqual(fetch_reports.latest_inspection_pdf(page), ('https://files.ofsted.gov.uk/v1/file/2', '2026-03-12'))


if __name__ == '__main__':
    unittest.main(verbosity=1)
