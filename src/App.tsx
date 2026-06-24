import { Fragment, type FormEvent, useEffect, useId, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { submissionTable, supabase, supabaseConfigured } from './lib/supabase'
import { rubricSections, rubricVersion, type RubricQuestion } from './rubric'

type CheckboxAnswer = Record<string, boolean>

type AnswerValue = number | boolean | CheckboxAnswer | null

type AnswerMap = Record<string, AnswerValue>

type NoticeTone = 'success' | 'warning' | 'error' | 'info'

type Notice = {
  tone: NoticeTone
  message: string
}

type PreviewMode = 'png' | 'pdf'

const storeOptions = [
  'SG Lippulaiva',
  'SG Kaari',
  'SG Skanssi',
  'SG Iso Omena',
  'SG Mylly',
  'SG Hansa',
  'SG Itis',
  'SG Ideapark Seinäjoki',
  'SG Seppä',
  'SG Matkus',
  'SG Karisma',
  'SG Valkea',
  'SG Ratina',
  'SG Koskikeskus',
  'SG Sello',
  'SG Ideapark Lempälä',
  'SG Redi',
  'SG Kluuvi',
  'SG Ideapark Oulu',
  'SG Puuvilla Pori',
  'SG Kamppi',
] as const

function getCurrentLocalDateTimeValue() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

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

function isBooleanQuestion(question: RubricQuestion) {
  return question.answerType === 'boolean'
}

function isNormalBooleanQuestion(question: RubricQuestion) {
  return question.booleanScoring === 'normal'
}

function isCheckboxQuestion(question: RubricQuestion) {
  return question.answerType === 'checkboxes'
}

function getCheckboxOptions(question: RubricQuestion): string[] {
  return question.checkboxOptions ?? ['美观新鲜度', '出餐量', '按标准搭配']
}

function getInitialCheckboxAnswer(question: RubricQuestion): CheckboxAnswer {
  return Object.fromEntries(getCheckboxOptions(question).map((option) => [option, false]))
}

function CheckboxGroup({
  question,
  value,
  onChange,
}: {
  question: RubricQuestion
  value: AnswerValue
  onChange: (answer: CheckboxAnswer) => void
}) {
  const options = getCheckboxOptions(question)

  const current = value && typeof value === 'object' && !Array.isArray(value) ? (value as CheckboxAnswer) : getInitialCheckboxAnswer(question)

  return (
    <div className="checkbox-score-group" role="group" aria-label={question.label}>
      {options.map((optionLabel) => {
        const checked = Boolean(current[optionLabel])

        return (
          <label
            key={optionLabel}
            className={checked ? 'checkbox-score-option checkbox-score-option-active' : 'checkbox-score-option'}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange({ ...current, [optionLabel]: !checked })}
            />
            <span>{optionLabel}</span>
          </label>
        )
      })}
    </div>
  )
}

function getQuestionScore(question: RubricQuestion, answer: AnswerValue): number {
  if (isCheckboxQuestion(question)) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      return 0
    }

    return Object.values(answer).filter(Boolean).length
  }

  if (isBooleanQuestion(question)) {
    if (isNormalBooleanQuestion(question)) {
      return answer === true ? question.maxScore : 0
    }

    return answer === true ? 0 : question.maxScore
  }

  return typeof answer === 'number' ? answer : 0
}

function formatQuestionAnswer(question: RubricQuestion, answer: AnswerValue): string {
  if (isCheckboxQuestion(question)) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      return `未选择（0/${question.maxScore}）`
    }

    const selectedLabels = getCheckboxOptions(question).filter((option) => answer[option])

    if (selectedLabels.length === 0) {
      return `未选择（0/${question.maxScore}）`
    }

    return `${selectedLabels.join('、')}（${selectedLabels.length}/${question.maxScore}）`
  }

  if (isBooleanQuestion(question)) {
    const yesScore = isNormalBooleanQuestion(question) ? question.maxScore : 0
    const noScore = isNormalBooleanQuestion(question) ? 0 : question.maxScore

    if (answer === true) {
      return `是（${yesScore}/${question.maxScore}）`
    }

    if (answer === false) {
      return `否（${noScore}/${question.maxScore}）`
    }

    return `未选择（${noScore}/${question.maxScore}）`
  }

  if (typeof answer === 'number') {
    return `${answer}/${question.maxScore}`
  }

  return `未评分（0/${question.maxScore}）`
}

function buildSubmissionRows(params: {
  inspectorName: string
  storeName: string
  inspectionDate: string
  answers: AnswerMap
  labelOverrides?: Record<string, string>
  questionNotes?: Record<string, string>
}) {
  const questionRows = rubricSections.flatMap((section) =>
    section.questions.map((question) => ({
      section_title: section.title,
      question_label: params.labelOverrides && params.labelOverrides[question.id] ? params.labelOverrides[question.id] : question.label,
      score: getQuestionScore(question, params.answers[question.id]),
      max_score: question.maxScore,
      note: params.questionNotes?.[question.id]?.trim() ?? '',
    })),
  )

  const sectionRows = rubricSections.map((section) => {
    const sectionScores = section.questions.map((question) => getQuestionScore(question, params.answers[question.id]))
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

type SummaryRenderParams = {
  inspectorName: string
  storeName: string
  inspectionDate: string
  totalScore: number
  maxScore: number
  scorePercent: number
  completionPercent: number
  operationSuggestions: string
  storeFeedback: string
  sectionStats: Array<{
    title: string
    sectionScore: number
    sectionMaxScore: number
    answeredCount: number
    questions: Array<{ label: string; score: number; maxScore: number; note?: string }>
  }>
}

function buildSummaryCanvas(params: SummaryRenderParams): HTMLCanvasElement {
  const width = 1500
  const padX = 76
  const padTop = 76
  const padBottom = 72
  const contentW = width - padX * 2
  const fontFamily = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif'

  const accent = '#0f766e'
  const accentSoft = '#cdeee7'
  const ink = '#0f172a'
  const inkSoft = '#475569'
  const muted = '#94a3b8'
  const divider = '#e5e7eb'

  const measureCanvas = document.createElement('canvas')
  measureCanvas.width = width
  measureCanvas.height = 1
  const measureContext = measureCanvas.getContext('2d')

  if (!measureContext) {
    throw new Error('无法创建渲染画布。')
  }

  measureContext.textBaseline = 'top'

  const fontString = (size: number, weight: number) => `${weight} ${size}px ${fontFamily}`

  const measureWidth = (text: string, size: number, weight: number) => {
    measureContext.font = fontString(size, weight)
    return measureContext.measureText(text).width
  }

  const wrap = (text: string, size: number, weight: number, maxWidth: number) => {
    measureContext.font = fontString(size, weight)
    const lines: string[] = []

    text.split('\n').forEach((paragraph) => {
      if (!paragraph) {
        lines.push('')
        return
      }

      let currentLine = ''

      Array.from(paragraph).forEach((character) => {
        const nextLine = currentLine + character
        if (measureContext.measureText(nextLine).width <= maxWidth || !currentLine) {
          currentLine = nextLine
        } else {
          lines.push(currentLine)
          currentLine = character
        }
      })

      if (currentLine) {
        lines.push(currentLine)
      }
    })

    return lines.length > 0 ? lines : ['']
  }

  type Primitive =
    | { kind: 'rect'; x: number; y: number; w: number; h: number; radius: number; fill: string }
    | { kind: 'text'; x: number; y: number; text: string; size: number; weight: number; color: string }
    | { kind: 'line'; x: number; y: number; w: number; color: string; thickness: number }

  const primitives: Primitive[] = []
  let y = padTop

  const drawParagraph = (
    text: string,
    options: { size: number; weight?: number; color?: string; maxWidth?: number; lineHeight?: number; gapAfter?: number },
  ) => {
    const weight = options.weight ?? 400
    const color = options.color ?? ink
    const maxWidth = options.maxWidth ?? contentW
    const lineHeight = options.lineHeight ?? options.size * 1.5
    const lines = wrap(text, options.size, weight, maxWidth)

    lines.forEach((line) => {
      primitives.push({ kind: 'text', x: padX, y, text: line, size: options.size, weight, color })
      y += lineHeight
    })

    y += options.gapAfter ?? 0
  }

  const bandHeight = 74

  const drawSectionBand = (title: string, rightText?: string) => {
    primitives.push({ kind: 'rect', x: padX, y, w: contentW, h: bandHeight, radius: 20, fill: accent })
    primitives.push({ kind: 'text', x: padX + 32, y: y + (bandHeight - 34) / 2, text: title, size: 34, weight: 700, color: '#ffffff' })

    if (rightText) {
      primitives.push({
        kind: 'text',
        x: padX + contentW - 32 - measureWidth(rightText, 26, 600),
        y: y + (bandHeight - 26) / 2,
        text: rightText,
        size: 26,
        weight: 600,
        color: accentSoft,
      })
    }

    y += bandHeight + 16
  }

  // ---- Header ----
  const eyebrowText = 'SEOUL GOOD · 巡店报告'
  const eyebrowSize = 24
  const eyebrowHeight = 50
  const eyebrowWidth = measureWidth(eyebrowText, eyebrowSize, 700) + 48
  primitives.push({ kind: 'rect', x: padX, y, w: eyebrowWidth, h: eyebrowHeight, radius: eyebrowHeight / 2, fill: accent })
  primitives.push({
    kind: 'text',
    x: padX + 24,
    y: y + (eyebrowHeight - eyebrowSize) / 2 - 1,
    text: eyebrowText,
    size: eyebrowSize,
    weight: 700,
    color: '#ffffff',
  })
  y += eyebrowHeight + 26

  drawParagraph('巡店评分汇总', { size: 62, weight: 800, color: ink, lineHeight: 74, gapAfter: 14 })
  drawParagraph(
    `门店：${params.storeName}　｜　检查员：${params.inspectorName}　｜　检查日期：${params.inspectionDate}`,
    { size: 28, weight: 500, color: inkSoft, lineHeight: 44, gapAfter: 34 },
  )

  // ---- Summary cards ----
  const totalAnswered = params.sectionStats.reduce((sum, section) => sum + section.answeredCount, 0)
  const totalQuestionCount = params.sectionStats.reduce((sum, section) => sum + section.questions.length, 0)

  const cards = [
    { label: '综合评分', value: `${params.totalScore}/${params.maxScore}`, sub: formatPercent(params.scorePercent) },
    { label: '完成进度', value: formatPercent(params.completionPercent), sub: `${totalAnswered}/${totalQuestionCount} 题已答` },
    { label: '已答题目', value: `${totalAnswered}/${totalQuestionCount}`, sub: `共 ${params.sectionStats.length} 个板块` },
  ]

  const cardGap = 26
  const cardWidth = (contentW - cardGap * 2) / 3
  const cardHeight = 168
  const cardTop = y

  cards.forEach((card, index) => {
    const cardX = padX + index * (cardWidth + cardGap)
    primitives.push({ kind: 'rect', x: cardX, y: cardTop, w: cardWidth, h: cardHeight, radius: 26, fill: '#f1f5f9' })
    primitives.push({ kind: 'text', x: cardX + 34, y: cardTop + 30, text: card.label, size: 26, weight: 600, color: '#64748b' })
    primitives.push({ kind: 'text', x: cardX + 34, y: cardTop + 72, text: card.value, size: 48, weight: 800, color: ink })
    primitives.push({ kind: 'text', x: cardX + 34, y: cardTop + 132, text: card.sub, size: 24, weight: 600, color: accent })
  })

  y = cardTop + cardHeight + 48

  // ---- Sections ----
  const rowPadX = 30

  params.sectionStats.forEach((section) => {
    drawSectionBand(
      section.title,
      `${section.sectionScore}/${section.sectionMaxScore} 分 · ${section.answeredCount}/${section.questions.length} 已答`,
    )

    const labelSize = 29
    const scoreSize = 29
    const noteSize = 25
    const labelLineHeight = labelSize * 1.4
    const noteLineHeight = noteSize * 1.4
    const scoreColumnWidth = 150
    const labelMaxWidth = contentW - rowPadX * 2 - scoreColumnWidth

    section.questions.forEach((question, questionIndex) => {
      const labelLines = wrap(question.label.trim() || '（未命名）', labelSize, 500, labelMaxWidth)
      const trimmedNote = question.note?.trim()
      const noteLines = trimmedNote ? wrap(`备注：${trimmedNote}`, noteSize, 400, contentW - rowPadX * 2) : []

      const rowPadY = 18
      const rowContentHeight =
        labelLines.length * labelLineHeight + (noteLines.length > 0 ? 8 + noteLines.length * noteLineHeight : 0)
      const rowHeight = rowPadY * 2 + rowContentHeight

      if (questionIndex % 2 === 1) {
        primitives.push({ kind: 'rect', x: padX, y, w: contentW, h: rowHeight, radius: 14, fill: '#f8fafc' })
      }

      let textY = y + rowPadY
      labelLines.forEach((line) => {
        primitives.push({ kind: 'text', x: padX + rowPadX, y: textY, text: line, size: labelSize, weight: 500, color: '#1f2937' })
        textY += labelLineHeight
      })

      const scoreText = `${question.score}/${question.maxScore}`
      const scoreColor =
        question.maxScore > 0 && question.score >= question.maxScore
          ? '#15803d'
          : question.score === 0
            ? '#b91c1c'
            : '#b45309'
      primitives.push({
        kind: 'text',
        x: padX + contentW - rowPadX - measureWidth(scoreText, scoreSize, 700),
        y: y + rowPadY,
        text: scoreText,
        size: scoreSize,
        weight: 700,
        color: scoreColor,
      })

      if (noteLines.length > 0) {
        textY += 8
        noteLines.forEach((line) => {
          primitives.push({ kind: 'text', x: padX + rowPadX, y: textY, text: line, size: noteSize, weight: 400, color: '#6b7280' })
          textY += noteLineHeight
        })
      }

      y += rowHeight

      if (questionIndex < section.questions.length - 1) {
        primitives.push({ kind: 'line', x: padX + rowPadX, y, w: contentW - rowPadX * 2, color: divider, thickness: 1 })
      }
    })

    y += 42
  })

  // ---- Free-text sections ----
  const drawTextSection = (title: string, body: string) => {
    drawSectionBand(title)
    const pad = 32
    const bodySize = 28
    const lineHeight = bodySize * 1.55
    const bodyLines = wrap(body, bodySize, 400, contentW - pad * 2)
    const cardH = pad * 2 + bodyLines.length * lineHeight
    primitives.push({ kind: 'rect', x: padX, y, w: contentW, h: cardH, radius: 20, fill: '#f8fafc' })

    let textY = y + pad
    bodyLines.forEach((line) => {
      primitives.push({ kind: 'text', x: padX + pad, y: textY, text: line, size: bodySize, weight: 400, color: '#1f2937' })
      textY += lineHeight
    })

    y += cardH + 42
  }

  if (params.operationSuggestions.trim()) {
    drawTextSection('运营提升建议', params.operationSuggestions.trim())
  }

  if (params.storeFeedback.trim()) {
    drawTextSection('门店反馈', params.storeFeedback.trim())
  }

  // ---- Footer ----
  y += 6
  primitives.push({ kind: 'line', x: padX, y, w: contentW, color: divider, thickness: 1 })
  y += 26
  primitives.push({
    kind: 'text',
    x: padX,
    y,
    text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
    size: 23,
    weight: 400,
    color: muted,
  })
  y += 23 * 1.4

  // ---- Render ----
  const height = Math.ceil(y + padBottom)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建渲染画布。')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.textBaseline = 'top'

  const traceRoundRect = (rectX: number, rectY: number, rectW: number, rectH: number, radius: number) => {
    const r = Math.max(0, Math.min(radius, rectW / 2, rectH / 2))
    context.beginPath()
    context.moveTo(rectX + r, rectY)
    context.arcTo(rectX + rectW, rectY, rectX + rectW, rectY + rectH, r)
    context.arcTo(rectX + rectW, rectY + rectH, rectX, rectY + rectH, r)
    context.arcTo(rectX, rectY + rectH, rectX, rectY, r)
    context.arcTo(rectX, rectY, rectX + rectW, rectY, r)
    context.closePath()
  }

  primitives.forEach((primitive) => {
    if (primitive.kind === 'rect') {
      traceRoundRect(primitive.x, primitive.y, primitive.w, primitive.h, primitive.radius)
      context.fillStyle = primitive.fill
      context.fill()
      return
    }

    if (primitive.kind === 'line') {
      context.strokeStyle = primitive.color
      context.lineWidth = primitive.thickness
      context.beginPath()
      context.moveTo(primitive.x, primitive.y + 0.5)
      context.lineTo(primitive.x + primitive.w, primitive.y + 0.5)
      context.stroke()
      return
    }

    context.font = fontString(primitive.size, primitive.weight)
    context.fillStyle = primitive.color
    context.fillText(primitive.text, primitive.x, primitive.y)
  })

  return canvas
}

async function buildPngBlob(params: SummaryRenderParams): Promise<Blob> {
  const canvas = buildSummaryCanvas(params)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('无法生成 PNG 预览。'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}

function buildPdfBlob(params: SummaryRenderParams): Blob {
  const canvas = buildSummaryCanvas(params)
  const imageData = canvas.toDataURL('image/png')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  pdf.setProperties({
    title: `巡店评分汇总 - ${params.storeName}`,
    subject: `综合评分 ${params.totalScore}/${params.maxScore}`,
    author: params.inspectorName,
    creator: 'Seoul Good 巡店评分表',
    keywords: [params.storeName, params.inspectionDate, '巡店评分'].join(', '),
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imageWidth = pageWidth
  const imageHeight = (canvas.height / canvas.width) * imageWidth

  let heightLeft = imageHeight
  let position = 0

  pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position -= pageHeight
    pdf.addPage()
    pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight)
    heightLeft -= pageHeight
  }

  return pdf.output('blob')
}

function isBlobUrl(value: string) {
  return value.startsWith('blob:')
}

function sanitizeFileNamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
}

function formatDateForFileName(inspectionDate: string): string {
  const match = inspectionDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)

  if (match) {
    const [, year, month, day, hour, minute] = match
    return `${year}${month}${day}-${hour}${minute}`
  }

  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}${month}${day}-${hour}${minute}`
}

function getSummaryFileName(params: {
  storeName: string
  inspectionDate: string
  totalScore: number
  maxScore: number
  extension: string
}): string {
  const store = sanitizeFileNamePart(params.storeName) || '未填写门店'
  const datePart = formatDateForFileName(params.inspectionDate)

  return `巡店评分_${store}_${datePart}_${params.totalScore}-${params.maxScore}分.${params.extension}`
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('无法生成 PNG 数据链接。'))
    }

    reader.onerror = () => {
      reject(new Error('无法生成 PNG 数据链接。'))
    }

    reader.readAsDataURL(blob)
  })
}

function ScoreButtons({
  question,
  value,
  onChange,
  displayLabel,
}: {
  question: RubricQuestion
  value: AnswerValue
  onChange: (score: number | boolean | CheckboxAnswer) => void
  displayLabel?: string
}) {
  if (isCheckboxQuestion(question)) {
    return (
      <CheckboxGroup
        question={question}
        value={value}
        onChange={(answer) => onChange(answer)}
      />
    )
  }

  if (isBooleanQuestion(question)) {
    const options = [
      { label: '否', value: false },
      { label: '是', value: true },
    ]

    return (
      <div className="score-group" role="radiogroup" aria-label={displayLabel ?? question.label}>
        {options.map((option) => {
          const active = value === option.value

          return (
            <button
              key={option.label}
              type="button"
              className={active ? 'score-option score-option-active' : 'score-option'}
              aria-pressed={active}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  const options = Array.from({ length: question.maxScore + 1 }, (_, index) => index)

  return (
    <div className="score-group" role="radiogroup" aria-label={displayLabel ?? question.label}>
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

function StoreSearchSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (storeName: string) => void
  options: readonly string[]
  placeholder: string
}) {
  const listboxId = useId()
  const [query, setQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) => option.toLowerCase().includes(normalizedQuery))
  }, [options, query])

  const selectStore = (storeName: string) => {
    setQuery(storeName)
    onChange(storeName)
    setIsOpen(false)
  }

  return (
    <div
      className="store-combobox"
      role="combobox"
      aria-expanded={isOpen}
      aria-controls={listboxId}
      aria-haspopup="listbox"
    >
      <input
        className="store-combobox-input"
        type="text"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          onChange(options.some((option) => option.toLowerCase() === nextQuery.trim().toLowerCase()) ? nextQuery.trim() : '')
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false)
            return
          }

          if (event.key === 'Enter' && filteredOptions.length > 0) {
            event.preventDefault()
            selectStore(filteredOptions[0])
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        required
      />

      {isOpen && (
        <div className="store-combobox-panel">
          <div className="store-combobox-meta">
            <span>输入关键词快速筛选门店</span>
            <span>{filteredOptions.length} 项</span>
          </div>

          <ul id={listboxId} className="store-combobox-list" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((storeOption) => {
                const active = storeOption === value

                return (
                  <li key={storeOption} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={active ? 'store-combobox-option store-combobox-option-active' : 'store-combobox-option'}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectStore(storeOption)}
                    >
                      {storeOption}
                    </button>
                  </li>
                )
              })
            ) : (
              <li className="store-combobox-empty">没有匹配的门店，试试换个关键词。</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function App() {
  const [inspectorName, setInspectorName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [inspectionDate, setInspectionDate] = useState(getCurrentLocalDateTimeValue)
  const [operationSuggestions, setOperationSuggestions] = useState('')
  const [storeFeedback, setStoreFeedback] = useState('')
  const [answers, setAnswers] = useState<AnswerMap>(() => buildInitialAnswers())
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>(() => ({}))
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>(() => ({}))
  const [highlightQuestionId, setHighlightQuestionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [notice, setNotice] = useState<Notice>(() =>
    supabaseConfigured
      ? {
          tone: 'info',
          message: '',
        }
      : {
          tone: 'warning',
          message: '请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。',
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
        const sectionScore = section.questions.reduce((sum, question) => sum + getQuestionScore(question, answers[question.id]), 0)
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
  const totalScore = allQuestions.reduce((sum, { question }) => sum + getQuestionScore(question, answers[question.id]), 0)
  const maxScore = allQuestions.reduce((sum, { question }) => sum + question.maxScore, 0)
  const completionPercent = totalQuestions === 0 ? 0 : (answeredCount / totalQuestions) * 100
  const scorePercent = maxScore === 0 ? 0 : (totalScore / maxScore) * 100
  const allFieldsFilled = Boolean(inspectorName.trim() && storeName.trim() && inspectionDate.trim())

  useEffect(() => {
    return () => {
      if (previewUrl && isBlobUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const closePreview = () => {
    if (previewUrl && isBlobUrl(previewUrl)) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl('')
    setPreviewMode(null)
  }

  const buildSummaryParams = (): SummaryRenderParams => ({
    inspectorName: inspectorName.trim() || '未填写',
    storeName: storeName.trim() || '未填写',
    inspectionDate,
    totalScore,
    maxScore,
    scorePercent,
    completionPercent,
    operationSuggestions,
    storeFeedback,
    sectionStats: sectionStats.map((section) => ({
      title: section.section.title,
      sectionScore: section.sectionScore,
      sectionMaxScore: section.sectionMaxScore,
      answeredCount: section.answeredCount,
      questions: section.section.questions.map((question) => ({
        label: labelOverrides[question.id] ?? question.label,
        score: getQuestionScore(question, answers[question.id]),
        maxScore: question.maxScore,
        note: questionNotes[question.id],
      })),
    })),
  })

  const openPngPreview = async () => {
    try {
      const blob = await buildPngBlob(buildSummaryParams())

      const url = await blobToDataUrl(blob)
      if (previewUrl && isBlobUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(url)
      setPreviewMode('png')
    } catch {
      setNotice({
        tone: 'error',
        message: 'PNG 预览生成失败，请重试或使用其他预览。',
      })
    }
  }

  const openPdfPreview = () => {
    try {
      const blob = buildPdfBlob(buildSummaryParams())
      const url = URL.createObjectURL(blob)

      if (previewUrl && isBlobUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(url)
      setPreviewMode('pdf')
    } catch {
      setNotice({
        tone: 'error',
        message: 'PDF 预览生成失败，请重试或使用其他预览。',
      })
    }
  }

  const openPreviewUrlInNewTab = () => {
    if (!previewUrl) {
      return
    }

    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  const downloadPngPreview = () => {
    if (!previewUrl) {
      return
    }

    const link = document.createElement('a')
    link.href = previewUrl
    link.download = getSummaryFileName({
      storeName: storeName.trim() || '未填写门店',
      inspectionDate,
      totalScore,
      maxScore,
      extension: 'png',
    })
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const downloadPdfPreview = () => {
    if (!previewUrl) {
      return
    }

    const link = document.createElement('a')
    link.href = previewUrl
    link.download = getSummaryFileName({
      storeName: storeName.trim() || '未填写门店',
      inspectionDate,
      totalScore,
      maxScore,
      extension: 'pdf',
    })
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const setQuestionScore = (questionId: string, score: number | boolean | CheckboxAnswer) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: score,
    }))
    setHighlightQuestionId((current) => (current === questionId ? null : current))
  }

  const focusFirstMissingQuestion = () => {
    const firstMissing = missingQuestions[0]

    if (!firstMissing) {
      return
    }

    const element = document.getElementById(`question-${firstMissing.question.id}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    setHighlightQuestionId(firstMissing.question.id)
    window.setTimeout(() => {
      setHighlightQuestionId((current) => (current === firstMissing.question.id ? null : current))
    }, 2600)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!allFieldsFilled) {
      setNotice({ tone: 'error', message: '检查员、门店和日期不能为空。' })
      document.getElementById('inspection-info-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (missingQuestions.length > 0) {
      setNotice({
        tone: 'error',
        message: `请先完成剩余 ${missingQuestions.length} 个评分项，已为你跳转到第一个未填的题目。`,
      })
      focusFirstMissingQuestion()
      return
    }

    if (!supabaseConfigured || !supabase) {
      setNotice({
        tone: 'warning',
        message: '数据库还未配置，请先设置环境变量。',
      })
      return
    }

    const { questionRows: answerRows, sectionRows } = buildSubmissionRows({
      inspectorName,
      storeName,
      inspectionDate,
      answers,
      labelOverrides,
      questionNotes,
    })

    const answerSummary = rubricSections
      .map((section) => {
        const sectionLines = section.questions.map((question) => {
          const label = labelOverrides[question.id] ?? question.label
          const note = questionNotes[question.id]?.trim()
          const base = `- ${label}: ${formatQuestionAnswer(question, answers[question.id])}`
          return note ? `${base}（备注：${note}）` : base
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
    setNotice({ tone: 'info', message: `正在保存到 ${submissionTable} ...` })

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
          operational_improvement_suggestions: operationSuggestions.trim() || null,
          store_feedback: storeFeedback.trim() || null,
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
        message: `提交已成功保存，时间：${savedAt}。`,
      })
    } catch (error) {
      const errorObject = error && typeof error === 'object' ? error : null
      const errorMessage =
        errorObject && 'message' in errorObject && typeof errorObject.message === 'string'
          ? errorObject.message
          : error instanceof Error
            ? error.message
            : ''
      const errorCode = errorObject && 'code' in errorObject && typeof errorObject.code === 'string' ? errorObject.code : ''
      const errorDetails = errorObject && 'details' in errorObject && typeof errorObject.details === 'string' ? errorObject.details : ''
      const errorHint = errorObject && 'hint' in errorObject && typeof errorObject.hint === 'string' ? errorObject.hint : ''
      const normalizedMessage = `${errorMessage} ${errorDetails} ${errorHint}`.toLowerCase()

      let message = '数据库发生未知错误。'

      if (errorCode === '42501' || normalizedMessage.includes('row-level security') || normalizedMessage.includes('permission denied')) {
        message = '数据库拒绝了这次写入。请确认已经在 Supabase 里执行了建表 SQL，并且为 inspection_submissions 配好了允许 anon 插入的 RLS policy。'
      } else if (normalizedMessage.includes('relation') && normalizedMessage.includes('does not exist')) {
        message = '数据库里还没有 inspection_submissions 这张表。请先在 Supabase SQL Editor 执行建表脚本。'
      } else if (errorMessage) {
        message = [
          '数据库保存失败。',
          `message: ${errorMessage}`,
          errorCode ? `code: ${errorCode}` : null,
          errorDetails ? `details: ${errorDetails}` : null,
          errorHint ? `hint: ${errorHint}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      }
      setNotice({
        tone: 'error',
        message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const previewTitle = previewMode === 'png' ? 'PNG 预览' : 'PDF 预览'

  return (
    <div className="page-shell">
      <div className="page-backdrop page-backdrop-one" />
      <div className="page-backdrop page-backdrop-two" />

      <main className="app-layout">
        <section className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">Seoul Good</div>
            <h1>巡店评分表</h1>
            <p className="hero-text">
              先填写检查员、门店和日期，再按菜品、服务、卫生、厨房操作逐项打分。
            </p>
            <p className="hero-weights">权重：热餐 48 分，沙拉 10 分，餐后类 2 分，前厅 10 分，后厨及仓库 10 分，服务 5 分，其他与反馈 6 分。</p>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-label">综合评分</span>
              <strong>
                {totalScore}/{maxScore}
              </strong>
              <span>{formatPercent(scorePercent)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">已完成</span>
              <strong>
                {answeredCount}/{totalQuestions}
              </strong>
              <span>{formatPercent(completionPercent)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">保存状态</span>
              <strong>{lastSavedAt ?? '未保存'}</strong>
              <span>写入数据库</span>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <form className="form-column" onSubmit={handleSubmit}>
            <section id="inspection-info-panel" className="panel panel-overflow-visible">
              <div className="panel-header">
                <div>
                  <h2>检查信息</h2>
                  <p>填写本次巡店的基础信息。</p>
                </div>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>检查员</span>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(event) => setInspectorName(event.target.value)}
                    placeholder="例如：李明"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="field">
                  <span>门店</span>
                  <StoreSearchSelect
                    value={storeName}
                    onChange={setStoreName}
                    options={storeOptions}
                    placeholder="请选择或搜索门店"
                  />
                </label>

                <label className="field field-wide">
                  <span>检查时间</span>
                  <input
                    type="datetime-local"
                    step={60}
                    value={inspectionDate}
                    onChange={(event) => setInspectionDate(event.target.value)}
                    required
                  />
                </label>
              </div>
            </section>

            {rubricSections.map((section, index) => {
              const sectionSummaryItem = sectionStats.find((item) => item.section.id === section.id)

              return (
                <Fragment key={section.id}>
                  {index > 0 && (
                    <div className="section-divider" aria-hidden="true">
                      <span />
                    </div>
                  )}

                  <section className="panel section-panel">
                    <div className="panel-header">
                      <div>
                        <h2>{section.title}</h2>
                        <p>{section.summary}</p>
                      </div>
                      <div className="section-score-text">
                        {sectionSummaryItem?.sectionScore ?? 0}/{sectionSummaryItem?.sectionMaxScore ?? 0} 分
                      </div>
                    </div>

                    <div className="question-list">
                      {section.questions.map((question) => (
                        <article
                          key={question.id}
                          id={`question-${question.id}`}
                          className={
                            highlightQuestionId === question.id ? 'question-card question-card-highlight' : 'question-card'
                          }
                        >
                          <div className="question-copy">
                            {(question.id === 'hot_16') ? (
                              <input
                                type="text"
                                value={labelOverrides[question.id] ?? question.label}
                                onChange={(e) => setLabelOverrides((cur) => ({ ...cur, [question.id]: e.target.value }))}
                                placeholder="请输入新品名称"
                              />
                            ) : (
                              <h3>{labelOverrides[question.id] ?? question.label}</h3>
                            )}
                            <p>{question.description}</p>
                          </div>
                          <ScoreButtons
                            question={question}
                            value={answers[question.id]}
                            onChange={(score) => setQuestionScore(question.id, score)}
                            displayLabel={labelOverrides[question.id] ?? question.label}
                          />
                          <label className="question-note">
                            <span>备注（可选）</span>
                            <textarea
                              value={questionNotes[question.id] ?? ''}
                              onChange={(event) =>
                                setQuestionNotes((current) => ({ ...current, [question.id]: event.target.value }))
                              }
                              placeholder="填写补充说明（可选）"
                              rows={2}
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                  </section>
                </Fragment>
              )
            })}

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>运营提升建议与门店反馈</h2>
                  <p>这里填写不参与评分的补充意见。</p>
                </div>
              </div>

              <div className="field-grid">
                <label className="field field-wide">
                  <span>运营提升建议</span>
                  <textarea
                    value={operationSuggestions}
                    onChange={(event) => setOperationSuggestions(event.target.value)}
                    placeholder="例如：建议增加出餐前复核、优化高峰期备餐节奏。"
                    rows={5}
                  />
                </label>
                <label className="field field-wide">
                  <span>门店反馈</span>
                  <textarea
                    value={storeFeedback}
                    onChange={(event) => setStoreFeedback(event.target.value)}
                    placeholder="例如：门店反馈晚高峰座位紧张，希望增加座位。"
                    rows={5}
                  />
                </label>
              </div>
            </section>

            {notice.message ? (
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
                    ? '已保存'
                    : notice.tone === 'error'
                      ? '提交前请检查'
                      : notice.tone === 'warning'
                        ? '需要配置'
                        : '状态'}
                </strong>
                <span>{notice.message}</span>
              </div>
            ) : null}

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? '正在保存...' : '保存到数据库'}
              </button>
              <div className="form-help">
                <span>剩余 {missingQuestions.length} 项未评分</span>
                <span>{allFieldsFilled ? '基础信息已填写' : '基础信息未填写完整'}</span>
              </div>
            </div>
          </form>

          <aside className="summary-column">
            <section className="panel summary-panel">
              <div className="panel-header">
                <div>
                  <h2>实时汇总</h2>
                  <p>查看当前巡店的评分和完成情况。</p>
                </div>
              </div>

              <div className="summary-metrics">
                <div className="summary-chip">
                  <span>综合评分</span>
                  <strong>
                    {totalScore}/{maxScore}
                  </strong>
                </div>
                <div className="summary-chip">
                  <span>完成进度</span>
                  <strong>{formatPercent(completionPercent)}</strong>
                </div>
                <div className="summary-chip">
                  <span>已答题目</span>
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
                    ? '所有题目都已评分，可以直接保存。'
                    : '请完成剩余评分后再保存。'}
                </p>
              </div>

              <div className="summary-list">
                {sectionStats.map(({ section, sectionScore, sectionMaxScore, answeredCount: sectionAnswered }) => (
                  <div key={section.id} className="summary-row">
                    <div>
                      <strong>{section.title}</strong>
                      <span>{sectionAnswered}/{section.questions.length} 项已评分</span>
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
                  <h2>保存字段说明</h2>
                  <p>保存时会自动写入检查信息、评分明细和两段文字反馈。</p>
                </div>
              </div>

              <div className="preview-actions">
                <button type="button" className="secondary-button" onClick={openPngPreview}>
                  PNG 预览
                </button>
                <button type="button" className="secondary-button" onClick={openPdfPreview}>
                  PDF 预览
                </button>
              </div>

              <p className="summary-note">
                预览会读取当前表单内容，方便在保存前检查导出效果。
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
                <span className="preview-kicker">即时在线预览</span>
                <h2 id="preview-title">{previewTitle}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={closePreview}>
                关闭
              </button>
            </div>

            {previewMode === 'png' ? (
              <div className="png-preview-panel">
                <p className="preview-caption">PNG 已在浏览器里生成并直接显示。</p>
                <div className="png-preview-actions">
                  <button type="button" className="secondary-button" onClick={openPreviewUrlInNewTab} disabled={!previewUrl}>
                    打开原图
                  </button>
                  <button type="button" className="secondary-button" onClick={downloadPngPreview} disabled={!previewUrl}>
                    下载 PNG
                  </button>
                </div>
                <img className="png-preview-image" src={previewUrl} alt="PNG 预览" />
              </div>
            ) : (
              <div className="pdf-preview-panel">
                <p className="preview-caption">PDF 已在浏览器里生成，可直接下载分享。文件名包含门店、时间和得分。</p>
                <div className="png-preview-actions">
                  <button type="button" className="secondary-button" onClick={openPreviewUrlInNewTab} disabled={!previewUrl}>
                    新标签打开
                  </button>
                  <button type="button" className="secondary-button" onClick={downloadPdfPreview} disabled={!previewUrl}>
                    下载 PDF
                  </button>
                </div>
                <iframe className="pdf-preview-frame" src={previewUrl} title="PDF 预览" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
