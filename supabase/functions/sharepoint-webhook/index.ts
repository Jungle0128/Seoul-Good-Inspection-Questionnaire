const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0'
const LOGIN_ROOT = 'https://login.microsoftonline.com'

declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

function getString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || value === undefined) {
    return fallback
  }

  return String(value)
}

function getNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toIsoDateTime(value: unknown): string {
  const text = getString(value)

  if (!text) {
    return ''
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString()
}

function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

type SubmissionRecord = {
  id?: string
  store_name?: string
  inspector_name?: string
  inspection_date?: string
  created_at?: string
  submitted_at?: string
  total_score?: number | string
  section_summary?: string
  answer_summary?: string
  overall_notes?: string | null
  operational_improvement_suggestions?: string | null
  store_feedback?: string | null
  [key: string]: unknown
}

type SharePointColumnResponse = {
  value?: Array<{
    name?: string
    displayName?: string
  }>
}

type SharePointColumnMap = {
  byName: Map<string, string>
  byDisplayName: Map<string, string>
}

async function getToken() {
  const tenantId = requireEnv('AZURE_TENANT_ID')
  const clientId = requireEnv('AZURE_CLIENT_ID')
  const clientSecret = requireEnv('AZURE_CLIENT_SECRET')

  const response = await fetch(
    `${LOGIN_ROOT}/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    },
  )

  const data = await response.json() as { access_token?: string; error?: string; error_description?: string }

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Token request failed: ${data.error ?? response.status} ${data.error_description ?? response.statusText}`.trim(),
    )
  }

  return data.access_token
}

function normalizeColumnKey(value: string): string {
  return value.trim().toLowerCase()
}

async function getSharePointColumnMap(token: string): Promise<SharePointColumnMap> {
  const siteId = requireEnv('SP_SITE_ID')
  const listId = requireEnv('SP_LIST_ID')

  const response = await fetch(`${GRAPH_ROOT}/sites/${siteId}/lists/${listId}/columns?$select=name,displayName`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await response.json() as SharePointColumnResponse

  if (!response.ok) {
    throw new Error(`Failed to load SharePoint columns: ${JSON.stringify(data)}`)
  }

  const byName = new Map<string, string>()
  const byDisplayName = new Map<string, string>()

  for (const column of data.value ?? []) {
    if (column.name) {
      byName.set(normalizeColumnKey(column.name), column.name)
    }

    if (column.displayName) {
      byDisplayName.set(normalizeColumnKey(column.displayName), column.name ?? column.displayName)
    }
  }

  return { byName, byDisplayName }
}

function buildSharePointFields(record: SubmissionRecord) {
  return cleanFields({
    Title: getString(record.store_name),
    store_name: getString(record.store_name),
    inspector_name: getString(record.inspector_name),
    inspection_date: toIsoDateTime(record.inspection_date),
    created_at: toIsoDateTime(record.created_at),
    submitted_at: toIsoDateTime(record.submitted_at),
    total_score: getNumber(record.total_score),
    section_summary: getString(record.section_summary),
    answer_summary: getString(record.answer_summary),
    overall_notes: getString(record.overall_notes),
    operational_improvement_suggestions: getString(record.operational_improvement_suggestions),
    store_feedback: getString(record.store_feedback),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()

    if (!rawBody) {
      return new Response('Empty body received', { status: 400, headers: corsHeaders })
    }

    const payload = JSON.parse(rawBody) as { record?: SubmissionRecord } | SubmissionRecord
    const record = (payload as { record?: SubmissionRecord }).record ?? payload

    if (!record || typeof record !== 'object') {
      return new Response('Missing record payload', { status: 400, headers: corsHeaders })
    }

    const token = await getToken()
    const columnMap = await getSharePointColumnMap(token)
    const fields = buildSharePointFields(record)
    const filteredFields = Object.fromEntries(
      Object.entries(fields)
        .map(([key, value]) => {
          const normalizedKey = normalizeColumnKey(key)
          const mappedName = columnMap.byName.get(normalizedKey) ?? columnMap.byDisplayName.get(normalizedKey)
          return mappedName ? [mappedName, value] as const : null
        })
        .filter((entry): entry is readonly [string, unknown] => entry !== null),
    )

    if (Object.keys(filteredFields).length === 0) {
      return new Response('No matching SharePoint columns found', { status: 400, headers: corsHeaders })
    }

    const siteId = requireEnv('SP_SITE_ID')
    const listId = requireEnv('SP_LIST_ID')
    const response = await fetch(`${GRAPH_ROOT}/sites/${siteId}/lists/${listId}/items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: filteredFields,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('SharePoint error:', errText)
      return new Response(`SharePoint error: ${errText}`, {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Caught error:', message)
    return new Response(`Error: ${message}`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
})