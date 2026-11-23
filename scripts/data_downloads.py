"""Get the data: the CSV downloads behind the Ofsted Explorer, written on every build.

Called from build_data.py after the data is merged and enriched. Writes to <out>/csv/:
  secondaries.csv       one row per secondary with 2025/26 results: results, context, similar-schools and
                        contextual-model figures, report card grades
  report-cards.csv      one row per school with an Ofsted report card, all phases
  similar-schools.csv   the 50 similar schools of each secondary (open replica), one row per pair
  model.csv             the factors' means and standard deviations, the similar-schools weights and the
                        two contextual models' coefficients
  dictionary.csv        every column in the files above: meaning, unit and source
and returns a summary (rows, bytes, SHA-256 per file) for build.json.

Groups under 10 pupils: suppress_small_groups() blanks the disadvantaged and non-disadvantaged Attainment 8
averages, both of them, wherever either group is estimated at fewer than 10 pupils (GCSE cohort x share disadvantaged, rounded),
the same rule the school page uses. It runs before anything is written, so the JSON the Explorer loads and
the CSVs agree.
"""
import csv, hashlib, os

KS4 = 'DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)'
KS4_PREV = 'DfE, Key stage 4 performance 2024/25 and 2023/24 (final)'
CENSUS = 'DfE, Schools, pupils and their characteristics, January 2026'
SEN = 'DfE, Special educational needs in England, January 2026'
OFSTED = "Ofsted, management information (latest inspections as at 31 October 2026), with report cards published since then read from Ofsted's reports site"
GIAS = 'DfE, Get Information about Schools (daily extract)'
INFO = 'DfE school information (Key stage 4 performance and Get Information about Schools)'
REPLICA = 'Derived: open replica of the DfE and Ofsted similar-schools model (technical note, 16 July 2026)'
CTX = 'Derived: the Explorer\'s contextual model'
DERIVED = 'Derived by the Explorer'

GRADE_NOTE = ('Ofsted report card grade: Exceptional, Strong standard, Expected standard, Needs attention or Urgent improvement; '
              'Not applicable where the area does not apply; blank if no report card yet')
GRADES = {
    'g_ach': 'Achievement', 'g_ct': 'Curriculum and teaching', 'g_inc': 'Inclusion', 'g_ab': 'Attendance and behaviour',
    'g_pd': 'Personal development and wellbeing', 'g_lg': 'Leadership and governance', 'g_ey': 'Early years',
    'g_p16': 'Post-16 provision'}

# column -> (meaning, unit, source). Shared by the files; file-specific wording is in FILE_OVERRIDES.
COLUMNS = {
    'urn': ('Unique reference number of the school', 'code', GIAS),
    'name': ('School name', 'text', GIAS),
    'la': ('Local authority', 'text', GIAS),
    'region': ('Region of England', 'text', GIAS),
    'mat': ('Multi-academy trust, where the school is in one', 'text', GIAS),
    'type': ('Type of school (for example converter academy, community school)', 'text', INFO),
    'selective': ('Admissions policy: selective or non-selective', 'text', INFO),
    'relig': ('Religious character', 'text', INFO),
    'pupils': ('Pupils in the 2025/26 GCSE year group (key stage 4 cohort)', 'pupils', KS4),
    'a8': ('Attainment 8, 2025/26: average across pupils of their grades in eight GCSE-level slots, English and maths double-weighted', 'points', KS4),
    'em4': ('Share of the GCSE year group achieving grade 4 or above in both English and maths, 2025/26', '%', KS4),
    'em5': ('Share of the GCSE year group achieving grade 5 or above in both English and maths, 2025/26', '%', KS4),
    'a8_25': ('Attainment 8, 2024/25 (final)', 'points', KS4_PREV),
    'a8_24': ('Attainment 8, 2023/24 (final)', 'points', KS4_PREV),
    'p8_24': ('Progress 8, 2023/24, the last year the DfE published it; carried from a predecessor school where the URN changed', 'score', KS4_PREV),
    'p8lo_24': ('Lower end of the DfE 95% confidence interval for p8_24', 'score', KS4_PREV),
    'p8hi_24': ('Upper end of the DfE 95% confidence interval for p8_24', 'score', KS4_PREV),
    'dis_pct': ('Share of the GCSE year group who are disadvantaged (free school meals in the last six years, looked after, or adopted from care)', '%', KS4),
    'dis_a8': ('Attainment 8 of disadvantaged pupils. Blank where either the disadvantaged or the other pupils number fewer than 10 (estimated as pupils x dis_pct, rounded), so neither can be worked out from the other', 'points', KS4),
    'nondis_a8': ('Attainment 8 of other pupils. Blank where either group numbers fewer than 10, as for dis_a8', 'points', KS4),
    'nonmob_pct': ('Pupil stability: share of the GCSE year group who joined the school at the usual time (non-mobile pupils)', '%', KS4),
    'eal_school': ('Share of pupils whose first language is known or believed to be other than English (whole school)', '%', CENSUS),
    'sensup_pct': ('Share of pupils on SEN support (whole school)', '%', SEN),
    'ehc_pct': ('Share of pupils with an education, health and care plan (whole school)', '%', SEN),
    'idaci_q': ("Ofsted's IDACI quintile, from pupils' home postcodes: 1 least deprived, 5 most deprived", 'quintile', OFSTED),
    'nor': ('Number of pupils on roll (whole school)', 'pupils', CENSUS),
    'pa_index': ('Prior attainment index: key stage 2 profile of the 2023/24 GCSE year group, carried from a predecessor school where the URN changed', 'index', KS4_PREV),
    'pa_imputed': ('yes where pa_index is estimated because no published figure was available', 'yes/no', DERIVED),
    'ss_mean': ('Average 2025/26 Attainment 8 of the 50 similar schools', 'points', REPLICA),
    'ss_sd': ('Standard deviation of 2025/26 Attainment 8 across the 50 similar schools', 'points', REPLICA),
    'ss_diff': ('a8 minus ss_mean: gap to the 50 similar schools', 'points', REPLICA),
    'ss_z': ('ss_diff divided by its standard error, sqrt(14.2^2 / pupils + ss_sd^2 / 50); 14.2 is the pupil-level spread of Attainment 8 from 2023/24 Progress 8 confidence intervals', 'standard errors', REPLICA),
    'ss_band': ('Reading against the 50: Above or Below when |ss_z| > 1.96, Well above or Well below when the gap is also larger than ss_sd, otherwise Close to', 'band', REPLICA),
    'cva_exp': ('Expected 2025/26 Attainment 8 for this intake, from the contextual model (least squares on the factors in model.csv)', 'points', CTX),
    'cva_res': ('a8 minus cva_exp. Read as in line within +/-2 x sqrt(180 / pupils)', 'points', CTX),
    'nat_diff': ('a8 minus the pupil-weighted England average Attainment 8 for 2025/26', 'points', DERIVED),
    'insp_date': ('Date of the inspection behind the report card grades', 'date', OFSTED),
    'ss_mean_25': ('Average 2024/25 Attainment 8 of the same 50 similar schools', 'points', REPLICA),
    'ss_diff_25': ('a8_25 minus ss_mean_25', 'points', REPLICA),
    'ss_band_25': ('Reading against the 50 for 2024/25, same rules as ss_band', 'band', REPLICA),
    'postcode': ('School postcode', 'text', GIAS),
    'pred': ('URN of the predecessor school, where results or prior attainment were carried from it', 'code', GIAS),
    'district': ('Local authority district', 'text', GIAS),
    'pcon': ('Parliamentary constituency', 'text', GIAS),
    'lat': ('Latitude of the school, from its postcode', 'degrees', GIAS),
    'lng': ('Longitude of the school, from its postcode', 'degrees', GIAS),
    'em5_ss': ('Average em5 of the 50 similar schools (the Attainment 8 replica groups, so an approximation for this measure)', '%', REPLICA),
    'em5_ssd': ('Standard deviation of em5 across the 50 similar schools', 'percentage points', REPLICA),
    'em5_cva': ('Expected em5 for this intake, from the fractional logit contextual model; always between 0 and 100', '%', CTX),
    'phase': ('Phase of education (Ofsted)', 'text', OFSTED),
    'town': ('Town', 'text', GIAS),
    'list_position': ('Position of the similar school in the replica\'s list of 50 for this school. The list is the 50 nearest schools; the order is as stored and is not a ranking', '1-50', REPLICA),
    'similar_urn': ('URN of one of the 50 similar schools', 'code', REPLICA),
    'term': ('Model term: a factor, or the intercept', 'text', DERIVED),
    'factor_mean': ('England mean of the factor, used to standardise it', 'factor units', DERIVED),
    'factor_sd': ('England standard deviation of the factor, used to standardise it', 'factor units', DERIVED),
    'similar_schools_weight': ('Published DfE and Ofsted weight of the factor in the similar-schools model (POLAR4 is not public and is left out)', 'weight', 'DfE and Ofsted, Similar schools model for attainment: technical note (16 July 2026)'),
    'a8_coefficient': ('Coefficient in the Attainment 8 contextual model: expected a8 = intercept + sum of coefficient x factor', 'points per factor unit', CTX),
    'em5_coefficient': ('Coefficient in the English and maths 5+ contextual model (logit scale): expected em5 = 100 / (1 + exp(-(intercept + sum of coefficient x factor)))', 'logit per factor unit', CTX),
}
for c, area in GRADES.items():
    COLUMNS[c] = (area + '. ' + GRADE_NOTE, 'grade', OFSTED)
COLUMNS['g_sg'] = ('Safeguarding: Met or Not met; blank if no report card yet', 'met/not met', OFSTED)
FILE_OVERRIDES = {('report-cards.csv', 'pupils'): ('Number of pupils at the school, as recorded by Ofsted', 'pupils', OFSTED),
                  ('report-cards.csv', 'idaci_q'): COLUMNS['idaci_q']}

FILES = {
    'secondaries.csv': 'One row per secondary school with 2025/26 GCSE results: results, context, the similar-schools and contextual-model figures, and report card grades.',
    'report-cards.csv': 'One row per school with an Ofsted report card, every phase.',
    'similar-schools.csv': "The 50 similar schools of each secondary in the open replica: one row per school and similar school.",
    'model.csv': 'How the comparisons are built: factor means and standard deviations, the published similar-schools weights and both contextual models\' coefficients.',
    'dictionary.csv': 'Every column in the files above: what it means, its unit and its source.',
}
KS4_EXCLUDE = {'nn', 'ss_dist'}  # nn is in similar-schools.csv; ss_dist is an internal model figure the Explorer never uses


def suppress_small_groups(ks4):
    """No figures for groups under 10. Where either group (disadvantaged or other pupils) is estimated under 10,
    both dis_a8 and nondis_a8 are blanked: with the school's a8, cohort and dis_pct published, the other group's
    average would give the small group's back by subtraction (review, 23 November 2026)."""
    n = 0
    for r in ks4:
        try:
            p, d = float(r['pupils']), float(r['dis_pct'])
        except (KeyError, ValueError):
            continue
        if round(p * d / 100) < 10 or round(p * (100 - d) / 100) < 10:
            for col in ('dis_a8', 'nondis_a8'):
                if r.get(col) not in ('', None):
                    r[col] = ''
                    n += 1
    return n


def _sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def write(ks4, rc, rcols, model, out):
    d = os.path.join(out, 'csv')
    os.makedirs(d, exist_ok=True)
    files = {}

    def dump(name, header, rows):
        p = os.path.join(d, name)
        with open(p, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(header)
            w.writerows(rows)
        files[name] = {'rows': len(rows), 'columns': header, 'bytes': os.path.getsize(p), 'sha256': _sha(p),
                       'about': FILES[name]}

    kcols = [c for c in ks4[0].keys() if c not in KS4_EXCLUDE]
    dump('secondaries.csv', kcols, [[r.get(c, '') for c in kcols] for r in sorted(ks4, key=lambda r: int(r['urn']))])
    dump('report-cards.csv', rcols, [[r.get(c, '') for c in rcols] for r in sorted(rc, key=lambda r: int(r['urn']))])
    pairs = [[r['urn'], i + 1, u] for r in sorted(ks4, key=lambda r: int(r['urn'])) for i, u in enumerate((r.get('nn') or '').split())]
    dump('similar-schools.csv', ['urn', 'list_position', 'similar_urn'], pairs)
    F, st, W = model['factors'], model['stats'], model['weights']
    mrows = [['intercept', '', '', '', repr(model['a8']['coef'][0]), repr(model['em5']['coef'][0])]]
    mrows += [[f, repr(st[f]['mean']), repr(st[f]['sd']), W.get(f, ''), repr(model['a8']['coef'][i + 1]), repr(model['em5']['coef'][i + 1])]
              for i, f in enumerate(F)]
    mrows += [[f, '', '', w, '', ''] for f, w in W.items() if f not in F]
    dump('model.csv', ['term', 'factor_mean', 'factor_sd', 'similar_schools_weight', 'a8_coefficient', 'em5_coefficient'], mrows)

    drows = []
    for name in ('secondaries.csv', 'report-cards.csv', 'similar-schools.csv', 'model.csv'):
        for c in files[name]['columns']:
            meaning, unit, source = FILE_OVERRIDES.get((name, c)) or COLUMNS.get(c) or ('', '', '')
            if not meaning:
                raise SystemExit(f'data dictionary: no entry for {name} column {c}')
            drows.append([name, c, meaning, unit, source])
    dump('dictionary.csv', ['file', 'column', 'meaning', 'unit', 'source'], drows)
    for v in files.values():
        del v['columns']
    return files
