import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { DonutChartCard, type DonutSegment } from '../components/DonutChartCard'
import { Dropdown } from '../components/Dropdown'
import { downloadCsv } from '../lib/exportCsv'
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  DataReadinessIcon,
  DownloadIcon,
  FilterIcon,
  SparklesIcon,
  CheckIcon,
  CloseIcon,
  PhoneIcon,
  AnalyticsIcon,
} from '../components/icons'
import {
  mockStats,
  mockLiveCalls,
  mockCallLog,
  mockSimulationRun,
} from '../data/mock'
import type { CallLogSeed, CallOutcome } from '../types'

// ---------------------------------------------------------------------------
// Telephony Analytics Dataset (Hourly Heatmap, Scatter, Histogram, Intents)
// ---------------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
]

interface HeatmapCell {
  day: string
  hour: string
  calls: number
  resolutionRate: number
  escalations: number
  ahtSec: number
  topIntent: string
}

const BASE_LOADS: Record<string, number[]> = {
  Mon: [28, 92, 148, 134, 82, 64, 76, 88, 72, 54, 38, 22],
  Tue: [24, 88, 142, 126, 78, 58, 70, 84, 68, 48, 34, 18],
  Wed: [26, 94, 138, 122, 74, 56, 68, 80, 64, 46, 30, 20],
  Thu: [22, 86, 130, 118, 70, 52, 66, 76, 60, 42, 28, 16],
  Fri: [30, 98, 152, 140, 86, 62, 74, 86, 70, 50, 36, 24],
  Sat: [18, 54, 88, 94, 62, 44, 48, 52, 38, 28, 18, 12],
  Sun: [12, 36, 58, 64, 42, 30, 32, 36, 24, 18, 14, 8],
}

const TOP_INTENTS_BY_HOUR: Record<string, string> = {
  '08:00': 'Doctor OPD Availability & Token Schedule',
  '09:00': 'Cardiology & Orthopedics Booking',
  '10:00': 'Cashless TPA Pre-authorization & Inquiries',
  '11:00': 'Diagnostic Lab Reports & Imaging Slot',
  '12:00': 'Prescription Refill & Pharmacy Queries',
  '13:00': 'Hospital Visiting Hours & ICU Desk',
  '14:00': 'Post-lunch OPD Appointments',
  '15:00': 'Surgery Second Opinions & Quotes',
  '16:00': 'Discharge Summary & Medical Records',
  '17:00': 'Evening Specialist Consultations',
  '18:00': 'Next-day Morning Rescheduling',
  '19:00': 'Night Emergency & Urgent Care Triage',
}

const RAW_HEATMAP_DATA: HeatmapCell[] = []
for (const day of DAYS) {
  const loads = BASE_LOADS[day]
  HOURS.forEach((hour, hIdx) => {
    const calls = loads[hIdx]
    const resolutionRate = Math.min(96, Math.max(74, Math.round(92 - (calls > 100 ? (calls - 100) * 0.12 : 0) + (hIdx % 3))))
    const escalations = Math.round((calls * (100 - resolutionRate)) / 100)
    const ahtSec = Math.round(72 + (calls > 100 ? 18 : 0) + ((hIdx * 3) % 15))
    const topIntent = TOP_INTENTS_BY_HOUR[hour] || 'General Patient Consultation'
    RAW_HEATMAP_DATA.push({ day, hour, calls, resolutionRate, escalations, ahtSec, topIntent })
  })
}

interface ScatterPoint {
  id: string
  caller: string
  callerName: string
  intent: string
  durationSec: number
  confidence: number
  outcome: 'resolved' | 'redirected' | 'voicemail' | 'triage'
  department: string
  transcriptSnippet: { speaker: string; text: string }[]
  ehrAction: string
}

const SCATTER_DATA: ScatterPoint[] = [
  {
    id: 'c-1',
    caller: '•• 8821',
    callerName: 'Anita Sharma',
    intent: 'OPD Schedule Dr. Rao',
    durationSec: 42,
    confidence: 96,
    outcome: 'resolved',
    department: 'Cardiology',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Hello, I want to book Dr. Rao for tomorrow morning.' },
      { speaker: 'AICA', text: 'Dr. Rao is available at 10:30 AM tomorrow. Would you like me to confirm this OPD slot?' },
      { speaker: 'Caller', text: 'Yes, please confirm it.' },
      { speaker: 'AICA', text: 'Confirmed. Booking ID #CR-8821 sent to your mobile via SMS.' },
    ],
    ehrAction: 'HIS Appointment confirmed for Dr. K. Rao (OPD-204)',
  },
  {
    id: 'c-2',
    caller: '•• 3104',
    callerName: 'Ramesh Verma',
    intent: 'Cashless TPA Pre-auth',
    durationSec: 135,
    confidence: 82,
    outcome: 'resolved',
    department: 'Billing',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'I need to check if Star Health insurance is accepted for laparoscopic surgery.' },
      { speaker: 'AICA', text: 'Yes, Star Health is on our empanelled cashless TPA list. Pre-authorization takes 2-4 hours upon submission.' },
      { speaker: 'Caller', text: 'What documents should I carry to the desk?' },
      { speaker: 'AICA', text: 'Please bring your policy e-card, government ID, and the initial doctor advice slip.' },
    ],
    ehrAction: 'TPA Pre-authorization guidelines delivered; checklist dispatched.',
  },
  {
    id: 'c-3',
    caller: '•• 7723',
    callerName: 'Kavita Chawla',
    intent: 'Acute Chest Discomfort',
    durationSec: 24,
    confidence: 98,
    outcome: 'triage',
    department: 'Emergency',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'My father is having severe chest tightness and sweating suddenly!' },
      { speaker: 'AICA', text: 'Connecting you immediately to Venkateshwar Emergency Triage Officer. Please keep the patient seated calmly.' },
    ],
    ehrAction: 'Red Alert Triage Dispatch: ER Bay 3 notified. Code Green standby.',
  },
  {
    id: 'c-4',
    caller: '•• 9120',
    callerName: 'Sunil Mehta',
    intent: 'MRI Brain Slot Timing',
    durationSec: 58,
    confidence: 92,
    outcome: 'resolved',
    department: 'Radiology',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'When can I get an MRI brain with contrast done?' },
      { speaker: 'AICA', text: 'We have 3T MRI slots open at 2:00 PM today and 9:30 AM tomorrow. 4 hours fasting is required.' },
      { speaker: 'Caller', text: 'Book 9:30 AM tomorrow please.' },
      { speaker: 'AICA', text: 'Booked. Radiology preparation instructions sent via WhatsApp.' },
    ],
    ehrAction: 'RIS Radiology appointment reserved for 3T MRI Brain Contrast.',
  },
  {
    id: 'c-5',
    caller: '•• 4412',
    callerName: 'Vikram Joshi',
    intent: 'Dispute in Room Tariff',
    durationSec: 184,
    confidence: 54,
    outcome: 'redirected',
    department: 'Billing',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'There is a discrepancy in my semi-private room billing invoice vs the estimated quote.' },
      { speaker: 'AICA', text: 'I understand your concern. Let me transfer you directly to Senior Billing Officer Mr. Agarwal.' },
    ],
    ehrAction: 'Escalated to Patient Billing Supervisor Desk (Ext: 402).',
  },
  {
    id: 'c-6',
    caller: '•• 1048',
    callerName: 'Priya Iyer',
    intent: 'Follow-up Prescription',
    durationSec: 64,
    confidence: 88,
    outcome: 'resolved',
    department: 'Pharmacy',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Can you deliver my thyroid medication refill to Sector 18?' },
      { speaker: 'AICA', text: 'Yes, home pharmacy delivery is available. I have found your prescription on file from Dr. Nambiar.' },
    ],
    ehrAction: 'Pharmacy Order #PH-491 logged for home dispatch.',
  },
  {
    id: 'c-7',
    caller: '•• 6311',
    callerName: 'Harish Nair',
    intent: 'Doctor Late Arrival Inquiry',
    durationSec: 38,
    confidence: 62,
    outcome: 'voicemail',
    department: 'OPD',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Is Dr. Bansal running on time in OPD room 108?' },
      { speaker: 'AICA', text: 'Dr. Bansal is currently completing an emergency procedure and expected in OPD at 11:45 AM. Would you like a callback when he arrives?' },
    ],
    ehrAction: 'Automated SMS alert queued upon Doctor OPD check-in.',
  },
  {
    id: 'c-8',
    caller: '•• 5590',
    callerName: 'Devendra Pal',
    intent: 'Trauma Accident Intake',
    durationSec: 18,
    confidence: 99,
    outcome: 'triage',
    department: 'Emergency',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Road accident on Dwarka expressway, ambulance incoming with trauma victim!' },
      { speaker: 'AICA', text: 'Alerting Trauma Chief immediately. Ambulance bay doors opening now.' },
    ],
    ehrAction: 'Trauma Team Alpha dispatched to ambulance ramp.',
  },
  {
    id: 'c-9',
    caller: '•• 2219',
    callerName: 'Neha Gupta',
    intent: 'Pediatric Vaccine Availability',
    durationSec: 48,
    confidence: 94,
    outcome: 'resolved',
    department: 'OPD',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Do you have the 6-in-1 Hexaxim vaccine available today?' },
      { speaker: 'AICA', text: 'Yes, pediatric cold-chain stock is available until 7:00 PM in OPD-Pediatrics Block B.' },
    ],
    ehrAction: 'Pediatric vaccination desk informed for walk-in.',
  },
  {
    id: 'c-10',
    caller: '•• 7834',
    callerName: 'Manoj Tiwari',
    intent: 'Insurance Policy Reimbursement',
    durationSec: 162,
    confidence: 76,
    outcome: 'resolved',
    department: 'Billing',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'I need an itemized stamped final bill for submission to Max Bupa reimbursement.' },
      { speaker: 'AICA', text: 'I have generated your stamped digital discharge bill. Link has been dispatched to your registered email.' },
    ],
    ehrAction: 'Digital certified discharge statement emailed to patient.',
  },
  {
    id: 'c-11',
    caller: '•• 4192',
    callerName: 'Deepak Roy',
    intent: 'Visiting Hours Oncology ICU',
    durationSec: 32,
    confidence: 96,
    outcome: 'resolved',
    department: 'Cardiology',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'What are the evening visitor timings for 3rd floor ICU?' },
      { speaker: 'AICA', text: 'ICU visiting hours are 5:00 PM to 6:30 PM. One attendant pass is permitted at a time.' },
    ],
    ehrAction: 'ICU visitation policy guidance provided.',
  },
  {
    id: 'c-12',
    caller: '•• 9032',
    callerName: 'Meenakshi Sundaram',
    intent: 'Complex Multi-department Booking',
    durationSec: 215,
    confidence: 58,
    outcome: 'redirected',
    department: 'OPD',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'I need to see a neurologist, get an EEG, and see an endocrinologist all on the same morning.' },
      { speaker: 'AICA', text: 'To coordinate this complex multi-specialty sequence, transferring you to Concierge Care Desk.' },
    ],
    ehrAction: 'Handoff to Patient Care Concierge for multi-specialty scheduling.',
  },
  {
    id: 'c-13',
    caller: '•• 3821',
    callerName: 'Alok Saxena',
    intent: 'Lab Blood Test Normal Range',
    durationSec: 52,
    confidence: 84,
    outcome: 'resolved',
    department: 'Radiology',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Has my Lipid profile result been uploaded yet?' },
      { speaker: 'AICA', text: 'Yes, your Lipid profile was verified by Dr. Kapoor at 9:15 AM. PDF report sent to your patient portal.' },
    ],
    ehrAction: 'Lab LIS dispatch verified; patient notified.',
  },
  {
    id: 'c-14',
    caller: '•• 6114',
    callerName: 'Gurpreet Singh',
    intent: 'Wheelchair Assistance Request',
    durationSec: 36,
    confidence: 95,
    outcome: 'resolved',
    department: 'OPD',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'We are arriving at Gate 2 in 10 minutes with an elderly patient needing a wheelchair.' },
      { speaker: 'AICA', text: 'Wheelchair porter #12 has been assigned to Gate 2 arrival portico.' },
    ],
    ehrAction: 'Hospital Hospitality porter dispatch confirmed.',
  },
  {
    id: 'c-15',
    caller: '•• 8290',
    callerName: 'Tanya Bhalla',
    intent: 'Second Opinion Surgical Quote',
    durationSec: 198,
    confidence: 64,
    outcome: 'redirected',
    department: 'Cardiology',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'I need a cost estimate comparison for robotic CABG bypass surgery.' },
      { speaker: 'AICA', text: 'Let me connect you with our Cardiac Surgical Counselor, Dr. Shalini.' },
    ],
    ehrAction: 'Transferred to Cardiac Clinical Counseling line.',
  },
  {
    id: 'c-16',
    caller: '•• 8301',
    callerName: 'Sanjay Aggarwal',
    intent: 'Severe Burn Trauma Alert',
    durationSec: 22,
    confidence: 97,
    outcome: 'triage',
    department: 'Emergency',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Chemical burn in factory lab, bringing 2 patients in 5 minutes!' },
      { speaker: 'AICA', text: 'Decontamination shower and Burns Unit alerted. ER team stands ready.' },
    ],
    ehrAction: 'Emergency Code Yellow decontamination activated.',
  },
  {
    id: 'c-17',
    caller: '•• 7102',
    callerName: 'Radha Krishnan',
    intent: 'Denied Insurance Co-pay',
    durationSec: 175,
    confidence: 60,
    outcome: 'redirected',
    department: 'Billing',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'My insurer rejected the consumable charges on my mother’s stay.' },
      { speaker: 'AICA', text: 'I am routing you directly to our TPA Liaison Desk to file a dispute appeal.' },
    ],
    ehrAction: 'Escalation ticket #TPA-992 opened for review.',
  },
  {
    id: 'c-18',
    caller: '•• 9481',
    callerName: 'Farhan Akhtar',
    intent: 'Post-op Fever Emergency Report',
    durationSec: 26,
    confidence: 98,
    outcome: 'triage',
    department: 'Emergency',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Patient had gallbladder surgery 2 days ago, now having 103F fever and chills!' },
      { speaker: 'AICA', text: 'Immediate surgical triage initiated. Contacting duty surgical registrar now.' },
    ],
    ehrAction: 'Urgent Post-op complications triage flag to On-Duty Surgeon.',
  },
  {
    id: 'c-19',
    caller: '•• 5399',
    callerName: 'Manish Bhatia',
    intent: 'Ortho Knee Replacement Slot',
    durationSec: 86,
    confidence: 89,
    outcome: 'resolved',
    department: 'OPD',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Need consultation with Chief Orthopedic Surgeon Dr. Chadha.' },
      { speaker: 'AICA', text: 'Dr. Chadha has an OPD clinic this Thursday at 3:00 PM. Would you like me to book it?' },
      { speaker: 'Caller', text: 'Yes, please book Thursday 3:00 PM.' },
    ],
    ehrAction: 'OPD Booking confirmed with Dr. Chadha.',
  },
  {
    id: 'c-20',
    caller: '•• 3318',
    callerName: 'Girish Chandra',
    intent: 'CT Angio Fasting Instructions',
    durationSec: 54,
    confidence: 94,
    outcome: 'resolved',
    department: 'Radiology',
    transcriptSnippet: [
      { speaker: 'Caller', text: 'Do I need to stop taking my blood pressure medicine before the CT Coronary angiogram?' },
      { speaker: 'AICA', text: 'Continue your blood pressure medicine with a sip of water, but maintain 4 hours solid food fasting.' },
    ],
    ehrAction: 'Radiology prep instructions verified and resent via SMS.',
  },
]

const BASE_HISTOGRAM_BINS = [
  { label: '0–30s', range: '0–30s', count: 684, pct: 12.8, desc: 'Instant confirmations & hours', typicalIntents: 'Hours, gate directions, quick status checks' },
  { label: '30–60s', range: '30–60s', count: 1420, pct: 26.6, desc: 'Standard single-turn booking', typicalIntents: 'OPD doctor booking, lab report inquiry' },
  { label: '60–90s', range: '60–90s', count: 1840, pct: 34.5, desc: 'Multi-turn triage & doctor slots (Median)', typicalIntents: 'Symptom inquiry, doctor slot selection' },
  { label: '90–120s', range: '90–120s', count: 780, pct: 14.6, desc: 'Insurance eligibility & tests', typicalIntents: 'Cashless TPA, radiology fasting instructions' },
  { label: '120–180s', range: '120–180s', count: 380, pct: 7.1, desc: 'Complex billing inquiry', typicalIntents: 'Room tariff breakdown, surgical packages' },
  { label: '180–240s', range: '180–240s', count: 148, pct: 2.8, desc: 'Detailed handoff notes', typicalIntents: 'Multi-specialty referrals, disputed billing' },
  { label: '> 240s', range: '> 240s', count: 76, pct: 1.4, desc: 'Long-tail multi-patient cases', typicalIntents: 'Corporate tie-ups, complex international desk' },
]

const BASE_INTENT_METRICS = [
  {
    intent: 'OPD Consultation & Booking',
    department: 'OPD',
    volume: 1840,
    automated: 94,
    ahtSec: 52,
    color: 'bg-emerald-500',
    subIntents: [
      { name: 'Specialist Slot Confirmation', pct: 58 },
      { name: 'Doctor OPD Timings & Token', pct: 26 },
      { name: 'Reschedule / Cancellation', pct: 16 },
    ],
    primaryPath: 'Automated 2-way sync with HIS FHIR appointment scheduler',
  },
  {
    intent: 'Lab Reports & Diagnostic Status',
    department: 'Radiology',
    volume: 1120,
    automated: 91,
    ahtSec: 44,
    color: 'bg-emerald-500',
    subIntents: [
      { name: 'Biochemistry & Blood Panel Status', pct: 64 },
      { name: 'Radiology (CT / MRI) Ready Alert', pct: 24 },
      { name: 'Home Sample Collection Slot', pct: 12 },
    ],
    primaryPath: 'LIS API automated SMS / WhatsApp secure report link delivery',
  },
  {
    intent: 'Cashless TPA & Insurance Claim',
    department: 'Billing',
    volume: 860,
    automated: 78,
    ahtSec: 112,
    color: 'bg-amber-500',
    subIntents: [
      { name: 'Empanelled Insurer Check', pct: 45 },
      { name: 'Pre-auth Approval Status', pct: 35 },
      { name: 'Co-pay & Tariff Clarification', pct: 20 },
    ],
    primaryPath: 'TPA clearinghouse portal status lookup & instant SMS check',
  },
  {
    intent: 'Hospital Timings & Campus Navigation',
    department: 'General',
    volume: 658,
    automated: 98,
    ahtSec: 36,
    color: 'bg-emerald-500',
    subIntents: [
      { name: 'ICU & Inpatient Visiting Hours', pct: 52 },
      { name: 'Gate / Valet Parking Directions', pct: 32 },
      { name: 'Pharmacy 24/7 Counter Location', pct: 16 },
    ],
    primaryPath: 'Rule-based automated concierge voice answering',
  },
  {
    intent: 'Prescription Refill & Pharmacy',
    department: 'Pharmacy',
    volume: 640,
    automated: 88,
    ahtSec: 68,
    color: 'bg-emerald-500',
    subIntents: [
      { name: 'Chronic Medicine Home Delivery', pct: 54 },
      { name: 'Specialty Medication Stock Check', pct: 32 },
      { name: 'Doctor Dosage Clarification', pct: 14 },
    ],
    primaryPath: 'Pharmacy POS integration with delivery address verification',
  },
  {
    intent: 'Clinical Emergency & Trauma Protocol',
    department: 'Emergency',
    volume: 210,
    automated: 0,
    ahtSec: 24,
    color: 'bg-rose-500',
    note: '100% Instant Human Dispatch',
    subIntents: [
      { name: 'Acute Cardiac / Stroke Symptoms', pct: 48 },
      { name: 'Road Traffic Trauma Pre-alert', pct: 34 },
      { name: 'Pediatric Acute Respiratory', pct: 18 },
    ],
    primaryPath: 'Immediate priority ring-through to Trauma Bay duty phone',
  },
]

type HeatmapMetricMode = 'calls' | 'resolutionRate' | 'escalations'

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  resolved: 'Resolved by AICA',
  redirected: 'Redirected to staff',
  voicemail: 'Voicemail taken',
  no_answer_redirect: 'No answer — redirected',
}

const OUTCOME_COLOR: Record<CallOutcome, string> = {
  resolved: 'text-sage',
  redirected: 'text-amber',
  voicemail: 'text-signal',
  no_answer_redirect: 'text-critical',
}

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------

export function Dashboard({
  onNavigate,
}: {
  onNavigate: (id: string, filter?: CallLogSeed) => void
}) {
  // Interactive controls state
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('7d')
  const [selectedDept, setSelectedDept] = useState('all')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'resolved' | 'redirected' | 'triage'>('all')
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetricMode>('calls')

  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null)
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null)
  const [selectedDayHighlight, setSelectedDayHighlight] = useState<string | null>(null)

  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null)
  const [activeCallModal, setActiveCallModal] = useState<ScatterPoint | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioSpeed, setAudioSpeed] = useState<number>(1)
  const inspectorRef = useRef<HTMLDivElement>(null)
  const [isMobileScreen, setIsMobileScreen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!activeCallModal) return
    const handlePointerDown = (e: MouseEvent) => {
      if (inspectorRef.current && !inspectorRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (target.closest('[data-scatter-point]')) return
        setActiveCallModal(null)
        setIsPlayingAudio(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCallModal(null)
        setIsPlayingAudio(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeCallModal])

  const [hoveredBin, setHoveredBin] = useState<(typeof BASE_HISTOGRAM_BINS)[0] | null>(null)
  const [selectedBin, setSelectedBin] = useState<(typeof BASE_HISTOGRAM_BINS)[0] | null>(null)

  const [expandedIntent, setExpandedIntent] = useState<string | null>(null)
  const [intentSortBy, setIntentSortBy] = useState<'volume' | 'automated' | 'aht'>('volume')

  const [liveStreamActive, setLiveStreamActive] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  // Multiplier based on time horizon
  const timeMultiplier = useMemo(() => {
    if (timeRange === 'today') return 0.15
    if (timeRange === '30d') return 4.35
    return 1.0
  }, [timeRange])

  // Top KPIs dynamically computed
  const kpis = useMemo(() => {
    let baseCalls = 5328
    let aht = '1m 24s'
    let fcr = '86.4%'
    let conf = '92.8%'
    let peak = '152/hr'
    let peakSub = 'Fri 10:00 AM'

    if (timeRange === 'today') {
      baseCalls = 784
      aht = '1m 16s'
      fcr = '88.9%'
      conf = '94.2%'
      peak = '96/hr'
      peakSub = 'Today 10:00 AM'
    } else if (timeRange === '30d') {
      baseCalls = 22940
      aht = '1m 28s'
      fcr = '85.2%'
      conf = '91.7%'
      peak = '168/hr'
      peakSub = 'Oct 14 Shift'
    }

    if (selectedDept !== 'all') {
      const deptFactors: Record<string, { calls: number; fcr: string; aht: string }> = {
        cardiology: { calls: Math.round(baseCalls * 0.28), fcr: '89.1%', aht: '1m 12s' },
        emergency: { calls: Math.round(baseCalls * 0.08), fcr: '0.0%', aht: '0m 24s' },
        billing: { calls: Math.round(baseCalls * 0.22), fcr: '78.4%', aht: '1m 52s' },
        radiology: { calls: Math.round(baseCalls * 0.24), fcr: '91.8%', aht: '0m 58s' },
        opd: { calls: Math.round(baseCalls * 0.35), fcr: '94.2%', aht: '0m 52s' },
      }
      const deptData = deptFactors[selectedDept]
      if (deptData) {
        baseCalls = deptData.calls
        fcr = deptData.fcr
        aht = deptData.aht
      }
    }

    return [
      { label: 'Total Inbound Calls', value: baseCalls.toLocaleString(), delta: timeRange === 'today' ? '+8.1%' : '+12.4%', trend: 'up', sub: timeRange === 'today' ? 'Since 8:00 AM' : timeRange === '7d' ? 'Last 7 days' : 'Last 30 days' },
      { label: 'Average Handling Time', value: aht, delta: '-18s faster', trend: 'up', sub: 'Target < 1m 45s' },
      { label: 'First Contact Resolution', value: fcr, delta: '+4.2% pts', trend: 'up', sub: 'Handled by AICA' },
      { label: 'AI Confidence Score', value: conf, delta: '+1.5% pts', trend: 'up', sub: 'Clinical Intent NLU' },
      { label: 'Peak Hour Volume', value: peak, delta: peakSub, trend: 'flat', sub: 'Max telephony burst' },
    ]
  }, [timeRange, selectedDept])

  // Heatmap dataset adjusted for active time range and department
  const heatmapData = useMemo(() => {
    return RAW_HEATMAP_DATA.map((item) => {
      let multiplier = timeMultiplier
      if (selectedDept === 'emergency') {
        multiplier *= 0.12
      } else if (selectedDept === 'cardiology') {
        multiplier *= 0.30
      } else if (selectedDept === 'billing') {
        multiplier *= 0.22
      } else if (selectedDept === 'radiology') {
        multiplier *= 0.24
      } else if (selectedDept === 'opd') {
        multiplier *= 0.36
      }

      const calls = Math.max(1, Math.round(item.calls * (selectedDept === 'all' ? (timeRange === 'today' ? 0.8 : 1) : multiplier)))
      const resolutionRate = selectedDept === 'emergency' ? 0 : item.resolutionRate
      const escalations = Math.round((calls * (100 - resolutionRate)) / 100)

      return {
        ...item,
        calls,
        resolutionRate,
        escalations,
      }
    })
  }, [timeMultiplier, selectedDept, timeRange])

  // Max value for heatmap color scaling
  const maxHeatmapMetric = useMemo(() => {
    if (heatmapMetric === 'calls') {
      return Math.max(...heatmapData.map((d) => d.calls), 120)
    }
    if (heatmapMetric === 'resolutionRate') return 100
    return Math.max(...heatmapData.map((d) => d.escalations), 24)
  }, [heatmapData, heatmapMetric])

  // Filtered scatter data
  const filteredScatter = useMemo(() => {
    return SCATTER_DATA.filter((pt) => {
      const matchOutcome = outcomeFilter === 'all' || pt.outcome === outcomeFilter
      const matchDept = selectedDept === 'all' || pt.department.toLowerCase() === selectedDept.toLowerCase()
      return matchOutcome && matchDept
    })
  }, [outcomeFilter, selectedDept])

  // Histogram bins adjusted
  const histogramBins = useMemo(() => {
    return BASE_HISTOGRAM_BINS.map((b) => ({
      ...b,
      count: Math.round(b.count * timeMultiplier * (selectedDept === 'all' ? 1 : 0.35)),
    }))
  }, [timeMultiplier, selectedDept])

  const maxHistoCount = Math.max(...histogramBins.map((b) => b.count), 1)

  // Intent metrics with dynamic sorting and filtering
  const sortedIntents = useMemo(() => {
    let list = BASE_INTENT_METRICS.filter((i) => {
      if (selectedDept === 'all') return true
      return i.department.toLowerCase() === selectedDept.toLowerCase() || i.department === 'General'
    }).map((i) => ({
      ...i,
      volume: Math.round(i.volume * timeMultiplier),
    }))

    if (intentSortBy === 'volume') {
      list.sort((a, b) => b.volume - a.volume)
    } else if (intentSortBy === 'automated') {
      list.sort((a, b) => b.automated - a.automated)
    } else if (intentSortBy === 'aht') {
      list.sort((a, b) => a.ahtSec - b.ahtSec)
    }
    return list
  }, [selectedDept, timeMultiplier, intentSortBy])

  // Export handler
  const handleExportData = () => {
    const columns = [
      'Day',
      'Hour',
      'Inbound Calls',
      'AI Resolution Rate (%)',
      'Staff Escalations',
      'Avg Handling Time (s)',
      'Primary Clinical Intent',
      'Filter Department',
      'Time Horizon',
    ]
    const rows = heatmapData.map((row) => [
      row.day,
      row.hour,
      row.calls,
      `${row.resolutionRate}%`,
      row.escalations,
      `${row.ahtSec}s`,
      row.topIntent,
      selectedDept.toUpperCase(),
      timeRange,
    ])
    downloadCsv(`aica_clinical_telephony_${timeRange}_${selectedDept}.csv`, columns, rows)
    setExportNotice(`Exported ${rows.length} telephony slot records as CSV`)
    setTimeout(() => setExportNotice(null), 4000)
  }

  // Dashboard-specific statistics
  const topIntent = mostFrequentIntent([...mockCallLog, ...mockLiveCalls]) ?? 'Rescheduling — Rm. 3'

  const outcomeCounts = new Map<CallOutcome, number>()
  for (const entry of mockCallLog) {
    outcomeCounts.set(entry.outcome, (outcomeCounts.get(entry.outcome) ?? 0) + 1)
  }
  const resolvedBreakdown: DonutSegment[] = Array.from(outcomeCounts.entries()).map(
    ([outcome, value]) => ({
      label: OUTCOME_LABEL[outcome],
      value,
      colorClassName: OUTCOME_COLOR[outcome],
    }),
  )
  const matchedBreakdown: DonutSegment[] = [
    { label: 'Beat human', value: mockSimulationRun.beat, colorClassName: 'text-pulse' },
    { label: 'Matched human', value: mockSimulationRun.matched, colorClassName: 'text-sage' },
    { label: 'Worse than human', value: mockSimulationRun.worse, colorClassName: 'text-amber' },
  ]
  const BREAKDOWNS: Record<string, DonutSegment[]> = {
    'resolved-no-redirect': resolvedBreakdown,
    'matched-human': matchedBreakdown,
  }
  const DONUT_ICON: Record<string, ReactNode> = {
    'resolved-no-redirect': <CheckIcon className="h-4 w-4" />,
    'matched-human': <DataReadinessIcon className="h-4 w-4" />,
  }
  const STAT_TARGET: Record<string, () => void> = {
    'resolved-no-redirect': () => onNavigate('handled-calls', { outcome: 'resolved' }),
    'matched-human': () => onNavigate('simulation'),
  }

  const percentStats = mockStats.filter((s) => s.format === 'percent')

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification for Export / Actions */}
      {exportNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-ink-teal px-4 py-3 text-xs text-white shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-3">
          <CheckIcon className="h-4 w-4 text-sage" />
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="ml-2 text-mist/60 hover:text-white"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Global Filter Command Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-canvas text-pulse">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <h1 className="font-display text-xl font-bold text-body">
                Hospital Clinical Operations & Analytics
              </h1>
              {liveStreamActive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sage border border-emerald-500/20 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                  Live Stream: 14 Lines Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              Unified command center: live telephony calls, AI resolution benchmarks, hourly arrival heatmaps, and latency models.
            </p>
          </div>

          {/* Global Interactive Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setLiveStreamActive((prev) => !prev)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                liveStreamActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-canvas text-muted border-hairline hover:text-body'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${liveStreamActive ? 'bg-sage animate-ping' : 'bg-slate-300'}`} />
              {liveStreamActive ? 'Live Telephony ON' : 'Live Monitor'}
            </button>

            {/* Time Horizon Pills */}
            <div className="flex items-center rounded-xl border border-hairline bg-canvas p-0.5">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7d' },
                { id: '30d', label: 'Last 30d' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeRange(t.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    timeRange === t.id
                      ? 'bg-white text-body font-semibold shadow-2xs'
                      : 'text-muted hover:text-body'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <Dropdown
              value={selectedDept}
              onChange={setSelectedDept}
              icon={<FilterIcon className="h-3.5 w-3.5" />}
              size="sm"
              variant="compact"
              options={[
                { value: 'all', label: 'All Departments', dotColor: '#1677b8', badge: 'Total' },
                { value: 'cardiology', label: 'Cardiology', dotColor: '#dc2626', desc: 'OPD & Cath Lab' },
                { value: 'emergency', label: 'Emergency & Triage', dotColor: '#e11d48', desc: '24/7 Red Code' },
                { value: 'billing', label: 'Billing & TPA', dotColor: '#f59e0b', desc: 'Cashless & Invoices' },
                { value: 'radiology', label: 'Radiology', dotColor: '#8b5cf6', desc: '3T MRI & CT' },
                { value: 'opd', label: 'OPD Consultation', dotColor: '#10b981', desc: 'Outpatient clinics' },
              ]}
            />

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportData}
              className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 hover:border-pulse hover:text-pulse transition-colors"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Live Inbound Telephony Stream Banner */}
        {liveStreamActive && (
          <div className="flex items-center justify-between rounded-xl bg-ink-teal/95 px-4 py-2.5 text-xs text-mist shadow-inner animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-white">Live Inbound Feed:</span>
              <span className="font-mono text-xs text-mist/90">
                Inbound call from <strong>+91 98101 ••429</strong> · Intent: OPD Cardiology Dr. Rao · Assigned to AICA Bot #3
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-mist/70 font-mono">Speed to Answer: 0.6s</span>
              <button
                type="button"
                onClick={() => onNavigate('handled-calls')}
                className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                View Handled Calls
              </button>
            </div>
          </div>
        )}
      </div>


      {/* KPI Top Cards Row (Dynamically adjusted by Time & Department) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="card p-4 flex flex-col justify-between hover:border-pulse/40 transition-all duration-200"
          >
            <p className="text-xs font-medium text-muted truncate">{kpi.label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-body">{kpi.value}</p>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  kpi.trend === 'up' ? 'text-sage' : 'text-muted'
                }`}
              >
                {kpi.trend === 'up' && <ArrowUpRightIcon className="h-3 w-3" />}
                {kpi.delta}
              </span>
              <span className="text-faint">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight Banner (As requested in screenshot) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface/80 px-4 py-3 shadow-xs transition-all hover:border-pulse/30 hover:shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-insight/10 text-insight">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-insight/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-insight">
              AI Insight
            </span>
            <span className="text-muted">Most common inquiry this week:</span>
            <span className="font-semibold text-body">“{topIntent}”</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('telephony-analytics')
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="flex items-center gap-1 text-xs font-medium text-pulse hover:underline"
          >
            Telephony Analytics
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
          <span className="text-hairline">|</span>
          <button
            type="button"
            onClick={() => onNavigate('handled-calls', { search: topIntent })}
            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-body hover:underline"
          >
            Filter handled calls
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* The Two Performance Breakdown Donut Cards (As requested in screenshot) */}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        {percentStats.map((stat) => (
          <DonutChartCard
            key={stat.id}
            title={stat.label}
            icon={DONUT_ICON[stat.id]}
            segments={BREAKDOWNS[stat.id] ?? []}
            centerLabel={stat.value}
            value={stat.numericValue}
            target={stat.target}
            delta={stat.delta}
            trend={stat.trend}
            onOpen={STAT_TARGET[stat.id]}
          />
        ))}
      </div>

      {/* Telephony Analytics Anchor Header */}
      <div id="telephony-analytics" className="scroll-mt-6 flex flex-col gap-1 pt-2 border-t border-hairline/60">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
            <AnalyticsIcon className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-bold text-body">
            Deep-Dive Telephony Analytics & Arrival Patterns
          </h2>
        </div>
        <p className="text-xs text-muted">
          Interactive clinical call arrival heatmaps, duration distributions, and AI confidence scatter models.
        </p>
      </div>

      {/* Chart 1: Hourly Call Volume & Staff Load Heatmap */}
      <div className="card p-5 relative overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-pulse" />
              <h2 className="text-base font-semibold text-body">Call Volume Arrival Heatmap</h2>
              {selectedDayHighlight && (
                <span className="rounded bg-pulse/10 px-2 py-0.5 text-[10px] font-bold text-pulse">
                  Showing {selectedDayHighlight} Only
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Hourly arrival density across weekdays and weekend clinical shifts. Click any cell to inspect slot details.
            </p>
          </div>

          {/* Interactive Metric Mode Selector & Heatmap Legend */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Metric Mode Switcher */}
            <div className="flex items-center rounded-xl border border-hairline bg-canvas p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHeatmapMetric('calls')}
                className={`rounded-lg px-2 py-1 font-medium transition-all ${
                  heatmapMetric === 'calls'
                    ? 'bg-pulse text-white shadow-2xs font-semibold'
                    : 'text-muted hover:text-body'
                }`}
              >
                Volume
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMetric('resolutionRate')}
                className={`rounded-lg px-2 py-1 font-medium transition-all ${
                  heatmapMetric === 'resolutionRate'
                    ? 'bg-pulse text-white shadow-2xs font-semibold'
                    : 'text-muted hover:text-body'
                }`}
              >
                Automation %
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMetric('escalations')}
                className={`rounded-lg px-2 py-1 font-medium transition-all ${
                  heatmapMetric === 'escalations'
                    ? 'bg-pulse text-white shadow-2xs font-semibold'
                    : 'text-muted hover:text-body'
                }`}
              >
                Escalations
              </button>
            </div>

            {/* Dynamic Legend */}
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="text-[11px]">
                {heatmapMetric === 'calls'
                  ? 'Low (0-30)'
                  : heatmapMetric === 'resolutionRate'
                    ? '< 75%'
                    : '0-2'}
              </span>
              <div className="flex items-center gap-1">
                {heatmapMetric === 'calls' ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded bg-blue-50 border border-slate-200" />
                    <span className="h-3.5 w-3.5 rounded bg-sky-200" />
                    <span className="h-3.5 w-3.5 rounded bg-[#42b9d5]" />
                    <span className="h-3.5 w-3.5 rounded bg-[#1677b8]" />
                    <span className="h-3.5 w-3.5 rounded bg-[#075a91]" />
                  </>
                ) : heatmapMetric === 'resolutionRate' ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-300" />
                    <span className="h-3.5 w-3.5 rounded bg-emerald-200" />
                    <span className="h-3.5 w-3.5 rounded bg-emerald-400" />
                    <span className="h-3.5 w-3.5 rounded bg-emerald-600" />
                    <span className="h-3.5 w-3.5 rounded bg-emerald-800" />
                  </>
                ) : (
                  <>
                    <span className="h-3.5 w-3.5 rounded bg-slate-100 border border-slate-200" />
                    <span className="h-3.5 w-3.5 rounded bg-amber-200" />
                    <span className="h-3.5 w-3.5 rounded bg-amber-400" />
                    <span className="h-3.5 w-3.5 rounded bg-rose-400" />
                    <span className="h-3.5 w-3.5 rounded bg-rose-600" />
                  </>
                )}
              </div>
              <span className="text-[11px] font-semibold text-body">
                {heatmapMetric === 'calls'
                  ? 'Peak (140+)'
                  : heatmapMetric === 'resolutionRate'
                    ? '95%+'
                    : '20+'}
              </span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Container with Anti-Clipping Adaptive Tooltip Positioning */}
        <div className="mt-5 overflow-x-auto pt-2 pb-6 px-1">
          <div className="min-w-[640px]">
            {/* Hour Header labels */}
            <div className="flex items-center pb-2.5 pl-12 text-[11px] font-mono text-muted">
              {HOURS.map((hr) => (
                <div key={hr} className="flex-1 text-center font-medium">
                  {hr}
                </div>
              ))}
            </div>

            {/* Day Rows */}
            <div className="flex flex-col gap-1.5">
              {DAYS.map((day, dayIdx) => {
                const dayCells = heatmapData.filter((d) => d.day === day)
                const isDayHighlighted = selectedDayHighlight === null || selectedDayHighlight === day
                const isTopRow = dayIdx < 2

                return (
                  <div
                    key={day}
                    className={`flex items-center gap-1.5 transition-opacity duration-150 ${
                      isDayHighlighted ? 'opacity-100' : 'opacity-35'
                    }`}
                  >
                    {/* Clickable Day Label */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDayHighlight((prev) => (prev === day ? null : day))
                      }
                      title={`Click to filter ${day}`}
                      className={`w-10 text-xs font-semibold shrink-0 text-left rounded px-1 py-1 transition-colors cursor-pointer ${
                        selectedDayHighlight === day
                          ? 'bg-pulse text-white'
                          : 'text-body hover:bg-surface-hover'
                      }`}
                    >
                      {day}
                    </button>

                    <div className="flex flex-1 items-center gap-1.5">
                      {dayCells.map((cell, hIdx) => {
                        let bgClass = 'bg-blue-50/70 border border-slate-200/50 text-slate-800'
                        let displayValue: string | number = cell.calls

                        if (heatmapMetric === 'calls') {
                          displayValue = cell.calls
                          const intensity = cell.calls / maxHeatmapMetric
                          if (intensity > 0.8) bgClass = 'bg-[#075a91] text-white shadow-2xs font-semibold'
                          else if (intensity > 0.6) bgClass = 'bg-[#1677b8] text-white font-medium'
                          else if (intensity > 0.4) bgClass = 'bg-[#42b9d5] text-slate-900 font-medium'
                          else if (intensity > 0.2) bgClass = 'bg-sky-200 text-slate-800'
                          else bgClass = 'bg-blue-50/80 border border-slate-200/70 text-slate-700'
                        } else if (heatmapMetric === 'resolutionRate') {
                          displayValue = `${cell.resolutionRate}%`
                          if (cell.resolutionRate >= 94) bgClass = 'bg-emerald-800 text-white font-bold'
                          else if (cell.resolutionRate >= 90) bgClass = 'bg-emerald-600 text-white font-medium'
                          else if (cell.resolutionRate >= 85) bgClass = 'bg-emerald-400 text-slate-900'
                          else if (cell.resolutionRate >= 78) bgClass = 'bg-emerald-200 text-slate-800'
                          else bgClass = 'bg-amber-100 border border-amber-300 text-amber-900'
                        } else {
                          displayValue = cell.escalations
                          const intensity = cell.escalations / maxHeatmapMetric
                          if (intensity > 0.75) bgClass = 'bg-rose-600 text-white font-bold'
                          else if (intensity > 0.5) bgClass = 'bg-rose-400 text-white font-medium'
                          else if (intensity > 0.25) bgClass = 'bg-amber-300 text-slate-900'
                          else if (intensity > 0.1) bgClass = 'bg-amber-100 text-slate-800'
                          else bgClass = 'bg-slate-50 border border-slate-200 text-slate-600'
                        }

                        const isHovered = hoveredCell?.day === cell.day && hoveredCell?.hour === cell.hour
                        const isSelected = selectedCell?.day === cell.day && selectedCell?.hour === cell.hour

                        const isLeftCol = hIdx < 2
                        const isRightCol = hIdx >= HOURS.length - 2
                        const tooltipHAlign = isLeftCol
                          ? 'left-0 translate-x-0'
                          : isRightCol
                            ? 'right-0 left-auto translate-x-0'
                            : 'left-1/2 -translate-x-1/2'
                        const tooltipVAlign = isTopRow
                          ? 'top-full mt-2.5'
                          : 'bottom-full mb-2.5'

                        return (
                          <div
                            key={cell.hour}
                            onMouseEnter={() => setHoveredCell(cell)}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() =>
                              setSelectedCell((prev) =>
                                prev?.day === cell.day && prev?.hour === cell.hour ? null : cell
                              )
                            }
                            tabIndex={0}
                            role="button"
                            aria-label={`${cell.day} ${cell.hour}: ${cell.calls} calls, ${cell.resolutionRate}% resolution`}
                            className={`group relative flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-mono cursor-pointer transition-all duration-150 select-none ${bgClass} ${
                              isSelected
                                ? 'ring-3 ring-pulse ring-offset-2 scale-105 z-20 shadow-md'
                                : isHovered
                                  ? 'ring-2 ring-pulse scale-105 z-30 shadow-sm'
                                  : 'hover:scale-102'
                            }`}
                          >
                            <span>{displayValue}</span>

                            {/* Tooltip with Adaptive Anti-Clipping Positioning */}
                            {isHovered && (
                              <div
                                className={`pointer-events-none absolute ${tooltipVAlign} ${tooltipHAlign} z-50 whitespace-nowrap rounded-xl border border-hairline/60 bg-ink-teal/95 px-3 py-2 text-xs text-mist shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95`}
                                style={{ minWidth: '190px' }}
                              >
                                <div
                                  className={`absolute ${
                                    isTopRow
                                      ? '-top-1 border-b-4 border-b-ink-teal/95'
                                      : '-bottom-1 border-t-4 border-t-ink-teal/95'
                                  } border-x-4 border-x-transparent ${
                                    isLeftCol
                                      ? 'left-4'
                                      : isRightCol
                                        ? 'right-4'
                                        : 'left-1/2 -translate-x-1/2'
                                  }`}
                                />

                                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
                                  <span className="font-semibold text-white">
                                    {cell.day} at {cell.hour}
                                  </span>
                                  <span className="rounded bg-pulse/30 px-1.5 py-0.5 text-[9px] font-mono text-cyan uppercase font-bold">
                                    Click to inspect
                                  </span>
                                </div>

                                <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                                  <div className="flex items-center justify-between text-mist/90">
                                    <span>Call volume:</span>
                                    <strong className="text-white">{cell.calls} inbound</strong>
                                  </div>
                                  <div className="flex items-center justify-between text-mist/90">
                                    <span>AI Auto-Resolved:</span>
                                    <strong className="text-sage">{cell.resolutionRate}%</strong>
                                  </div>
                                  <div className="flex items-center justify-between text-mist/90">
                                    <span>Staff Escalations:</span>
                                    <strong className="text-amber">{cell.escalations} handoffs</strong>
                                  </div>
                                  <div className="flex items-center justify-between text-mist/75 text-[10px] pt-0.5 border-t border-white/5">
                                    <span>Avg Duration:</span>
                                    <span>{cell.ahtSec}s</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Interactive Hourly Slot Deep-Dive Drawer (When a Cell is Clicked) */}
        {selectedCell && (
          <div className="mt-4 rounded-xl border border-pulse/30 bg-pulse/5 p-4 animate-in fade-in-50 slide-in-from-top-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-pulse/15 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pulse text-white font-bold text-xs">
                  {selectedCell.day}
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-body">
                    {selectedCell.day} at {selectedCell.hour} — Slot Intelligence
                  </h3>
                  <p className="text-xs text-muted">
                    Peak clinical focus: <strong className="text-body">{selectedCell.topIntent}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('handled-calls', {
                      search: selectedCell.day,
                    })
                  }
                  className="rounded-lg bg-pulse px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-pulse/90 flex items-center gap-1"
                >
                  Inspect Handled Calls ({selectedCell.calls})
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-body"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Slot Quick Metrics Grid */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-hairline bg-surface p-2.5">
                <span className="text-[11px] text-muted">Total Volume</span>
                <p className="font-mono text-lg font-bold text-body">{selectedCell.calls} calls</p>
                <span className="text-[10px] text-sage">+{Math.round(selectedCell.calls * 0.12)} vs baseline</span>
              </div>
              <div className="rounded-lg border border-hairline bg-surface p-2.5">
                <span className="text-[11px] text-muted">AI First Contact Resolution</span>
                <p className="font-mono text-lg font-bold text-sage">{selectedCell.resolutionRate}%</p>
                <span className="text-[10px] text-muted">Zero human hold time</span>
              </div>
              <div className="rounded-lg border border-hairline bg-surface p-2.5">
                <span className="text-[11px] text-muted">Front-Desk Escalations</span>
                <p className="font-mono text-lg font-bold text-amber">{selectedCell.escalations} routed</p>
                <span className="text-[10px] text-muted">Transferred to OPD desk</span>
              </div>
              <div className="rounded-lg border border-hairline bg-surface p-2.5">
                <span className="text-[11px] text-muted">Avg Call Latency</span>
                <p className="font-mono text-lg font-bold text-body">{selectedCell.ahtSec}s</p>
                <span className="text-[10px] text-sage">Optimal AHT threshold</span>
              </div>
            </div>
          </div>
        )}

        {/* Heatmap Clinical Takeaway */}
        <div className="mt-4 rounded-xl border border-hairline bg-surface-hover/50 p-3 text-xs text-muted flex items-start gap-2.5">
          <span className="rounded bg-pulse/10 p-1 text-pulse font-bold text-[10px] uppercase tracking-wide">
            Peak Pattern
          </span>
          <p className="leading-relaxed">
            Major telephony rush occurs weekdays between <strong className="text-body font-semibold">9:00 AM – 11:30 AM</strong> (averaging 142 calls/hr). AICA deflects 89% of morning appointment queries without putting callers on hold.
          </p>
        </div>
      </div>

      {/* Two Column Section: Scatter Plot (Left) & Latency Histogram (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Chart 2: Call Duration vs AI Confidence Score Scatter Plot (7 Cols) */}
        <div className="card p-5 lg:col-span-7 flex flex-col relative overflow-visible">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sage" />
                <h2 className="text-base font-semibold text-body">Call Duration vs. Confidence Scatter</h2>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                Correlation between call handling length (seconds) and AI intent classification confidence. Click any point to open call recording.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'resolved', label: 'Resolved', dot: 'bg-sage' },
                { id: 'redirected', label: 'Staff Handoff', dot: 'bg-pulse' },
                { id: 'triage', label: 'Triage', dot: 'bg-critical' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setOutcomeFilter(pill.id as any)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                    outcomeFilter === pill.id
                      ? 'bg-pulse text-white shadow-2xs font-semibold'
                      : 'border border-hairline bg-surface text-muted hover:text-body'
                  }`}
                >
                  {pill.dot && <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />}
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scatter Chart Canvas Area */}
          <div className="relative mt-5 flex-1 min-h-[320px] pt-3 pb-12 pl-16 pr-6 overflow-visible select-none">
            {/* Plot Area Frame */}
            <div className="relative w-full h-[260px] border-b border-l border-slate-300">
              {/* Y-Axis Label (Placed clearly to the left with ample breathing room, no collision with tick numbers) */}
              <div className="absolute -left-14 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono uppercase tracking-wider text-muted font-medium whitespace-nowrap pointer-events-none select-none">
                Confidence %
              </div>

              {/* Y-Axis Ticks & Grid Lines */}
              {[100, 80, 60, 40].map((tick) => {
                const topPct = ((100 - tick) / 60) * 100
                return (
                  <div
                    key={tick}
                    className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                    style={{ top: `${topPct}%` }}
                  >
                    {/* Tick label neatly right-aligned to the left of the axis line */}
                    <span className="absolute -left-10 w-8 text-right text-[10px] font-mono font-medium text-faint -translate-y-1/2 select-none">
                      {tick}%
                    </span>
                    {/* Tick mark extending left */}
                    <span className="absolute -left-1.5 w-1.5 border-t border-slate-300 -translate-y-1/2" />
                  </div>
                )
              })}

              {/* Quadrant Separation Guidelines */}
              {/* 75% Target Confidence Floor */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-slate-300/80 pointer-events-none z-0"
                style={{ top: `${((100 - 75) / 60) * 100}%` }}
              >
                <span className="absolute right-2 -top-4 text-[9px] font-mono uppercase tracking-wider text-slate-400 bg-surface/90 px-1 rounded select-none">
                  75% Target Confidence Floor
                </span>
              </div>

              {/* 90s AHT Benchmark */}
              <div
                className="absolute top-0 bottom-0 border-l border-dashed border-slate-300/80 pointer-events-none z-0"
                style={{ left: `${(90 / 240) * 100}%` }}
              >
                <span className="absolute top-28 left-2 -rotate-90 origin-bottom-left text-[9px] font-mono uppercase tracking-wider text-slate-400 select-none whitespace-nowrap">
                  90s AHT Benchmark
                </span>
              </div>

              {/* Scatter Points (Rendered in identical coordinate space) */}
              <div className="absolute inset-0 overflow-visible">
                {filteredScatter.map((pt) => {
                  const xPct = Math.min(100, Math.max(0, (pt.durationSec / 240) * 100))
                  const yPct = Math.min(100, Math.max(0, ((100 - pt.confidence) / 60) * 100))
                  const isHovered = hoveredPoint?.id === pt.id
                  const isSelected = activeCallModal?.id === pt.id

                  let color = 'bg-sage border-emerald-600'
                  if (pt.outcome === 'redirected') color = 'bg-pulse border-blue-600'
                  if (pt.outcome === 'voicemail') color = 'bg-amber border-amber-600'
                  if (pt.outcome === 'triage') color = 'bg-critical border-rose-600'

                  const isScatterTop = yPct < 28
                  const isScatterLeft = xPct < 22
                  const isScatterRight = xPct > 78
                  const scatterVAlign = isScatterTop ? 'top-full mt-2' : 'bottom-full mb-2'
                  const scatterHAlign = isScatterLeft
                    ? 'left-0 translate-x-0'
                    : isScatterRight
                      ? 'right-0 left-auto translate-x-0'
                      : 'left-1/2 -translate-x-1/2'

                  return (
                    <div
                      key={pt.id}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveCallModal((prev) => (prev?.id === pt.id ? null : pt))
                        setIsPlayingAudio(false)
                      }}
                      data-scatter-point="true"
                      tabIndex={0}
                      role="button"
                      aria-label={`Call ${pt.caller}: ${pt.intent}, ${pt.confidence}% confidence, ${pt.durationSec}s`}
                      className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-pointer transition-all duration-150 ${color} ${
                        isSelected
                          ? 'scale-175 z-40 shadow-lg ring-4 ring-pulse ring-offset-2'
                          : isHovered
                            ? 'scale-175 z-40 shadow-md ring-4 ring-pulse/35'
                            : 'hover:scale-130 z-10'
                      }`}
                      style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    >
                      {/* Tooltip with Anti-Clipping Logic (Only shown when not selected) */}
                      {isHovered && !isSelected && (
                        <div
                          className={`pointer-events-none absolute ${scatterVAlign} ${scatterHAlign} z-50 whitespace-nowrap rounded-xl border border-hairline/60 bg-ink-teal/95 px-3 py-2 text-xs text-mist shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95`}
                          style={{ minWidth: '180px' }}
                        >
                          <div className="flex items-center justify-between gap-3 font-semibold text-white">
                            <span>{pt.caller} ({pt.callerName})</span>
                            <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] uppercase font-mono">
                              {pt.outcome}
                            </span>
                          </div>
                          <p className="mt-1 font-medium text-body-light text-slate-200">
                            {pt.intent}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-3 font-mono text-[10px] text-mist/80 border-t border-white/10 pt-1">
                            <span>Duration: <strong>{pt.durationSec}s</strong></span>
                            <span>Confidence: <strong>{pt.confidence}%</strong></span>
                            <span>Dept: {pt.department}</span>
                          </div>
                          <div className="mt-1 text-[9px] text-cyan font-semibold text-right">
                            Click to play audio & inspect →
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Active Call Inspector Popover (Rendered directly where user clicks) */}
                {activeCallModal && (() => {
                  const modalXPct = Math.min(100, Math.max(0, (activeCallModal.durationSec / 240) * 100))
                  const modalYPct = Math.min(100, Math.max(0, ((100 - activeCallModal.confidence) / 60) * 100))
                  const isRightSide = modalXPct > 50
                  const isBottomSide = modalYPct > 45

                  return (
                    <div
                      ref={inspectorRef}
                      role="dialog"
                      aria-modal="true"
                      aria-label={`Call audio and transcript for ${activeCallModal.caller}`}
                      className={`z-50 rounded-2xl border border-hairline bg-surface/98 p-4 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 ${
                        isMobileScreen
                          ? 'fixed inset-x-3 top-20 max-w-sm mx-auto'
                          : 'absolute w-[360px] sm:w-[410px] max-w-[calc(100%-16px)]'
                      }`}
                      style={
                        !isMobileScreen
                          ? {
                              ...(isRightSide
                                ? { right: `calc(${100 - modalXPct}% + 14px)`, left: 'auto' }
                                : { left: `calc(${modalXPct}% + 14px)`, right: 'auto' }),
                              ...(isBottomSide
                                ? { bottom: '-8px', top: 'auto' }
                                : { top: '-8px', bottom: 'auto' }),
                            }
                          : undefined
                      }
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between border-b border-hairline pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pulse/10 text-pulse font-bold text-xs">
                            <PhoneIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-sm font-bold text-body">
                                Call {activeCallModal.caller}
                              </h3>
                              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
                                {activeCallModal.callerName}
                              </span>
                              <span
                                className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                  activeCallModal.outcome === 'resolved'
                                    ? 'bg-sage/15 text-sage'
                                    : activeCallModal.outcome === 'triage'
                                      ? 'bg-critical/15 text-critical'
                                      : 'bg-pulse/15 text-pulse'
                                }`}
                              >
                                {activeCallModal.outcome}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted">
                              {activeCallModal.department} · {activeCallModal.durationSec}s · {activeCallModal.confidence}% AI Confidence
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveCallModal(null)
                            setIsPlayingAudio(false)
                          }}
                          className="rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-body transition-colors"
                          aria-label="Close Call Details"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Simulated Audio Player */}
                      <div className="mt-3 rounded-xl border border-hairline bg-ink-teal p-3 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsPlayingAudio((prev) => !prev)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-pulse text-white shadow-md hover:scale-105 transition-transform"
                              aria-label={isPlayingAudio ? 'Pause Audio' : 'Play Audio'}
                            >
                              {isPlayingAudio ? (
                                <span className="font-bold text-xs">❚❚</span>
                              ) : (
                                <span className="font-bold text-xs ml-0.5">▶</span>
                              )}
                            </button>
                            <div>
                              <span className="text-xs font-semibold text-white">
                                {isPlayingAudio ? 'Playing Telephony Audio' : 'Call Audio Recording'}
                              </span>
                              <p className="text-[10px] text-mist/70 font-mono">
                                PBX · G.711u Stereo
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAudioSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
                              className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white hover:bg-white/20 transition-colors"
                            >
                              {audioSpeed}x Speed
                            </button>
                            <span className="font-mono text-xs text-cyan">
                              0:{isPlayingAudio ? '18' : '00'} / 0:{activeCallModal.durationSec}
                            </span>
                          </div>
                        </div>

                        {/* Animated Waveform Simulation */}
                        <div className="mt-2.5 flex items-center gap-0.5 h-5 px-0.5">
                          {[15, 28, 45, 75, 90, 60, 44, 28, 80, 95, 62, 38, 55, 78, 92, 48, 22, 60, 85, 40, 20].map(
                            (val, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 rounded-full transition-all duration-300 ${
                                  isPlayingAudio && idx < 10
                                    ? 'bg-cyan animate-pulse'
                                    : 'bg-white/25'
                                }`}
                                style={{ height: `${val}%` }}
                              />
                            )
                          )}
                        </div>
                      </div>

                      {/* Conversation Dialogue Snippet */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
                          Speech-to-Text Clinical Dialogue
                        </span>
                        <div className="mt-1.5 max-h-32 overflow-y-auto space-y-2 rounded-xl border border-hairline bg-canvas p-2.5">
                          {activeCallModal.transcriptSnippet.map((turn, tIdx) => (
                            <div
                              key={tIdx}
                              className={`flex flex-col text-xs ${
                                turn.speaker === 'AICA' ? 'items-end' : 'items-start'
                              }`}
                            >
                              <span className="text-[9px] font-mono text-faint mb-0.5">
                                {turn.speaker}
                              </span>
                              <div
                                className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-xs ${
                                  turn.speaker === 'AICA'
                                    ? 'bg-pulse text-white rounded-br-none'
                                    : 'bg-surface border border-hairline text-body rounded-bl-none shadow-2xs'
                                }`}
                              >
                                {turn.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Taken & EHR Integration note */}
                      <div className="mt-2.5 rounded-xl border border-hairline bg-surface-hover/70 p-2 text-xs">
                        <span className="font-semibold text-body text-[11px]">HIS Action Recorded:</span>
                        <p className="mt-0.5 text-muted font-mono text-[10px] leading-relaxed">
                          {activeCallModal.ehrAction}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCallModal(null)
                            setIsPlayingAudio(false)
                          }}
                          className="btn-secondary !py-1 !px-2.5 text-xs"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const caller = activeCallModal.caller
                            setActiveCallModal(null)
                            setIsPlayingAudio(false)
                            onNavigate('handled-calls', { search: caller })
                          }}
                          className="btn-primary !py-1 !px-3 text-xs flex items-center gap-1.5"
                        >
                          Open in Handled Calls
                          <ChevronRightIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* X-Axis Ticks & Labels */}
              {[
                { val: 0, label: '0s', pct: 0 },
                { val: 60, label: '60s', pct: 25 },
                { val: 120, label: '120s (2m)', pct: 50 },
                { val: 180, label: '180s (3m)', pct: 75 },
                { val: 240, label: '240s+ (4m)', pct: 100 },
              ].map((tick, idx) => (
                <div
                  key={tick.val}
                  className="absolute top-full flex flex-col pointer-events-none select-none"
                  style={{
                    left: `${tick.pct}%`,
                    transform:
                      idx === 0
                        ? 'translateX(0)'
                        : idx === 4
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                    alignItems:
                      idx === 0
                        ? 'flex-start'
                        : idx === 4
                          ? 'flex-end'
                          : 'center',
                  }}
                >
                  {/* Tick mark line below axis */}
                  <div className="h-1.5 w-px bg-slate-300" />
                  {/* Tick label text safely below the line */}
                  <span className="mt-1 text-[10px] font-mono text-faint whitespace-nowrap">
                    {tick.label}
                  </span>
                </div>
              ))}

              {/* X-Axis Title */}
              <div className="absolute top-[calc(100%+28px)] left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-wider text-muted font-medium whitespace-nowrap pointer-events-none select-none">
                Call Duration (Seconds)
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline flex flex-wrap items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sage" /> Automated (~86%)
              <span className="h-2 w-2 rounded-full bg-pulse ml-2" /> Staff Handoff (~11%)
              <span className="h-2 w-2 rounded-full bg-critical ml-2" /> Trauma Protocol (~3%)
            </span>
            <button
              type="button"
              onClick={() => onNavigate('handled-calls')}
              className="font-medium text-pulse hover:underline flex items-center gap-0.5"
            >
              View in Handled Calls <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Chart 3: Call Latency & Duration Distribution Histogram (5 Cols) */}
        <div className="card p-5 lg:col-span-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-hairline flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                <h2 className="text-base font-semibold text-body">Call Duration Histogram</h2>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                Frequency distribution of total seconds per inbound session. Click a bar to filter.
              </p>
            </div>
            {selectedBin && (
              <button
                type="button"
                onClick={() => setSelectedBin(null)}
                className="text-[11px] font-medium text-pulse hover:underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Histogram Bars */}
          <div className="my-auto pt-6 pb-2">
            <div className="flex items-end gap-2 h-48 px-1">
              {histogramBins.map((bin) => {
                const heightPct = Math.max(12, (bin.count / maxHistoCount) * 100)
                const isHovered = hoveredBin?.label === bin.label
                const isSelected = selectedBin?.label === bin.label

                return (
                  <div
                    key={bin.label}
                    onMouseEnter={() => setHoveredBin(bin)}
                    onMouseLeave={() => setHoveredBin(null)}
                    onClick={() =>
                      setSelectedBin((prev) => (prev?.label === bin.label ? null : bin))
                    }
                    tabIndex={0}
                    role="button"
                    aria-label={`Range ${bin.range}: ${bin.count} calls`}
                    className="group relative flex-1 flex flex-col items-center justify-end cursor-pointer h-full"
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-40 whitespace-nowrap rounded-xl border border-hairline/60 bg-ink-teal/95 px-3 py-2 text-xs text-mist shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
                        <p className="font-semibold text-white">Range: {bin.range}</p>
                        <p className="font-mono text-sm text-pulse font-bold">{bin.count.toLocaleString()} calls</p>
                        <p className="text-[10px] text-slate-300">{bin.pct}% of total corpus</p>
                        <p className="mt-0.5 text-[10px] text-cyan italic">{bin.desc}</p>
                        <p className="mt-1 text-[9px] text-mist/70 font-mono">Typical: {bin.typicalIntents}</p>
                      </div>
                    )}

                    {/* Bar Stack */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-200 ${
                        isSelected
                          ? 'bg-pulse ring-3 ring-pulse ring-offset-2 scale-y-105'
                          : isHovered
                            ? 'bg-pulse shadow-md scale-y-105'
                            : bin.label === '60–90s'
                              ? 'bg-[#1677b8]'
                              : 'bg-[#1677b8]/60 hover:bg-[#1677b8]/80'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />

                    {/* X-axis Label */}
                    <span
                      className={`mt-2 text-[10px] font-mono text-center truncate w-full ${
                        isSelected
                          ? 'font-bold text-pulse underline'
                          : isHovered
                            ? 'font-bold text-pulse'
                            : 'text-muted'
                      }`}
                    >
                      {bin.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interactive Cohort Callout Card (When Bin is Clicked) */}
          {selectedBin ? (
            <div className="rounded-xl border border-pulse/30 bg-pulse/5 p-3 text-xs flex items-center justify-between animate-in fade-in-50">
              <div>
                <span className="font-semibold text-body">
                  Selected Cohort: {selectedBin.label} ({selectedBin.count.toLocaleString()} calls)
                </span>
                <p className="text-[11px] text-muted mt-0.5">{selectedBin.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('handled-calls', { search: selectedBin.label })}
                className="btn-secondary !py-1 !px-2.5 text-[11px] shrink-0 font-medium"
              >
                View in Handled Calls
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-hairline bg-surface-hover/60 p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-muted">Median handling duration:</span>
                <p className="font-display font-bold text-sm text-body">84 seconds</p>
              </div>
              <div className="text-right">
                <span className="text-muted">Calls under 90s:</span>
                <p className="font-mono font-semibold text-xs text-sage">73.9% automated</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart 4: Top Clinical Intents Resolution Matrix */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
              <h2 className="text-base font-semibold text-body">Intent Resolution & Latency Matrix</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Volume and resolution success rates by caller healthcare requirement. Click any row to expand sub-intents.
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Sort by:</span>
            <div className="flex items-center rounded-xl border border-hairline bg-canvas p-0.5">
              {[
                { id: 'volume', label: 'Volume' },
                { id: 'automated', label: 'Automation %' },
                { id: 'aht', label: 'Fastest AHT' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIntentSortBy(s.id as any)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                    intentSortBy === s.id
                      ? 'bg-white text-body font-semibold shadow-2xs'
                      : 'text-muted hover:text-body'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Intent Rows List */}
        <div className="mt-4 flex flex-col divide-y divide-hairline">
          {sortedIntents.map((row) => {
            const isExpanded = expandedIntent === row.intent
            return (
              <div key={row.intent} className="py-2.5">
                <div
                  onClick={() => setExpandedIntent(isExpanded ? null : row.intent)}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-hover/70 px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-body truncate">{row.intent}</p>
                      {row.note && (
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          {row.note}
                        </span>
                      )}
                      <span className="rounded bg-canvas border border-hairline px-1.5 py-0.2 text-[10px] font-mono text-muted">
                        {row.department}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted font-mono">
                      <span>{row.volume.toLocaleString()} calls</span>
                      <span>Avg: {row.ahtSec}s</span>
                      <span className="text-pulse underline font-sans text-[11px]">
                        {isExpanded ? 'Hide sub-intents' : 'View sub-intents →'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & Rate */}
                  <div className="flex items-center gap-3 sm:w-72">
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${row.color}`}
                        style={{ width: `${row.automated}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-xs font-bold text-body">
                      {row.automated}%
                    </span>
                  </div>
                </div>

                {/* Sub-intent Expanded Drawer */}
                {isExpanded && (
                  <div className="mt-2 ml-4 mr-2 rounded-xl border border-hairline bg-canvas p-4 animate-in fade-in-50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-body uppercase tracking-wider">
                          Sub-Query Distribution
                        </h4>
                        <div className="mt-2.5 space-y-2">
                          {row.subIntents.map((sub) => (
                            <div key={sub.name} className="flex items-center justify-between text-xs">
                              <span className="text-body font-medium">{sub.name}</span>
                              <div className="flex items-center gap-2 w-36">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-pulse"
                                    style={{ width: `${sub.pct}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] text-muted w-8 text-right">
                                  {sub.pct}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="sm:w-80 rounded-lg border border-hairline bg-surface p-3 text-xs">
                        <span className="font-semibold text-body">Primary Resolution Workflow:</span>
                        <p className="mt-1 text-muted text-[11px] leading-relaxed">
                          {row.primaryPath}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigate('handled-calls', { search: row.intent.split(' ')[0] })
                          }}
                          className="mt-2 text-pulse font-semibold text-[11px] hover:underline flex items-center gap-1"
                        >
                          Filter Handled Calls for this intent <ChevronRightIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>



    </div>
  )
}

function mostFrequentIntent(entries: { intent: string }[]): string | null {
  if (entries.length === 0) return null
  const counts = new Map<string, number>()
  for (const entry of entries) {
    counts.set(entry.intent, (counts.get(entry.intent) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [intent, count] of counts) {
    if (count > bestCount) {
      best = intent
      bestCount = count
    }
  }
  return best
}
