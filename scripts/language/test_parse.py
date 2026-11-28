#!/usr/bin/env python3
"""Synthetic cases for scripts/language/parse.py. Run: python3 scripts/language/test_parse.py

Every school, place and person here is invented. No text is copied from a real report beyond Ofsted's fixed headings
and boilerplate."""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parse as P

REPORT = """Quillbrook Meadow Primary School
Address: 1 Nowhere Lane, Imaginaryton, ZZ1 1ZZ
Unique reference number (URN): 999999
Inspection report: 14 October 2026
Exceptional
Strong standard
Expected standard
Needs attention
Urgent improvement
Safeguarding standards met
The safeguarding standards are met. This means that leaders and/or those responsible for
governance and oversight fulfil their specific responsibilities.
How we evaluate safeguarding
When we inspect schools for safeguarding, they can have the following outcomes:
Met: The school has an open and positive culture of safeguarding. All legal requirements
are met.
Strong standard
Expected standard
Inclusion Strong standard
Leaders at Quillbrook Meadow know every pupil well. They identify needs quickly and adapt
support with care, so pupils with special educational needs and/or disabilities thrive.
Pupils at Quillbrook are welcomed into every part of school life.
Curriculum and teaching Needs attention
The curriculum is ambitious in English and mathematics. In some foundation subjects, it is
less well sequenced, and teaching does not check what pupils remember.
Achievement Expected standard
Pupils achieve well in reading. In writing, outcomes are lower than they should be for some
disadvantaged pupils.
Attendance and behaviour Expected standard
Pupils attend well and behave sensibly in lessons and around the school site.
Personal development and wellbeing
Strong standard
Pupils take on roles of responsibility and learn about a wide range of faiths and cultures.
The school dog, Biscuit, is popular.
Early years Expected standard
Children settle quickly in Reception and learn routines that help them to play and learn.
Leadership and governance Expected standard
Leaders and governors share an accurate view of the school. The executive headteacher, Zelda
Fernwhistle, works closely with the head of school.
What it's like to be a pupil at this school
Pupils are happy here. They talk with pride about the 'Quillbrook Promise' and the 'Fothergill Stars' awards.
Next steps
• Leaders should ensure that the foundation subjects are sequenced so that pupils build
knowledge over time.
• Leaders must make sure that teaching checks what pupils remember.
About this inspection
The chair of the board of governors in this school is Mrs Odelia Brackenridge-Vane.
This school is part of Thistledown Learning Trust, which means other people in the trust also
have responsibility for running the school. The trust is run by the chief executive officer
(CEO), Bartholomew Quince, and overseen by a board of trustees, chaired by Ottoline Marchbanks.
Inspectors carried out this full inspection under section 5 of the Education Act 2005.
Lead inspector:
Peregrine Ashdown-Sloe, His Majesty's Inspector
Team inspectors:
Hortensia Glimmer, Ofsted Inspector
Facts and figures used on inspection
This was the data available at the time of the full inspection, taken from different sources.
More recent data may have been published since the full inspection took place.
Inspectors spoke with the headteacher, staff, pupils and a group of governors during the
inspection.
The inspectors confirmed the following information about the school:
The school does not use alternative provision.
Headteacher: Dr Ignatius Fothergill
School and pupil context
Total pupils
412
Above average
What does this mean?
The total number of pupils currently at this school and how this compares to other schools of
this phase in England.
National average: 272
Our grades explained
Exceptional
Practice is exceptional: of the highest standard nationally.
"""

INVENTED = ['Zelda', 'Fernwhistle', 'Odelia', 'Brackenridge', 'Bartholomew', 'Quince', 'Ottoline', 'Marchbanks',
            'Peregrine', 'Ashdown', 'Hortensia', 'Glimmer', 'Ignatius', 'Fothergill', 'Quillbrook', 'Thistledown']


class Sections(unittest.TestCase):
    def setUp(self):
        self.s = P.split_sections(REPORT)

    def test_grades(self):
        g = self.s['grades']
        self.assertEqual(g['safeguarding'], 'Met')
        self.assertEqual(g['inclusion'], 'Strong standard')
        self.assertEqual(g['curriculum_teaching'], 'Needs attention')
        self.assertEqual(g['personal_development'], 'Strong standard')   # heading and grade on two lines
        self.assertEqual(g['early_years'], 'Expected standard')
        self.assertNotIn('post16', g)

    def test_boundaries(self):
        sec = self.s['sections']
        self.assertTrue(sec['inclusion'][0].startswith('Leaders at'))
        self.assertTrue(sec['inclusion'][-1].endswith('school life.'))
        self.assertEqual(sec['attendance_behaviour'], ['Pupils attend well and behave sensibly in lessons and around the school site.'])
        self.assertEqual(len(sec['next_steps']), 3)

    def test_boilerplate_and_grade_key_dropped(self):
        txt = '\n'.join(l for v in self.s['sections'].values() for l in v)
        for gone in ('How we evaluate', 'legal requirements', 'Our grades explained', 'National average', 'Total pupils',
                     'This was the data available'):
            self.assertNotIn(gone, txt)
        self.assertNotIn('Strong standard', self.s['sections']['safeguarding'])

    def test_about_resumes_after_team_and_facts(self):
        about = ' '.join(self.s['sections']['about'])
        self.assertIn('Inspectors spoke with the headteacher', about)
        self.assertEqual(self.s['sections']['context'], ['The school does not use alternative provision.'])

    def test_team_and_role_lines_dropped(self):
        txt = '\n'.join(l for v in self.s['sections'].values() for l in v)
        for n in ('Peregrine', 'Hortensia', 'Ignatius'):
            self.assertNotIn(n, txt)
        self.assertGreaterEqual(self.s['dropped']['team'], 4)
        self.assertEqual(self.s['dropped']['role_line'], 1)

    def test_report_card_and_date(self):
        self.assertTrue(P.is_report_card(REPORT))
        self.assertFalse(P.is_report_card('School report\nInspection of a good school\nOutcome\n'))
        self.assertEqual(P.report_date(self.s['header']), '2026-10-14')
        self.assertEqual(P.school_name_from_header(self.s['header']), 'Quillbrook Meadow Primary School')


class Names(unittest.TestCase):
    def setUp(self):
        self.rec, self.diag = P.parse_report(REPORT, {'phase': 'Primary', 'insp_date': '2026-10-14'})
        self.text = P.section_text(self.rec)

    def test_no_invented_name_survives(self):
        for n in INVENTED:
            self.assertNotIn(n, self.text, n)

    def test_placeholders(self):
        self.assertIn('Leaders at [the school] know', self.text)
        self.assertIn('Pupils at [the school] are welcomed', self.text)
        self.assertIn('[the trust]', self.text)
        self.assertIn('The executive headteacher, [name], works', self.text)
        self.assertIn('chief executive officer (CEO), [name]', self.text)
        self.assertIn('chaired by [name]', self.text)
        self.assertIn('in this school is [name].', self.text)

    def test_no_urn_or_date_in_record(self):
        import json
        blob = json.dumps(self.rec)
        self.assertNotIn('999999', blob)
        self.assertNotIn('14 October', blob)
        self.assertEqual(self.rec['insp_month'], '2026-10')

    def test_ordinary_words_kept(self):
        self.assertIn('English and mathematics', self.text)
        self.assertIn('special educational needs and/or disabilities', self.text)

    def test_scrub_patterns(self):
        cases = {
            'We met Mr Tobias Wrenfield and Ms Quaile.': 'We met [name] and [name].',
            'The co-chairs of the board of governors in this school are Juniper Vossberg and Caspian Thrale.':
                'The co-chairs of the board of governors in this school are [name] and [name].',
            'The school is led by an acting headteacher, Rosalind Ebbworth.': 'The school is led by an acting headteacher, [name].',
            'The school is part of a federation called Larkspur and Fenwick Federation.':
                'The school is part of a federation called [the trust].',
            'In Year 6, pupils study the Second World War.': 'In Year 6, pupils study the Second World War.',
            'The chair of the board of governors in this school is Lieutenant Colonel Brannoc Wexley.':
                'The chair of the board of governors in this school is [name].',
            'The inspection took place on Tuesday 20 and Wednesday 21 October 2026.': 'The inspection took place on [date].',
            'Children enjoy Forest School sessions every week.': 'Children enjoy Forest School sessions every week.',
            'A new headteacher joined in September 2025.': 'A new headteacher joined in September 2025.',
            'Pupils in the resourced provision join classes. The sixth form is shared with Fallowmere Catholic High School.':
                'Pupils in the resourced provision join classes. The sixth form is shared with [another school].',
            'The second site is at Brindlecombe Road, Imaginaryton ZZ9 9ZZ.': 'The second site is at [address], Imaginaryton [postcode].',
            'The board of trustees is chaired by Peregrine Ansel Da Quellow.': 'The board of trustees is chaired by [name].',
            'The chair of the board of governors in this school is Isadora van Thrimble.':
                'The chair of the board of governors in this school is [name].',
        }
        for src, want in cases.items():
            self.assertEqual(P.scrub(src), want, src)

    def test_trust_as_reports_write_it(self):
        common = frozenset({'bloom', 'learn'})
        cases = [
            ('This school is part of Q-ZAT multi-academy trust, which means', ['Q-ZAT'], 'This school is part of [the trust], which means'),
            ('It joined QZAT in September 2025. Members of Q-Zat\'s team.', ['QZAT', 'Q-ZAT'], 'It joined [the trust] in September 2025. Members of [the trust]\'s team.'),
            ("Pupils run the 'Vellacombe Games'.", ['VELLACOMBE ACADEMY TRUST LIMITED'], "Pupils run the '[the trust] Games'."),
            ('Inspectors met leaders of Vellacombe MAT.', ['VELLACOMBE MULTI ACADEMY TRUST'], 'Inspectors met leaders of [the trust].'),
            ('It is part of St Ombra Church of England Multi Academy Trust, which', ['ST OMBRA CHURCH OF ENGLAND MULTI ACADEMY TRUST'],
             'It is part of [the trust], which'),
            ('It is part of Bloom Learning Trust. Pupils bloom here. Bloom Day is popular.', ['BLOOM LEARNING TRUST'],
             'It is part of [the trust]. Pupils bloom here. Bloom Day is popular.'),
        ]
        for src, trust, want in cases:
            self.assertEqual(P.scrub(src, trust_names=trust, common=common), want, src)

    def test_name_tails_go_with_the_name(self):
        """A shorter use of the name takes the school's own type and denomination words with it (28 November 2026)."""
        cases = [
            ('Quorlbury Church of England Primary School',
             'Quorlbury Primary is calm. Quorlbury Church of England Primary pupils. Quorlbury CofE pupils. At Quorlbury. Primary pupils read.',
             '[the school] is calm. [the school] pupils. [the school] pupils. At [the school]. Primary pupils read.'),
            ('Holmbury Roman Catholic Primary School', 'Holmbury RC Primary and Holmbury Catholic pupils.',
             '[the school] and [the school] pupils.'),
            ("Wrenmoor Nursery School and Children's Centre", 'Children at Wrenmoor Nursery thrive.', 'Children at [the school] thrive.'),
            ('Quillbrook Hall Day Special School', 'Pupils leave Quillbrook Hall with qualifications.',
             'Pupils leave [the school] with qualifications.'),
            ('Fernwick Sports & Science Academy', 'Pupils at Fernwick Sports and Science Academy, including those',
             'Pupils at [the school], including those'),
            ('Quillbrook Meadow High School', 'The QMHS School Values programme. QMHS pupils.', 'The [the school] Values programme. [the school] pupils.'),
            ('Tollmere Primary School and Nursery', 'Tollmere Primary and Nursery is a happy school.', '[the school] is a happy school.'),
            # a type word that is not in the school's own name stays
            ('Quillbrook Meadow Primary School', 'Quillbrook Meadow High is nearby. Quillbrook Meadow Academy pupils visit.',
             '[the school] High is nearby. [the school] pupils visit.'),
            # a misspelt full name, and a trust named after the school
            ('Quillbrook Meadow Primary School', 'Pupils are proud to attend Quillbrook Lane Primary School.',
             'Pupils are proud to attend [the school].'),
            ('Quorlbury Church of England Junior School', 'It is part of Quorlbury Church of England Junior School Trust, which',
             'It is part of [the trust], which'),
            ('Quorlbury Church of England Primary Academy', 'Pupils are cared for at Quorlbury CE Primary School. Staff',
             'Pupils are cared for at [the school]. Staff'),
        ]
        for name, src, want in cases:
            self.assertEqual(P.scrub(src, P.school_name_forms(name)), want, src)
        self.assertEqual(P.scrub('Brackenmoor and Tollworth C.E. Primary School share a head.', P.school_name_forms('Brackenmoor C.E. Primary School')),
                         '[the school] and [another school] share a head.')

    def test_honorific_goes_with_the_name_whatever_the_order(self):
        for own in ({'Honour', 'Ormsby', 'Quellthorpe'}, {'Ormsby', 'Quellthorpe'}):
            self.assertEqual(P.scrub('The board is chaired by His Honour Judge Ormsby Quellthorpe.', own_names=own),
                             'The board is chaired by [name].')

    def test_names_with_accents_hyphens_and_lead_roles(self):
        self.assertEqual(P.scrub('The trust is chaired by Anaïs Penhallow. The CEO is Renée Dufrayne.'),
                         'The trust is chaired by [name]. The CEO is [name].')
        self.assertEqual(P.scrub('The trust is run by the interim executive lead, Mark Tollervey, and overseen by a board.'),
                         'The trust is run by the interim executive lead, [name], and overseen by a board.')
        self.assertEqual(P.scrub(P.join_lines(['The trust is chaired by Odile Brack-', 'Vennor.'])[0]), 'The trust is chaired by [name].')
        self.assertEqual(P.scrub('The second site is at Brindle Road, Imaginaryton, Fakeshire ZZ9 9ZZ.'),
                         'The second site is at [address], Imaginaryton, Fakeshire [postcode].')
        self.assertEqual(P.scrub('A site at Quoller Rd, Imaginaryton ZZ9 9ZZ.'), 'A site at [address], Imaginaryton [postcode].')
        self.assertEqual(P.scrub('The trust is run by the chief education officer (CEO), Ottavio Brenn, and overseen by a board.'),
                         'The trust is run by the chief education officer (CEO), [name], and overseen by a board.')
        self.assertEqual(P.scrub('Pupils thrive. Regional Executive Principal: Rob Quellan'), 'Pupils thrive. Regional Executive Principal: [name]')
        self.assertEqual(P.scrub('The school has two units, Zorvah Boys and Zorvah Girls.', common=frozenset({'powerful'})),
                         'The school has two units, [another school] and [another school].')

    def test_mislabelled_about_heading(self):
        raw = ('About this inspection\nInformation about this school:\nInspectors carried out this full inspection under '
               'section 5 of the Education Act 2005.\nInformation about this school:\nThe school uses no alternative provision.\n')
        s = P.split_sections(raw)
        self.assertEqual(s['sections']['about'], ['Inspectors carried out this full inspection under section 5 of the Education Act 2005.'])
        self.assertEqual(s['sections']['context'], ['The school uses no alternative provision.'])

    def test_detector_flags_mid_sentence_pairs(self):
        hits = P.detect('Pupils visited the town with Dorabella Nightjar last year.')
        self.assertTrue(any(k == 'bigram' for k, _ in hits))
        self.assertEqual(P.detect('Pupils in Year 6 study Religious Education and Physical Education.'), [])


class Paragraphs(unittest.TestCase):
    def test_hyphen_and_bullets(self):
        lines = ['• Leaders should make sure that teacher-', 'assessed writing improves for all pupils across the school.',
                 '• Governors must check this.']
        self.assertEqual(P.join_lines(lines), ['Leaders should make sure that teacher-assessed writing improves for all pupils across the school.',
                                               'Governors must check this.'])


class LeadInspector(unittest.TestCase):
    KEY = b'k' * 32

    def test_same_person_two_spellings_one_code(self):
        a = REPORT
        b = REPORT.replace("Peregrine Ashdown-Sloe, His Majesty's Inspector", "PEREGRINE  ASHDOWN SLOE, His Majesty’s Inspector")
        ca, ra = P.lead_inspector_code(a, self.KEY)
        cb, rb = P.lead_inspector_code(b, self.KEY)
        self.assertEqual(ca, cb)
        self.assertEqual(len(ca), 12)
        self.assertEqual(ra, 'lead_HMI')
        self.assertEqual(P.normalise_person('Dr Peregrine Ashdown-Sloe'), P.normalise_person('peregrine ashdown sloe'))

    def test_lead_only_and_different_key_different_code(self):
        c1, _ = P.lead_inspector_code(REPORT, self.KEY)
        c2, _ = P.lead_inspector_code(REPORT, b'x' * 32)
        team_only = REPORT.replace("Peregrine Ashdown-Sloe, His Majesty's Inspector\n", '')
        c3, r3 = P.lead_inspector_code(team_only, self.KEY)
        self.assertNotEqual(c1, c2)
        self.assertEqual(c3, '')   # a team inspector is never taken as the lead
        self.assertEqual(r3, 'lead heading without an inspector line')
        plural = REPORT.replace('Lead inspector:', 'Lead inspectors:')
        self.assertEqual(P.lead_inspector_code(plural, self.KEY), ('', 'more than one lead listed'))

    def test_name_never_in_outputs(self):
        code, role = P.lead_inspector_code(REPORT, self.KEY)
        out = repr((code, role))
        for n in ('Peregrine', 'Ashdown', 'peregrine', 'ashdown'):
            self.assertNotIn(n, out)
        rec, diag = P.parse_report(REPORT, {'phase': 'Primary', 'insp_date': '2026-10-14'})
        self.assertNotIn('Ashdown', repr(rec) + repr(diag))

    def test_key_created_private(self):
        with tempfile.TemporaryDirectory() as d:
            k = P.inspector_key(d)
            self.assertEqual(len(k), 32)
            self.assertEqual(oct(os.stat(os.path.join(d, 'secrets', 'inspector.key')).st_mode & 0o777), '0o600')
            self.assertEqual(P.inspector_key(d), k)


if __name__ == '__main__':
    unittest.main()
