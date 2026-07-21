// Faculty research engine.
//
// Pulls REAL professors for a given school + major from the OpenAlex academic
// database, then (optionally) enriches them with Google Gemini for department
// fit, a best-effort real email, and a tailored outreach draft.
//
// Accuracy contract: OpenAlex gives verified researcher *identities* (name,
// research areas, publication record). Emails are either found by Gemini's
// grounded web search (marked "verified") or inferred from the school's email
// pattern (marked "unverified" — the user confirms before sending). We never
// fabricate a confirmed email.

const OPENALEX = 'https://api.openalex.org';
const MAILTO = 'mailto=faculty-research@panacea.app'; // OpenAlex "polite pool" contact
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export interface Institution {
  id: string; // OpenAlex short id, e.g. "I97018004"
  name: string;
  domain: string; // email domain guess, e.g. "mit.edu"
  homepageUrl: string;
}

export interface Subfield {
  topicName: string;
  subfieldId: string; // e.g. "1702"
  subfieldName: string;
  fieldName: string;
}

export interface Faculty {
  openAlexId: string;
  name: string;
  department: string; // filled by Gemini; falls back to subfield name
  worksInField: number; // publications in this subfield at this school
  worksCount: number | null; // total lifetime works
  citedByCount: number | null;
  orcid: string | null;
  topics: string[]; // research areas from OpenAlex
  profileUrl: string; // faculty page (Gemini) or ORCID / OpenAlex profile
  email: string; // real (Gemini) or inferred pattern
  emailStatus: 'verified' | 'unverified';
  fitReason: string; // why they fit the user's major
  outreachDraft: string; // short cold-outreach email
}

export interface ResearchResult {
  institution: Institution;
  subfield: Subfield;
  faculty: Faculty[];
  usedGemini: boolean;
}

async function getJSON(url: string): Promise<any> {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}${MAILTO}`);
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  return res.json();
}

function shortId(openAlexUrl: string): string {
  return openAlexUrl.split('/').pop() || '';
}

/** Turn a homepage URL into a likely email domain (www.stanford.edu -> stanford.edu, web.mit.edu -> mit.edu). */
export function normalizeDomain(homepageUrl?: string): string {
  if (!homepageUrl) return '';
  try {
    const host = new URL(homepageUrl).hostname.toLowerCase();
    return host.replace(/^(www\d?|web|home|about|sites?)\./, '');
  } catch {
    return '';
  }
}

/** Best-guess institutional email from a full name + domain. Approximate — always shown as "unverified". */
export function guessEmail(fullName: string, domain: string): string {
  if (!domain) return '';
  const parts = fullName
    .trim()
    .replace(/[^A-Za-z .'-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return '';
  const first = parts[0].toLowerCase().replace(/[^a-z]/g, '');
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (!first || !last) return '';
  return `${first}.${last}@${domain}`;
}

/** Reject OpenAlex author entities that look like disambiguation artifacts. */
function looksLikeRealPerson(name: string): boolean {
  const first = (name.trim().split(/\s+/)[0] || '').replace(/[^A-Za-z]/g, '');
  return first.length >= 2; // single-initial first names ("A Boyle") are usually merged entities
}

export async function resolveInstitution(school: string): Promise<Institution | null> {
  const data = await getJSON(
    `${OPENALEX}/institutions?search=${encodeURIComponent(school)}&per_page=1`
  );
  const i = data.results?.[0];
  if (!i) return null;
  return {
    id: shortId(i.id),
    name: i.display_name,
    homepageUrl: i.homepage_url || '',
    domain: normalizeDomain(i.homepage_url)
  };
}

export async function resolveSubfield(major: string): Promise<Subfield | null> {
  const data = await getJSON(`${OPENALEX}/topics?search=${encodeURIComponent(major)}&per_page=1`);
  const t = data.results?.[0];
  if (!t?.subfield?.id) return null;
  return {
    topicName: t.display_name,
    subfieldId: shortId(t.subfield.id),
    subfieldName: t.subfield.display_name,
    fieldName: t.field?.display_name || ''
  };
}

interface RawCandidate {
  openAlexId: string;
  name: string;
  worksInField: number;
}

/**
 * Top faculty in a subfield at an institution, ranked by lifetime publication
 * volume. We deliberately do NOT apply a recency filter: at a given institution,
 * all-time volume in a subfield surfaces the prominent, long-tenured (and almost
 * always still-active) professors, whereas a recent window lets OpenAlex's broad
 * topic tagging promote recently-prolific adjacent-field authors to the top.
 */
async function fetchCandidates(
  instId: string,
  subfieldId: string,
  limit: number
): Promise<RawCandidate[]> {
  const grp = await getJSON(
    `${OPENALEX}/works?filter=authorships.institutions.id:${instId},topics.subfield.id:${subfieldId}&group_by=authorships.author.id&per_page=200`
  );
  return (grp.group_by || [])
    .filter((g: any) => g.key && g.key_display_name && !/unknown/i.test(g.key))
    .filter((g: any) => looksLikeRealPerson(g.key_display_name))
    .slice(0, limit)
    .map((g: any) => ({
      openAlexId: shortId(g.key),
      name: g.key_display_name,
      worksInField: g.count
    }));
}

/** Batch-hydrate author records (ORCID, topics, totals) in one request. */
async function hydrate(ids: string[]): Promise<Map<string, any>> {
  if (ids.length === 0) return new Map();
  const data = await getJSON(
    `${OPENALEX}/authors?filter=ids.openalex:${ids.join('|')}&per_page=${ids.length}`
  );
  const map = new Map<string, any>();
  for (const a of data.results || []) map.set(shortId(a.id), a);
  return map;
}

function extractJsonArray(text: string): any[] | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callGemini(prompt: string, geminiKey: string, useSearch: boolean): Promise<string> {
  const body: any = { contents: [{ parts: [{ text: prompt }] }] };
  if (useSearch) body.tools = [{ google_search: {} }];
  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p: any) => p.text || '').join('');
}

/**
 * Ask Gemini (with Google Search grounding) to add department, a real email
 * when findable, a faculty-page URL, a fit reason, and an outreach draft.
 * Falls back to an ungrounded call if the search tool is unsupported, so the
 * user still gets fit reasons and drafts. Returns a name-keyed map, or null.
 */
async function enrichWithGemini(
  base: { name: string; topics: string[]; guessedEmail: string }[],
  ctx: { school: string; major: string; domain: string; geminiKey: string }
): Promise<Map<string, Partial<Faculty>> | null> {
  const roster = base
    .map(
      (b, i) =>
        `${i + 1}. ${b.name} — research: ${b.topics.join(', ') || 'n/a'} — pattern-guess email: ${b.guessedEmail || 'n/a'}`
    )
    .join('\n');

  const prompt = `You are a research assistant helping a prospective ${ctx.major} student build a faculty outreach list at ${ctx.school}.

For EACH professor below, use web search to find their official department and university faculty page, then return a JSON array (and nothing else) of objects with these exact keys:
- "name": string, exactly as given
- "department": string, their department at ${ctx.school}
- "email": string. Only use an email you actually find on an official ${ctx.domain} / university/faculty page. If you cannot find a real one, return the provided pattern-guess unchanged.
- "emailStatus": "verified" ONLY if the email was found on an official university/faculty page; otherwise "unverified".
- "profileUrl": string, the official faculty/department profile URL if found, else "".
- "fitReason": one sentence on why this professor fits a ${ctx.major} applicant, referencing their research.
- "outreachDraft": a concise (90-130 word) professional cold email requesting a brief chat, addressed to the professor, signed "[Your Name]". No subject line.

Never invent an email or mark a guessed email as "verified". Return ONLY the JSON array.

Professors:
${roster}`;

  let text = '';
  try {
    text = await callGemini(prompt, ctx.geminiKey, true);
  } catch {
    text = await callGemini(prompt, ctx.geminiKey, false); // grounding unsupported — retry ungrounded
  }
  const arr = extractJsonArray(text);
  if (!arr) return null;

  const map = new Map<string, Partial<Faculty>>();
  for (const item of arr) {
    if (!item?.name) continue;
    map.set(String(item.name).toLowerCase().trim(), {
      department: typeof item.department === 'string' ? item.department : undefined,
      email: typeof item.email === 'string' ? item.email.trim() : undefined,
      emailStatus: item.emailStatus === 'verified' ? 'verified' : 'unverified',
      profileUrl: typeof item.profileUrl === 'string' ? item.profileUrl.trim() : undefined,
      fitReason: typeof item.fitReason === 'string' ? item.fitReason : undefined,
      outreachDraft: typeof item.outreachDraft === 'string' ? item.outreachDraft : undefined
    });
  }
  return map;
}

function localOutreachDraft(name: string, school: string, major: string, area: string): string {
  const last = name.trim().split(/\s+/).slice(-1)[0];
  return `Dear Professor ${last},

I'm a prospective ${major} applicant to ${school}, and I've been following your work${area ? ` on ${area}` : ''}. Your research strongly resonates with the direction I hope to pursue, and I'd be grateful for a brief (15-minute) conversation to learn about your group and any advice you'd offer an incoming student.

I've attached a short summary of my background and would be happy to work around your schedule.

Thank you for your time and consideration.

Best regards,
[Your Name]`;
}

/** Main entry point: research real faculty for a school + major. */
export async function researchFaculty(
  school: string,
  major: string,
  opts: { geminiKey?: string; limit?: number } = {}
): Promise<ResearchResult> {
  const limit = opts.limit ?? 10;

  const institution = await resolveInstitution(school);
  if (!institution) {
    throw new Error(`Couldn't find "${school}" in the OpenAlex academic database. Try the full official name.`);
  }
  const subfield = await resolveSubfield(major);
  if (!subfield) {
    throw new Error(`Couldn't map "${major}" to a research area. Try a broader field name.`);
  }

  const candidates = await fetchCandidates(institution.id, subfield.subfieldId, limit);
  if (candidates.length === 0) {
    throw new Error(
      `No published ${subfield.subfieldName} faculty found at ${institution.name}. The department may be small or named differently in the database.`
    );
  }

  const hydrated = await hydrate(candidates.map((c) => c.openAlexId));

  const base = candidates.map((c) => {
    const a = hydrated.get(c.openAlexId);
    const topics: string[] = (a?.topics || []).slice(0, 4).map((t: any) => t.display_name);
    return {
      openAlexId: c.openAlexId,
      name: c.name,
      worksInField: c.worksInField,
      worksCount: a?.works_count ?? null,
      citedByCount: a?.cited_by_count ?? null,
      orcid: a?.orcid || null,
      topics,
      guessedEmail: guessEmail(c.name, institution.domain),
      profileUrl: a?.orcid || `https://openalex.org/${c.openAlexId}`
    };
  });

  let enrichment: Map<string, Partial<Faculty>> | null = null;
  let usedGemini = false;
  if (opts.geminiKey) {
    try {
      enrichment = await enrichWithGemini(
        base.map((b) => ({ name: b.name, topics: b.topics, guessedEmail: b.guessedEmail })),
        { school: institution.name, major, domain: institution.domain, geminiKey: opts.geminiKey }
      );
      usedGemini = !!enrichment;
    } catch (e) {
      console.warn('Gemini enrichment failed; falling back to OpenAlex-only.', e);
    }
  }

  const faculty: Faculty[] = base.map((b) => {
    const g = enrichment?.get(b.name.toLowerCase().trim());
    const area = b.topics.join(', ');
    const email = g?.email || b.guessedEmail;
    return {
      openAlexId: b.openAlexId,
      name: b.name,
      department: g?.department || subfield.subfieldName,
      worksInField: b.worksInField,
      worksCount: b.worksCount,
      citedByCount: b.citedByCount,
      orcid: b.orcid,
      topics: b.topics,
      profileUrl: g?.profileUrl || b.profileUrl,
      email,
      // A pattern-guess is never "verified"; only Gemini finding it on an official page is.
      emailStatus: g?.emailStatus === 'verified' && g?.email ? 'verified' : 'unverified',
      fitReason: g?.fitReason || `Active ${subfield.subfieldName} researcher whose work aligns with ${major}.`,
      outreachDraft: g?.outreachDraft || localOutreachDraft(b.name, institution.name, major, area)
    };
  });

  return { institution, subfield, faculty, usedGemini };
}
