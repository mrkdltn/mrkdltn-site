# Next-steps theme lexicon, draft v0 (not frozen)

Drafted 28 November 2026 for Analysis 3 of `docs/report-language/plan.md`. This is a draft for Mark's review. It has not been used to count anything on the full corpus, or anything by grade, deprivation, month or results. Once Mark approves it, it is frozen by renaming this file to `next-steps-lexicon-v1.md` and setting `LEXICON_VERSION = 'v1'` in `scripts/language/lexicons.py`, with no other change. Any change after that is a new version, labelled as such.

The themes are this project's own grouping of what next steps ask for. They are not Ofsted's categories.

## Decisions for Mark

1. **Approve the fifteen themes below, or merge some.** The two I would merge first, if fewer are wanted: *Sixth form and post-16* into *Published outcomes* (it matched 2 of 300 items), and *Safeguarding and record-keeping* into *Leadership* (1 of 300). I have kept both because they will matter for secondary schools and for reports where safeguarding is not met, which the development sample may simply have missed.
2. **Keep "SEND, disadvantage and adaptation" as one theme, or split it in two** (SEND and adaptation; disadvantaged pupils and the pupil premium). One theme matches Ofsted's inclusion area. Two would show whether next steps name disadvantaged pupils separately.
3. **Agree the subject rule for Leadership** (below): who is asked to act is not what they are asked to do.

## How it was drafted

- **Sample.** 300 next-steps items drawn at random, with seed 20261128, from the 10,052 items in the 4,281 parsed reports. An item is one entry in a report's next-steps list, and can hold more than one sentence.
- **Blind reading.** A script outside the repository wrote only the item text to the file I read: no URN, grade, phase or month, and any grade word in the text was replaced with "[grade]". The key linking items to reports was written separately and not opened. The 300 items are excluded from the validation sample.
- **Derived from the text.** The themes come from what the 300 items ask for, not from a list set in advance.
- **No quotation.** Every example below is invented. No sentence from a report is reproduced here.

## Rules

- **Preparation.** Lower-case. Curly quotes and dashes normalised. A hyphen with spaces round it inside a word ("self - discipline", a PDF artefact) is closed up. "and or" becomes "and/or". Name-removal placeholders are removed.
- **Word boundaries.** Every keyword matches whole words only, so "read" does not match "ready" and "send" does not match "sending".
- **Stemming.** Explicit, never automatic. A keyword written below with \* takes any ending ("assess\*" matches assess, assessed, assessment). A keyword without \* matches only the forms listed.
- **Exclusions first.** Each theme's exclusions are blanked out of the item before its keywords are tried. An exclusion removes only the phrase it names, so an item can still match the theme through other words.
- **Subject rule (Leadership only).** The opening words of each sentence, up to "should", "must" or "need(s) to", are ignored for the Leadership theme. "Leaders and governors should improve phonics" is about phonics, not governance.
- **Multi-label.** An item carries every theme it matches. Themes are not exclusive and their shares do not sum to 100%.
- **Other.** An item that matches no theme is "other". The share of "other" is reported beside the themes.
- **Unit for the figures.** As the plan sets out, the published figure is the share of reports carrying each theme (a report carries a theme if any of its items does).
- **Authority.** `scripts/language/lexicons.py` holds the exact patterns and is what runs. This file states them in plain words. A difference between the two is a bug to fix before freezing; `scripts/language/test_lexicons.py` checks the rules on invented sentences.

## The themes

Share is the share of the 300 development items the draft matches. These shares are in-sample: the lexicon was tuned on these items, so they flatter it, especially the "other" share. The validation sample will give honest figures.

| Theme | Share of 300 items |
| --- | --- |
| Curriculum design and sequencing | 11.3% |
| Quality and consistency of teaching | 28.7% |
| Assessment, checking understanding and closing gaps | 19.3% |
| Reading, writing, language and number foundations | 17.0% |
| SEND, disadvantage and adaptation | 29.3% |
| Attendance and punctuality | 15.7% |
| Behaviour and attitudes | 6.7% |
| Personal development, wider curriculum and preparation for life | 8.7% |
| Early years | 6.7% |
| Sixth form and post-16 | 0.7% |
| Leadership oversight, evaluation and governance | 18.3% |
| Staff expertise, training and workload | 11.3% |
| Parents, families and partnerships | 4.3% |
| Published outcomes and attainment | 8.7% |
| Safeguarding and record-keeping | 0.3% |
| **Other (no theme)** | **1.0%** |

Of the 300 items, 118 matched one theme, 116 two, 47 three and 16 four or more.

### 1. Curriculum design and sequencing

*What is taught and in what order: setting out the knowledge, sequencing it, building on prior learning and helping pupils remember it.*

- **Include:** curriculum design\*, plan\*, structure\*, review\*, refine\*, content or areas; design\* or refine\* within a few words of curriculum; new, revised, renewed or recently implemented curriculum; sequenc\*; "order the knowledge"; essential, key, important, component or core knowledge; "identify the knowledge pupils should/need"; knowledge builds, build\* knowledge, build\* on prior/previous/what pupils know; prior or previous learning or knowledge; recall, recap, retriev\*, revisit\*, remember\*, retain\*; connect\* knowledge, well-connected.
- **Exclude:** personal development, PSHE or relationships curriculum (that is theme 8); early years curriculum (theme 9).
- *Invented examples:* "Leaders should set out the key knowledge in geography in the order pupils need it." "Leaders should make sure pupils revisit earlier topics so that they remember them."

### 2. Quality and consistency of teaching

*How well and how consistently the curriculum is taught: teaching quality, tasks and activities, expectations and ambition, depth.*

- **Include:** quality or consistency of teaching; high-quality, effective, consistent, strong or responsive teaching; "teaching is / across / consistently / supports / enables / varies"; variation in (the quality of) teaching; improve\*, strengthen\* or raise\* near teaching; deliver\* the curriculum; the curriculum is taught, delivered or implemented; implement\* or teach the curriculum; taught (consistently) well; learning, teaching or lesson activities and tasks; task(s); activities; expectation(s); ambiti\*; challenge pupils; deepen\*; depth of; modelling; presentation; quality of pupils' work.
- **Exclude:** extra-curricular activities; "depth of challenge" (governance); behaviour expectations and expectations of behaviour (theme 7).
- *Invented examples:* "Leaders should make sure that tasks in science match the ambition of the curriculum." "Leaders should reduce the variation in teaching between classes."

### 3. Assessment, checking understanding and closing gaps

*Finding out what pupils know and acting on it: checks on learning, misconceptions, errors, identifying and closing gaps, targets and tracking.*

- **Include:** assess\*; check\* within a few words of learning, understanding, understood, knowledge, what pupils know, progress or work; checking for understanding; misconception\*; misunderstanding\*; error(s); mistake(s); gaps in pupils' knowledge, learning, understanding or skills; close\* gaps; fall\* behind; what pupils (already) know; track\* or monitor\* progress; target(s).
- **Exclude:** national assessments (theme 14); assessing the school's effectiveness or performance, quality assurance, checking the quality or effectiveness of provision (theme 11); "the gap with non-disadvantaged pupils"; improvement targets.
- *Invented examples:* "Teachers should check what pupils have understood before moving on." "Staff should spot and correct errors in pupils' calculations quickly."

### 4. Reading, writing, language and number foundations

*The basics pupils need to learn everything else: phonics and early reading, handwriting, spelling and grammar, vocabulary and spoken language, number and the core subjects of English and mathematics.*

- **Include:** phonics; read, reading, reader(s); decod\*; write, writing, written, writer(s); handwriting; spell\*; punctuation; grammar; letter formation; transcription; vocabulary; oracy; speaking; spoken; communication and language; language and communication or language development; foundational; basic knowledge or skills; foundations in; number; numeracy; times table(s); multiplication; mathematics; maths; English; literacy.
- **Exclude:** English as an additional language and "speak English" (theme 5); "number of"; written feedback, policy or plans.
- *Invented examples:* "Leaders should make sure pupils who fall behind in phonics catch up quickly." "Staff should insist on accurate spelling and neat handwriting in all subjects."

### 5. SEND, disadvantage and adaptation

*Pupils who need more: SEND and EHC plans, disadvantaged pupils and the pupil premium, other barriers to learning, and adapting teaching or support to need.*

- **Include:** SEND; special educational needs; disabilit\*; EHC; education, health and care; additional, complex, highest, specific, identified, emerging, individual or diverse needs; pupils' needs; needs of pupils; adapt\*; adjustment(s); barrier(s); inclusi\*; alternative provision; specialist advice, provision or support; resourced provision; English as an additional language; disadvantage\*; pupil premium; additional funding; eligible pupils; vulnerable; social care; face additional challenges.
- **Exclude:** barriers to attendance and families' barriers (theme 6).
- *Invented examples:* "Leaders should make sure adaptations for pupils with SEND are used in every lesson." "Leaders should check that pupil premium funding makes a difference to disadvantaged pupils."

### 6. Attendance and punctuality

*Getting pupils to school, and on time.*

- **Include:** attendance; absen\*; punctual\*; attend school, more, regularly or frequently; miss school or learning; on time; lateness.
- **Exclude:** "attend alternative provision".
- *Invented examples:* "Leaders should reduce persistent absence among pupils in Year 9." "Leaders should work with families so that more pupils arrive on time."

### 7. Behaviour and attitudes

*Conduct and the habits of learning: behaviour policy and its consistency, suspensions, routines, self-discipline and self-regulation.*

- **Include:** behaviour\* (and behavior\*); suspen\*; exclusion(s), excluded; self-discipline; attitudes to learning; routines; disrupt\*; regulate emotions; self-regulat\*; conduct; calm; orderly; bullying; derogatory.
- **Exclude:** none.
- *Invented examples:* "Staff should apply the behaviour policy in the same way in every class." "Leaders should reduce the number of suspensions for pupils in key stage 3."

### 8. Personal development, wider curriculum and preparation for life

*Who pupils become beyond the classroom: PSHE and relationships education, British values and respect for difference, careers, wider opportunities, resilience and aspiration.*

- **Include:** personal development; personal, social (and health); PSHE\*; RSHE; relationships (and sex/health) education or curriculum; health education; British values; protected characteristics; career(s); employment; wider opportunities, development, experiences or curriculum; extra-curricular; enrichment; clubs; trips; educational visits; diversity; faith(s); cultures, cultural; modern Britain; respect; tolera\*; aspiration(s); resilien\*; life beyond school; citizenship; spiritual; mental health; communities; people from different (backgrounds).
- **Exclude:** school community (theme 13); "culture of" and "culture where" (a school's culture, not cultures).
- *Invented examples:* "Leaders should make sure pupils learn about different faiths in more depth." "Leaders should widen the clubs and trips on offer so that every pupil takes part."

### 9. Early years

*Nursery and Reception: the early years curriculum, adult interactions with children, and early language.*

- **Include:** early years; EYFS; Reception; nursery; foundation stage; younger or youngest children; two-year-old(s); pre-school; high-quality or adult interactions; interactions with children, between adults and children.
- **Exclude:** none.
- *Invented examples:* "Staff in Reception should use every conversation to build children's vocabulary." "Leaders should check that adults in the nursery extend children's play."

### 10. Sixth form and post-16

*Provision for students aged 16 to 19.*

- **Include:** post-16; sixth form, sixth-form; key stage 5; 16 to 19; study programme(s); students.
- **Exclude:** none. "Students" is included because next steps use it almost only for sixth-form students; this is a choice to check in validation.
- *Invented examples:* "Leaders should make sure sixth-form students receive their full study programme." "Leaders should improve how well students achieve in vocational courses."

### 11. Leadership oversight, evaluation and governance

*How leaders and those responsible for governance know the school and drive it: monitoring, evaluation, quality assurance, challenge and accountability, strategy and capacity.*

- **Subject rule:** the opening words up to "should", "must" or "need(s) to" are ignored for this theme.
- **Include:** govern\*; oversight; quality assur\*; evaluat\*; monitor\*; analys\*; support and challenge, effective, robust or well-informed challenge, depth of challenge; challenge to or for leaders; to account; accountab\*; strategic; school improvement; improvement priorities, plans, actions, work, journey or strategies; areas of improvement; drive improvement; capacity; leaders or leadership at all levels; middle, subject or senior leaders; area of responsibility; check\* the quality, effectiveness or impact; checked and challenged; scrutin\*; the trust; trust board or leaders; interim executive board; systems and processes; impact of their (or the school's) work, actions, plans or strategies; leaders' actions.
- **Exclude:** "build trust".
- *Invented examples:* "Governors should ask sharper questions about the impact of the school's plans." "Leaders should evaluate whether recent changes are making a difference."

### 12. Staff expertise, training and workload

*What staff know and how they are supported: subject knowledge and expertise, training and professional development, staff confidence, and workload.*

- **Include:** expertise; subject knowledge; professional learning or development; training; CPD; staff's knowledge, staff knowledge; equip\*; guidance; staff or teachers within a few words of confiden\*; staff confidence; staff or teachers have, receive, develop or gain knowledge, skills or expertise; workload; unreasonable amount of work; staff wellbeing, wellbeing of staff; share effective practice.
- **Exclude:** "education, employment or training" and "education, employment" (pupils' destinations); equip pupils or children.
- *Invented examples:* "Leaders should give teachers of computing the training they need." "Leaders should reduce tasks that add to staff workload without helping pupils."

### 13. Parents, families and partnerships

*Working with parents, carers, families and the community, and with other schools and agencies.*

- **Include:** parent(s); carers; family, families; school, wider, local or the community; community's; stakeholders; external agencies; partnership(s); other, mainstream or special schools.
- **Exclude:** none.
- *Invented examples:* "Leaders should tell parents earlier when their child's support changes." "Leaders should build links with local employers and other schools."

### 14. Published outcomes and attainment

*Results: attainment, published outcomes, national tests and examinations, qualifications, and raising achievement as an outcome.*

- **Include:** outcomes; attainment; published; national tests, assessments, average(s) or curriculum tests; nationally; examination\*; exam(s); GCSE(s); qualification(s); results; end of key stage; standards of attainment; improve\* or raise\* within a few words of achievement; achievement improves or continues to improve.
- **Exclude:** curriculum outcomes (what a lesson should achieve); attendance compared with national averages (theme 6).
- *Invented examples:* "Leaders should raise attainment in mathematics at the end of key stage 2." "Leaders should make sure more pupils gain a qualification in a science."

### 15. Safeguarding and record-keeping

*Keeping pupils safe and the records that show it.*

- **Include:** safeguard\*; child protection; record-keeping; record(s), except "records of attendance"; recruitment, safer recruitment; single central record; keep pupils safe; risk assessment(s); online safety; designated safeguarding (lead).
- **Exclude:** "track record".
- *Invented examples:* "Leaders should keep complete records of the checks made on visitors." "Leaders should check that recruitment checks are complete before staff start."

## Themes I am least sure about

- **Quality and consistency of teaching (28.7%).** The widest net. "Task", "activities", "expectations" and "deepen" are common in next steps that are really about something narrower, so this theme will catch many items that also carry a more specific one. Precision may be fine and the theme still too broad to be useful.
- **Leadership oversight (18.3%).** "Monitor", "evaluate" and "analyse" appear in items whose real subject is attendance or SEND ("analyse attendance patterns"). The subject rule removes the commonest false match, but not these.
- **Curriculum design versus teaching.** The line is my own. An item about "tasks that match the curriculum" sits on it, and the hand labels may not agree with where I drew it.
- **Sixth form and Safeguarding.** Too rare in the sample to judge. Most of their keywords come from the usual vocabulary of those areas, not from items read.
- **Assessment.** "Gaps in knowledge" is shared with theme 4 when the gaps are in phonics or handwriting. Both themes fire, which is intended, but it makes the two harder to read apart.

## What happens next

1. Mark reviews this draft. Changes are made here, and the tests updated.
2. Freeze: rename to `next-steps-lexicon-v1.md`, set `LEXICON_VERSION = 'v1'`, commit before any count.
3. Validation, as in the plan and Amendment 1: a fresh random 100 items (not these 300), labelled by hand under written rules, without grades, deprivation or results in view. Precision and recall for each theme; a theme below 0.8 precision carries that warning on the page. Mark checks a random 30 of the labels and the agreement rate is reported.
