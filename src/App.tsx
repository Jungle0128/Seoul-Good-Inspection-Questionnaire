import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { submissionTable, supabase, supabaseConfigured } from './lib/supabase'
import { rubricSections, rubricVersion, type RubricQuestion } from './rubric'

type AnswerMap = Record<string, number | null>

type NoticeTone = 'success' | 'warning' | 'error' | 'info'

type Notice = {
  tone: NoticeTone
  message: string
}

type PreviewMode = 'csv' | 'pdf'

const today = new Date().toISOString().slice(0, 10)

function buildInitialAnswers(): AnswerMap {
  return rubricSections.reduce<AnswerMap>((accumulator, section) => {
    section.questions.forEach((question) => {
      accumulator[question.id] = null
    })

    return accumulator
  }, {})
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function buildSubmissionRows(params: {
  inspectorName: string
  storeName: string
  inspectionDate: string
  answers: AnswerMap
}) {
  const questionRows = rubricSections.flatMap((section) =>
    section.questions.map((question) => ({
      section_title: section.title,
      question_label: question.label,
      score: params.answers[question.id] ?? 0,
      max_score: question.maxScore,
    })),
  )

  const sectionRows = rubricSections.map((section) => {
    const sectionScores = section.questions.map((question) => params.answers[question.id] ?? 0)
    const answeredCount = section.questions.filter((question) => params.answers[question.id] !== null).length

    return {
      section_title: section.title,
      score: sectionScores.reduce((sum, score) => sum + score, 0),
      max_score: section.questions.reduce((sum, question) => sum + question.maxScore, 0),
      answered_count: answeredCount,
    }
  })

  return { questionRows, sectionRows }
}

function buildCsvPreview(params: {
  inspectorName: string
  storeName: string
  inspectionDate: string
  overallNotes: string
  answers: AnswerMap
}) {
  const { questionRows, sectionRows } = buildSubmissionRows(params)
  const headers = [
    'inspection_date',
    'inspector_name',
    'store_name',
    'section_title',
    'question_label',
    'score',
    'max_score',
    'overall_notes',
  ]

  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...questionRows.map((row) =>
      [
        params.inspectionDate,
        params.inspectorName,
        params.storeName,
        row.section_title,
        row.question_label,
        String(row.score),
        String(row.max_score),
        params.overallNotes || '',
      ]
        .map(escapeCsvValue)
        .join(','),
    ),
    '',
    'section_summary,score,max_score,answered_count',
    ...sectionRows.map((row) =>
      [row.section_title, String(row.score), String(row.max_score), String(row.answered_count)]
        .map(escapeCsvValue)
        .join(','),
    ),
  ]

  return lines.join('\n')
}

function buildPdfBlob(
  PdfDocument: typeof import('jspdf').jsPDF,
  params: {
    inspectorName: string
    storeName: string
    inspectionDate: string
    totalScore: number
    maxScore: number
    scorePercent: number
    completionPercent: number
    overallNotes: string
    sectionStats: Array<{
      title: string
      sectionScore: number
      sectionMaxScore: number
      answeredCount: number
      questions: Array<{ label: string; score: number; maxScore: number }>
    }>
  },
) {
  const doc = new PdfDocument({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 40
  const contentWidth = pageWidth - marginX * 2
  const lineHeight = 16
  let cursorY = 46

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 44) {
      doc.addPage()
      cursorY = 46
    }
  }

  const writeLine = (text: string, size = 11, bold = false, gapAfter = 0) => {
    ensureSpace(lineHeight + gapAfter)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, contentWidth)
    doc.text(lines, marginX, cursorY)
    cursorY += Array.isArray(lines) ? lines.length * lineHeight : lineHeight
    cursorY += gapAfter
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Shop inspection summary', marginX, cursorY)
  cursorY += 28

  writeLine(`Inspector: ${params.inspectorName}`, 11, false)
  writeLine(`Store: ${params.storeName}`, 11, false)
  writeLine(`Inspection date: ${params.inspectionDate}`, 11, false, 4)

  writeLine(`Score: ${params.totalScore}/${params.maxScore} (${formatPercent(params.scorePercent)})`, 12, true)
  writeLine(`Completion: ${formatPercent(params.completionPercent)}`, 11, false, 10)

  params.sectionStats.forEach((section) => {
    ensureSpace(70)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(section.title, marginX, cursorY)
    cursorY += 18

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(
      `${section.sectionScore}/${section.sectionMaxScore} total | ${section.answeredCount}/${section.questions.length} answered`,
      marginX,
      cursorY,
    )
    cursorY += 18

    section.questions.forEach((question) => {
      ensureSpace(24)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const questionLines = doc.splitTextToSize(`${question.label}: ${question.score}/${question.maxScore}`, contentWidth)
      doc.text(questionLines, marginX + 10, cursorY)
      cursorY += Array.isArray(questionLines) ? questionLines.length * lineHeight : lineHeight
    })

    cursorY += 8
  })

  if (params.overallNotes.trim()) {
    ensureSpace(80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Overall notes', marginX, cursorY)
    cursorY += 18
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const noteLines = doc.splitTextToSize(params.overallNotes.trim(), contentWidth)
    doc.text(noteLines, marginX, cursorY)
  }

  return doc.output('blob')
}

function ScoreButtons({
  question,
  value,
  onChange,
}: {
  question: RubricQuestion
  value: number | null
  onChange: (score: number) => void
}) {
  const options = Array.from({ length: question.maxScore + 1 }, (_, index) => index)

  return (
    <div className="score-group" role="radiogroup" aria-label={question.label}>
      {options.map((score) => {
        const active = value === score

        return (
          <button
            key={score}
            type="button"
            className={active ? 'score-option score-option-active' : 'score-option'}
            aria-pressed={active}
            onClick={() => onChange(score)}
          >
            {score}
          </button>
        )
      })}
    </div>
  )
}

function App() {
  const [inspectorName, setInspectorName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [inspectionDate, setInspectionDate] = useState(today)
  const [overallNotes, setOverallNotes] = useState('')
  const [answers, setAnswers] = useState<AnswerMap>(() => buildInitialAnswers())
  const [submitting, setSubmitting] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [notice, setNotice] = useState<Notice>(() =>
    supabaseConfigured
      ? {
          tone: 'info',
          message:
            'Edit src/rubric.ts to add, remove, or reorder scoring items without changing the UI.',
        }
      : {
          tone: 'warning',
          message:
            'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable submission saving.',
        },
  )
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const allQuestions = useMemo(
    () => rubricSections.flatMap((section) => section.questions.map((question) => ({ section, question }))),
    [],
  )

  const sectionStats = useMemo(
    () =>
      rubricSections.map((section) => {
        const sectionAnswers = section.questions.map((question) => answers[question.id])
        const answeredCount = sectionAnswers.filter((score) => score !== null).length
        const sectionScore = sectionAnswers.reduce<number>((sum, score) => sum + (score ?? 0), 0)
        const sectionMaxScore = section.questions.reduce((sum, question) => sum + question.maxScore, 0)

        return {
          section,
          answeredCount,
          sectionScore,
          sectionMaxScore,
        }
      }),
    [answers],
  )

  const totalQuestions = allQuestions.length
  const answeredCount = allQuestions.filter(({ question }) => answers[question.id] !== null).length
  const missingQuestions = allQuestions.filter(({ question }) => answers[question.id] === null)
  const totalScore = allQuestions.reduce((sum, { question }) => sum + (answers[question.id] ?? 0), 0)
  const maxScore = allQuestions.reduce((sum, { question }) => sum + question.maxScore, 0)
  const completionPercent = totalQuestions === 0 ? 0 : (answeredCount / totalQuestions) * 100
  const scorePercent = maxScore === 0 ? 0 : (totalScore / maxScore) * 100
  const allFieldsFilled = Boolean(inspectorName.trim() && storeName.trim() && inspectionDate.trim())

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl('')
    setPreviewContent('')
    setPreviewMode(null)
  }

  const openCsvPreview = () => {
    const csv = buildCsvPreview({
      inspectorName: inspectorName.trim() || 'Not entered',
      storeName: storeName.trim() || 'Not entered',
      inspectionDate,
      overallNotes,
      answers,
    })

    setPreviewContent(csv)
    setPreviewMode('csv')
  }

  const openPdfPreview = async () => {
    try {
      const { jsPDF } = await import('jspdf')

      const blob = buildPdfBlob(jsPDF, {
        inspectorName: inspectorName.trim() || 'Not entered',
        storeName: storeName.trim() || 'Not entered',
        inspectionDate,
        totalScore,
        maxScore,
        scorePercent,
        completionPercent,
        overallNotes,
        sectionStats: sectionStats.map((section) => ({
          title: section.section.title,
          sectionScore: section.sectionScore,
          sectionMaxScore: section.sectionMaxScore,
          answeredCount: section.answeredCount,
          questions: section.section.questions.map((question) => ({
            label: question.label,
            score: answers[question.id] ?? 0,
            maxScore: question.maxScore,
          })),
        })),
      })

      const url = URL.createObjectURL(blob)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(url)
      setPreviewContent('')
      setPreviewMode('pdf')
    } catch {
      setNotice({
        tone: 'error',
        message: 'PDF preview could not be loaded. Try again or use the CSV preview.',
      })
    }
  }

  const setQuestionScore = (questionId: string, score: number) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: score,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!allFieldsFilled) {
      setNotice({ tone: 'error', message: 'Inspector, store, and date are required.' })
      return
    }

    if (missingQuestions.length > 0) {
      setNotice({
        tone: 'error',
        message: `Please score all ${missingQuestions.length} remaining question(s) before submitting.`,
      })
      return
    }

    if (!supabaseConfigured || !supabase) {
      setNotice({
        tone: 'warning',
        message: 'Supabase is not configured yet. Set the environment variables before saving.',
      })
      return
    }

    const { questionRows: answerRows, sectionRows } = buildSubmissionRows({
      inspectorName,
      storeName,
      inspectionDate,
      answers,
    })

    const answerSummary = rubricSections
      .map((section) => {
        const sectionLines = section.questions.map((question) => {
          const score = answers[question.id] ?? 0
          return `- ${question.label}: ${score}/${question.maxScore}`
        })

        return [section.title, ...sectionLines].join('\n')
      })
      .join('\n\n')

    const sectionSummary = sectionStats
      .map(
        ({ section, sectionScore, sectionMaxScore, answeredCount: sectionAnswered }) =>
          `${section.title}: ${sectionScore}/${sectionMaxScore} (${sectionAnswered}/${section.questions.length})`,
      )
      .join(' | ')

    setSubmitting(true)
    setNotice({ tone: 'info', message: `Saving to ${submissionTable}...` })

    try {
      const { error } = await supabase.from(submissionTable).insert([
        {
          inspection_date: inspectionDate,
          inspector_name: inspectorName.trim(),
          store_name: storeName.trim(),
          rubric_version: rubricVersion,
          total_score: totalScore,
          max_score: maxScore,
          score_percent: Number(scorePercent.toFixed(2)),
          answered_count: answeredCount,
          total_questions: totalQuestions,
          overall_notes: overallNotes.trim() || null,
          answer_summary: answerSummary,
          section_summary: sectionSummary,
          answers: answerRows,
          section_scores: sectionRows,
        },
      ])

      if (error) {
        throw error
      }

      const savedAt = new Date().toLocaleString()
      setLastSavedAt(savedAt)
      setNotice({
        tone: 'success',
        message: `Submission saved successfully at ${savedAt}.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Supabase error.'
      setNotice({
        tone: 'error',
        message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const previewTitle = previewMode === 'csv' ? 'CSV preview' : 'PDF preview'

  return (
    <div className="page-shell">
      <div className="page-backdrop page-backdrop-one" />
      <div className="page-backdrop page-backdrop-two" />

      <main className="app-layout">
        <section className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">Netlify-ready inspection scoring form</div>
            <h1>Shop inspection sheet built for fast audits.</h1>
            <p className="hero-text">
              Capture the inspector, store, and date, then score every rubric item in a layout that is
              easy to extend and easy to read in Supabase.
            </p>
            <div className="hero-badges">
              <span className="badge badge-strong">Static hosting</span>
              <span className={supabaseConfigured ? 'badge badge-success' : 'badge badge-warning'}>
                {supabaseConfigured ? 'Supabase connected' : 'Supabase env missing'}
              </span>
              <span className="badge">Rubric version {rubricVersion}</span>
            </div>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-label">Score</span>
              <strong>
                {totalScore}/{maxScore}
              </strong>
              <span>{formatPercent(scorePercent)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Progress</span>
              <strong>
                {answeredCount}/{totalQuestions}
              </strong>
              <span>{formatPercent(completionPercent)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Saved</span>
              <strong>{lastSavedAt ?? 'Not yet'}</strong>
              <span>Supabase row insert</span>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <form className="form-column" onSubmit={handleSubmit}>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Inspection details</h2>
                  <p>Capture the metadata for each store visit.</p>
                </div>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Inspector</span>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(event) => setInspectorName(event.target.value)}
                    placeholder="e.g. Anna Lee"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="field">
                  <span>Store</span>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
                    placeholder="e.g. Downtown Flagship"
                    autoComplete="organization"
                    required
                  />
                </label>

                <label className="field field-wide">
                  <span>Inspection date</span>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(event) => setInspectionDate(event.target.value)}
                    required
                  />
                </label>
              </div>
            </section>

            {rubricSections.map((section) => {
              const sectionSummaryItem = sectionStats.find((item) => item.section.id === section.id)

              return (
                <section key={section.id} className="panel section-panel">
                  <div className="panel-header">
                    <div>
                      <h2>{section.title}</h2>
                      <p>{section.summary}</p>
                    </div>
                    <span className="section-score-pill">
                      {sectionSummaryItem?.sectionScore ?? 0}/{sectionSummaryItem?.sectionMaxScore ?? 0}
                    </span>
                  </div>

                  <div className="question-list">
                    {section.questions.map((question) => (
                      <article key={question.id} className="question-card">
                        <div className="question-copy">
                          <h3>{question.label}</h3>
                          <p>{question.description}</p>
                        </div>
                        <ScoreButtons
                          question={question}
                          value={answers[question.id]}
                          onChange={(score) => setQuestionScore(question.id, score)}
                        />
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Inspector notes</h2>
                  <p>Optional comments that should travel with the submission row.</p>
                </div>
              </div>

              <div className="field-grid">
                <label className="field field-wide">
                  <span>Overall notes</span>
                  <textarea
                    value={overallNotes}
                    onChange={(event) => setOverallNotes(event.target.value)}
                    placeholder="Highlight urgent fixes, strengths, or follow-up tasks..."
                    rows={5}
                  />
                </label>
              </div>
            </section>

            <div
              className={
                notice.tone === 'error'
                  ? 'notice notice-error'
                  : notice.tone === 'success'
                    ? 'notice notice-success'
                    : notice.tone === 'warning'
                      ? 'notice notice-warning'
                      : 'notice notice-info'
              }
            >
              <strong>
                {notice.tone === 'success'
                  ? 'Saved'
                  : notice.tone === 'error'
                    ? 'Check before submitting'
                    : notice.tone === 'warning'
                      ? 'Configuration needed'
                      : 'Working draft'}
              </strong>
              <span>{notice.message}</span>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save submission to Supabase'}
              </button>
              <div className="form-help">
                <span>{missingQuestions.length} question(s) remaining</span>
                <span>{allFieldsFilled ? 'Metadata complete' : 'Metadata incomplete'}</span>
              </div>
            </div>
          </form>

          <aside className="summary-column">
            <section className="panel summary-panel">
              <div className="panel-header">
                <div>
                  <h2>Live summary</h2>
                  <p>A quick view of the current inspection status.</p>
                </div>
              </div>

              <div className="summary-metrics">
                <div className="summary-chip">
                  <span>Total score</span>
                  <strong>
                    {totalScore}/{maxScore}
                  </strong>
                </div>
                <div className="summary-chip">
                  <span>Completion</span>
                  <strong>{formatPercent(completionPercent)}</strong>
                </div>
                <div className="summary-chip">
                  <span>Answered items</span>
                  <strong>
                    {answeredCount}/{totalQuestions}
                  </strong>
                </div>
              </div>

              <div className="summary-progress">
                <div className="summary-progress-track">
                  <span style={{ width: `${completionPercent}%` }} />
                </div>
                <p>
                  {missingQuestions.length === 0
                    ? 'All questions are scored and ready to save.'
                    : 'Finish the remaining scores to unlock submission.'}
                </p>
              </div>

              <div className="summary-list">
                {sectionStats.map(({ section, sectionScore, sectionMaxScore, answeredCount: sectionAnswered }) => (
                  <div key={section.id} className="summary-row">
                    <div>
                      <strong>{section.title}</strong>
                      <span>{sectionAnswered}/{section.questions.length} scored</span>
                    </div>
                    <strong>
                      {sectionScore}/{sectionMaxScore}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel summary-panel">
              <div className="panel-header">
                <div>
                  <h2>Supabase table shape</h2>
                  <p>The insertion payload keeps the row easy to inspect in the dashboard.</p>
                </div>
              </div>

              <div className="preview-actions">
                <button type="button" className="secondary-button" onClick={openCsvPreview}>
                  Preview CSV
                </button>
                <button type="button" className="secondary-button" onClick={openPdfPreview}>
                  Preview PDF
                </button>
              </div>

              <p className="summary-note">
                The preview uses the current form state, so inspectors can verify the output before saving.
              </p>

              <div className="table-fields">
                <span>inspection_date</span>
                <span>inspector_name</span>
                <span>store_name</span>
                <span>total_score</span>
                <span>max_score</span>
                <span>score_percent</span>
                <span>answered_count</span>
                <span>total_questions</span>
                <span>section_summary</span>
                <span>answer_summary</span>
                <span>overall_notes</span>
                <span>answers</span>
                <span>section_scores</span>
              </div>

              <p className="summary-note">
                Update src/rubric.ts to add custom rubric items, then keep the same submission table.
              </p>
            </section>
          </aside>
        </div>
      </main>

      {previewMode && (
        <div className="preview-overlay" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={closePreview}>
          <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="preview-modal-header">
              <div>
                <span className="preview-kicker">Direct online preview</span>
                <h2 id="preview-title">{previewTitle}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={closePreview}>
                Close
              </button>
            </div>

            {previewMode === 'csv' ? (
              <div className="csv-preview-panel">
                <p className="preview-caption">Copy or inspect the CSV payload that would be stored for this submission.</p>
                <pre className="csv-preview">{previewContent}</pre>
              </div>
            ) : (
              <div className="pdf-preview-panel">
                <p className="preview-caption">This PDF is generated in the browser and rendered through the built-in viewer.</p>
                <iframe className="pdf-preview-frame" src={previewUrl} title="PDF preview" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
