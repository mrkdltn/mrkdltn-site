#!/usr/bin/env python3
"""Synthetic cases for scripts/language/lexicons.py. Run: python3 scripts/language/test_lexicons.py

Every sentence here is invented for the test. None is copied from a report."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lexicons as L


def themes(t):
    return set(L.classify_next_step(t))


class Preparation(unittest.TestCase):
    def test_quotes_dashes_hyphens_placeholders(self):
        self.assertEqual(L.prepare('Pupils’ self - discipline at [the school] – and or SEND'),
                         "pupils' self-discipline at - and/or send")


class NextStepThemes(unittest.TestCase):
    def test_other_when_nothing_matches(self):
        self.assertEqual(L.classify_next_step('Leaders should keep doing what they are doing.'), ['other'])

    def test_multi_label(self):
        t = 'Leaders should make sure that pupils with SEND attend school more regularly.'
        self.assertEqual(themes(t), {'send', 'attendance'})

    def test_order_is_fixed(self):
        out = L.classify_next_step('Governors should check attendance and the phonics programme.')
        self.assertEqual(out, [k for k in L.THEME_ORDER if k in out])

    def test_curriculum_design(self):
        self.assertIn('curriculum_design', themes('Leaders should set out and sequence the essential knowledge in history.'))
        self.assertIn('curriculum_design', themes('Leaders should help pupils recall what they learned last term.'))

    def test_teaching_quality(self):
        self.assertIn('teaching_quality', themes('Leaders should improve the consistency of teaching in science.'))
        self.assertIn('teaching_quality', themes('Leaders should ensure learning tasks match the intended curriculum.'))

    def test_teaching_excludes_behaviour_expectations(self):
        self.assertNotIn('teaching_quality', themes('Staff should apply the behaviour expectations consistently.'))

    def test_assessment(self):
        self.assertIn('assessment', themes('Teachers should check pupils’ understanding and correct misconceptions quickly.'))
        self.assertIn('assessment', themes('Staff should close gaps in pupils’ basic number knowledge.'))

    def test_assessment_excludes_national_assessments(self):
        self.assertNotIn('assessment', themes('Leaders should raise outcomes in national assessments.'))

    def test_foundational(self):
        self.assertIn('foundational', themes('Leaders should strengthen the teaching of phonics and handwriting.'))

    def test_foundational_excludes_eal_and_ready(self):
        t = 'Leaders should support pupils who speak English as an additional language when they are ready.'
        self.assertNotIn('foundational', themes(t))
        self.assertIn('send', themes(t))

    def test_send_and_disadvantage_are_separate(self):
        t = 'Teachers should adapt work for pupils with special educational needs and/or disabilities.'
        self.assertIn('send', themes(t))
        self.assertNotIn('disadvantage', themes(t))
        t = 'Leaders should check how the pupil premium is spent.'
        self.assertIn('disadvantage', themes(t))
        self.assertNotIn('send', themes(t))
        self.assertEqual(themes('Leaders should make sure disadvantaged pupils with SEND get the right adaptations.'),
                         {'send', 'disadvantage'})
        self.assertIn('disadvantage', themes('Staff should act quickly when vulnerable pupils are known to social care.'))
        self.assertIn('send', themes('Staff should remove barriers for pupils who speak English as an additional language.'))

    def test_barriers_to_attendance_is_attendance_not_inclusion(self):
        t = 'Leaders should reduce the barriers to attendance that some families face.'
        self.assertIn('attendance', themes(t))
        self.assertNotIn('send', themes(t))

    def test_attendance_excludes_alternative_provision(self):
        t = 'Leaders should check the support for pupils who attend alternative provision.'
        self.assertNotIn('attendance', themes(t))

    def test_behaviour(self):
        self.assertIn('behaviour', themes('Leaders should reduce suspensions and improve pupils’ self - discipline.'))

    def test_personal_development(self):
        self.assertIn('personal_development', themes('Pupils should learn more about British values and careers.'))
        self.assertNotIn('personal_development', themes('Leaders should engage the school community.'))

    def test_early_years_and_post16(self):
        self.assertIn('early_years', themes('Staff in Reception should use high-quality interactions.'))
        self.assertIn('post16', themes('Leaders should improve the sixth-form study programmes.'))

    def test_leadership_ignores_the_subject(self):
        # who is asked to act is not what they are asked to do
        self.assertNotIn('leadership', themes('Leaders and governors should improve the teaching of reading.'))
        self.assertIn('leadership', themes('Leaders should ensure governors have accurate oversight of the curriculum.'))

    def test_leadership_trust_not_build_trust(self):
        self.assertNotIn('leadership', themes('Leaders should build trust with parents.'))
        self.assertIn('parents_partnerships', themes('Leaders should build trust with parents.'))

    def test_staff_development(self):
        self.assertIn('staff_development', themes('Leaders should give staff training to strengthen their subject knowledge.'))
        self.assertNotIn('staff_development', themes('Pupils should be ready for education, employment or training.'))

    def test_outcomes(self):
        self.assertIn('outcomes', themes('Leaders should raise attainment at the end of key stage 4.'))
        self.assertNotIn('outcomes', themes('Leaders should raise attendance towards national averages.'))

    def test_safeguarding_is_folded_into_leadership(self):
        self.assertNotIn('safeguarding', L.THEMES)
        self.assertIn('leadership', themes('Staff should tighten record-keeping for safeguarding concerns.'))
        self.assertNotIn('leadership', themes('Pupils should have a strong track record of attendance.'))

    def test_fifteen_themes(self):
        self.assertEqual(len(L.THEMES), 15)
        self.assertIn('post16', L.THEMES)


class ResultsSentences(unittest.TestCase):
    def test_split_and_select(self):
        paras = ['Pupils enjoy their learning. Results in national tests are above average.',
                 'Pupils achieve well. Outcomes in their education, health and care plans are met.']
        self.assertEqual(L.results_sentences(paras), ['Results in national tests are above average.'])

    def test_as_a_result_is_not_results(self):
        self.assertFalse(L.is_results_sentence('As a result, pupils are ready for the next stage.'))

    def test_end_of_key_stage_with_achievement_verb(self):
        self.assertTrue(L.is_results_sentence('At the end of Year 6, most pupils attain well in mathematics.'))
        self.assertFalse(L.is_results_sentence('At the end of Year 6, most pupils are confident readers.'))

    def test_measures(self):
        for s in ['Attainment 8 scores are high.', 'Most pupils pass the phonics screening check.',
                  'The proportion of pupils reaching the expected standard rose.', 'GCSE grades improved.']:
            self.assertTrue(L.is_results_sentence(s), s)


class Direction(unittest.TestCase):
    def d(self, s):
        return L.sentence_direction(s)

    def test_simple(self):
        self.assertEqual(self.d('Outcomes are well above the national average.'), 'positive')
        self.assertEqual(self.d('Outcomes are below the national average.'), 'negative')
        self.assertEqual(self.d('Outcomes are broadly in line with national averages.'), 'level')
        self.assertEqual(self.d('Pupils sit GCSE examinations in Year 11.'), 'none')

    def test_well_below_is_not_achieve_well(self):
        self.assertEqual(self.d('Disadvantaged pupils achieve well below their peers nationally.'), 'negative')

    def test_negated_comparisons(self):
        self.assertEqual(self.d('Results are not as strong as those nationally.'), 'negative')
        self.assertEqual(self.d('Pupils do not attain as well as similar pupils in other schools.'), 'negative')
        self.assertEqual(self.d('Attainment has not been high enough over time.'), 'negative')
        self.assertEqual(self.d('Outcomes are not below the national average.'), 'level')
        self.assertEqual(self.d('Outcomes are not in line with national averages.'), 'negative')

    def test_negation_stops_at_clause_boundary(self):
        self.assertEqual(self.d('Pupils did not sit the test last year, but outcomes improved.'), 'positive')

    def test_trend(self):
        self.assertEqual(self.d('Outcomes declined in the most recent year.'), 'negative')
        self.assertEqual(self.d('Published outcomes have improved over three years.'), 'positive')

    def test_mixed(self):
        self.assertEqual(self.d('Outcomes improved, although they remain below the national average.'), 'mixed')

    def test_level_with_a_direction_takes_the_direction(self):
        self.assertEqual(self.d('Attainment is in line with or above national averages.'), 'positive')
        self.assertEqual(self.d('Attainment is close to average in reading but lower in mathematics.'), 'negative')

    def test_measure_names_carry_no_direction(self):
        self.assertEqual(self.d('Fewer pupils reach the higher standard in tests.'), 'negative')
        self.assertEqual(self.d('Pupils with low prior attainment take GCSE examinations.'), 'none')

    def test_intentions_are_not_results(self):
        self.assertEqual(self.d('Leaders plan to improve outcomes in national tests.'), 'none')
        self.assertEqual(self.d('Leaders are taking action to raise attainment above average.'), 'none')

    def test_results_understate(self):
        self.assertEqual(self.d('Current work is stronger than recent test results suggest.'), 'negative')
        self.assertEqual(self.d('Published outcomes do not fully reflect pupils’ learning.'), 'negative')

    def test_section_rules(self):
        self.assertEqual(L.section_direction(['Pupils enjoy reading.']), 'no results statement')
        self.assertEqual(L.section_direction(['Results are above average. Outcomes rose again.']), 'positive')
        self.assertEqual(L.section_direction(['Results are above average. Outcomes in phonics are below average.']), 'mixed')
        # a results sentence with no direction does not turn a section mixed
        self.assertEqual(L.section_direction(['Pupils take GCSE examinations. Results are below average.']), 'negative')
        # Amendment 2: if no results sentence has a direction, the section reads 'no results statement'
        self.assertEqual(L.section_direction(['Pupils take GCSE examinations.']), 'no results statement')
        self.assertEqual(L.section_direction(['Results are in line with national averages. Outcomes are close to average.']), 'level')
        self.assertEqual(L.section_direction(['Results are in line with national averages. Outcomes rose.']), 'mixed')

    def test_net_direction(self):
        # Amendment 2: (positive - negative) / (positive + negative + level + mixed); 'none' is not in the denominator
        self.assertIsNone(L.net_direction(['Pupils enjoy reading.']))
        self.assertIsNone(L.net_direction(['Pupils take GCSE examinations.']))
        self.assertAlmostEqual(L.net_direction(['Results are above average. Phonics outcomes are below average. '
                                                'Pupils take GCSE examinations.']), 0.0)
        self.assertAlmostEqual(L.net_direction(['Results are above average. Pupils take GCSE examinations.']), 1.0)
        self.assertAlmostEqual(L.net_direction(['Results are above average. Outcomes are in line with national averages. '
                                                'Outcomes improved, although they remain below average.']), 1 / 3)

    def test_trend_words_and_the_exploratory_version(self):
        s = 'Published outcomes have improved over three years.'
        self.assertEqual(L.sentence_direction(s), 'positive')
        self.assertEqual(L.sentence_direction(s, trend=False), 'none')
        s = 'Outcomes declined, although they remain above the national average.'
        self.assertEqual(L.sentence_direction(s), 'mixed')
        self.assertEqual(L.sentence_direction(s, trend=False), 'positive')
        self.assertEqual(L.sentence_direction('Results have not improved.', trend=False), 'none')
        self.assertEqual(L.section_direction(['Outcomes rose. Results are below average.'], trend=False), 'negative')
        self.assertAlmostEqual(L.net_direction(['Outcomes rose. Results are below average.'], trend=False), -1.0)


class DocumentedExamples(unittest.TestCase):
    """Every invented example in the two lexicon documents behaves as the document says."""
    DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'report-language')

    def test_next_steps_examples(self):
        import re
        text = open(os.path.join(self.DOCS, 'next-steps-lexicon-%s.md' % L.LEXICON_VERSION), encoding='utf-8').read()
        labels = {v['label']: k for k, v in L.THEMES.items()}
        n = 0
        for head, body in re.findall(r'^### \d+\. (.+?)\n(.*?)(?=^### |^## )', text, re.S | re.M):
            key = labels[head.strip()]
            line = re.search(r'\*Invented examples:\*(.*)', body).group(1)
            for ex in re.findall(r'"([^"]+)"', line):
                n += 1
                self.assertIn(key, L.classify_next_step(ex), ex)
        self.assertEqual(n, 2 * len(L.THEMES))

    def test_direction_examples(self):
        import re
        text = open(os.path.join(self.DOCS, 'results-lexicon-%s.md' % L.LEXICON_VERSION), encoding='utf-8').read()
        block = text.split('*Invented examples.*', 2)[2].split('## ')[0]
        n = 0
        for label, ex in re.findall(r'^- ([A-Za-z ]+?)(?:, [^:]+)?: "([^"]+)"', block, re.M):
            n += 1
            self.assertTrue(L.is_results_sentence(ex), ex)
            self.assertEqual(L.sentence_direction(ex), label.strip().lower(), ex)
        self.assertEqual(n, 8)


class Version(unittest.TestCase):
    def test_frozen_v1(self):
        self.assertEqual(L.LEXICON_VERSION, 'v1')
        self.assertEqual(L.FROZEN, '2026-11-28')


if __name__ == '__main__':
    unittest.main()
