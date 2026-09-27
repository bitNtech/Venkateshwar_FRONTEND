import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DownloadIcon,
  FilterIcon,
  PhoneIcon,
  SparklesIcon,
  CheckIcon,
  CloseIcon,
  SearchIcon,
  VoiceRecordingIcon,
  AlertTriangleIcon,
} from '../components/icons'
import { Dropdown } from '../components/Dropdown'
import { downloadCsv } from '../lib/exportCsv'
import { callLogSeedToSearchParams, searchParamsToCallLogSeed } from '../lib/routing'
import type { CallLogSeed, CallOutcome, ConfidenceLevel } from '../types'

export interface HandledCallRecord {
  id: string
  rowNum: number
  callerNumber: string
  callerName: string
  patientMrn: string
  doctorName: string
  intent: string
  department: string
  urgency: 'routine' | 'priority' | 'emergency'
  durationSec: number
  timestamp: string
  shift: 'morning' | 'evening' | 'night'
  outcome: CallOutcome | 'triage'
  outcomeLabel: string
  confidence: ConfidenceLevel
  confidenceScore: number
  sentimentScore: number
  hisAction: string
  hisBookingId: string
  audioDurationText: string
  summary: string
  flaggedForReview?: boolean
  transcript: {
    sec: number
    timeDisplay: string
    speaker: 'Caller' | 'AICA'
    text: string
    tag?: string
  }[]
}

const MOCK_HANDLED_CALLS: HandledCallRecord[] = [
  // Calls integrated from Call Log
  {
    id: 'log-2031',
    rowNum: 1,
    callerNumber: '+91 98101 ••148',
    callerName: 'Sunita Mehra',
    patientMrn: 'VH-2024-0148',
    doctorName: 'Dr. K. Rao (Cardio)',
    intent: 'Rescheduling — Rm. 3',
    department: 'Cardiology',
    urgency: 'routine',
    durationSec: 96,
    timestamp: 'Today, 10:45 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 94,
    sentimentScore: 96,
    hisAction: 'Room 3 doctor consultation rescheduled to tomorrow 11:30 AM in HIS scheduler. SMS voucher dispatched.',
    hisBookingId: 'RES-0148',
    audioDurationText: '1:36',
    summary: 'Patient called to reschedule Dr. Rao appointment from morning to afternoon due to metro delay. AICA verified calendar availability and confirmed slot.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Hello, I have an appointment with Dr. Rao in Room 3 today, but I am stuck in traffic. Can I push it to tomorrow?' },
      { sec: 11, timeDisplay: '00:11', speaker: 'AICA', text: 'Certainly, Mrs. Mehra. Dr. Rao has open outpatient slots tomorrow at 11:30 AM or 3:15 PM in OPD Room 3. Would 11:30 AM suit you?', tag: 'Slot Verification' },
      { sec: 24, timeDisplay: '00:24', speaker: 'Caller', text: 'Yes, 11:30 AM tomorrow is perfect.' },
      { sec: 29, timeDisplay: '00:29', speaker: 'AICA', text: 'Your consultation has been moved to tomorrow at 11:30 AM. Updated booking voucher #RES-0148 has been sent via SMS.', tag: 'HIS Rescheduled' },
      { sec: 42, timeDisplay: '00:42', speaker: 'Caller', text: 'Thank you so much for the quick help!' },
    ],
  },
  {
    id: 'log-2030',
    rowNum: 2,
    callerNumber: '+91 98114 ••471',
    callerName: 'Vikram Malhotra',
    patientMrn: 'VH-2024-4471',
    doctorName: 'Nurse Triage Desk',
    intent: 'Clinical question — medication dosage',
    department: 'General Medicine',
    urgency: 'priority',
    durationSec: 52,
    timestamp: 'Today, 10:28 AM',
    shift: 'morning',
    outcome: 'redirected',
    outcomeLabel: 'Redirected to nurse line',
    confidence: 'low',
    confidenceScore: 31,
    sentimentScore: 78,
    hisAction: 'Warm handoff to Cardiology Nurse Station for beta-blocker titration inquiry. Clinical context transferred.',
    hisBookingId: 'NUR-4471',
    audioDurationText: '0:52',
    summary: 'Patient had questions regarding adjusting dose of Metoprolol after feeling dizzy. AICA identified clinical risk protocol and initiated immediate warm nurse transfer.',
    flaggedForReview: true,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'I started my new blood pressure tablet yesterday, and I feel lightheaded. Should I take half a tablet today?' },
      { sec: 12, timeDisplay: '00:12', speaker: 'AICA', text: 'Dosage adjustments require clinical physician authorization. Connecting you immediately to Senior Cardiology Duty Nurse Sister Mini.', tag: 'Clinical Guardrail' },
      { sec: 25, timeDisplay: '00:25', speaker: 'Caller', text: 'Alright, please transfer me.' },
      { sec: 28, timeDisplay: '00:28', speaker: 'AICA', text: 'Transferring now with your EHR file on screen. Please stay on the line.', tag: 'Nurse Handoff' },
    ],
  },
  {
    id: 'log-2029',
    rowNum: 3,
    callerNumber: '+91 98109 ••902',
    callerName: 'Ananya Roy',
    patientMrn: 'VH-2024-9902',
    doctorName: 'Hospital Concierge Desk',
    intent: 'Hours & OPD campus location',
    department: 'OPD',
    urgency: 'routine',
    durationSec: 34,
    timestamp: 'Today, 09:55 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 97,
    sentimentScore: 99,
    hisAction: 'Hospital visiting hours (5pm-7pm) & Block B OPD directions provided via automated voice.',
    hisBookingId: 'DIR-9902',
    audioDurationText: '0:34',
    summary: 'Caller inquired about evening visiting hours and gate parking for patient in 4th floor Deluxe room.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Hi, what are the visitor hours for 4th floor private rooms today?' },
      { sec: 7, timeDisplay: '00:07', speaker: 'AICA', text: 'Inpatient visiting hours are 5:00 PM to 7:00 PM daily. Free valet parking is available at Gate 2 Main Porch.', tag: 'Policy Answer' },
      { sec: 20, timeDisplay: '00:20', speaker: 'Caller', text: 'Thanks, that is all I needed.' },
      { sec: 24, timeDisplay: '00:24', speaker: 'AICA', text: 'You are welcome. Have a pleasant visit.' },
    ],
  },
  {
    id: 'log-2028',
    rowNum: 4,
    callerNumber: '+91 98111 ••187',
    callerName: 'Rajesh Khanna',
    patientMrn: 'VH-2024-1187',
    doctorName: '24/7 Pharmacy Desk',
    intent: 'Prescription refill request',
    department: 'Pharmacy',
    urgency: 'routine',
    durationSec: 61,
    timestamp: 'Today, 09:30 AM',
    shift: 'morning',
    outcome: 'voicemail',
    outcomeLabel: 'Voicemail taken for pharmacy team',
    confidence: 'review',
    confidenceScore: 71,
    sentimentScore: 88,
    hisAction: 'Voicemail recording & audio transcript queued in pharmacy dispensing workflow. Callback ticket dispatched.',
    hisBookingId: 'VM-1187',
    audioDurationText: '1:01',
    summary: 'Caller requested refill for specialized oncology medication. Lines were busy; AICA recorded high-fidelity voice prescription request for callback.',
    flaggedForReview: true,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'I need to check if you have Gefitinib 250mg tablets in stock for refill.' },
      { sec: 11, timeDisplay: '00:11', speaker: 'AICA', text: 'Specialty oncology pharmacy lines are currently on active calls. I am recording your request for the pharmacist to check stock and call you back in 15 minutes.', tag: 'Voicemail Capture' },
      { sec: 28, timeDisplay: '00:28', speaker: 'Caller', text: 'Yes, my name is Rajesh Khanna, mobile 98111 88187. Please call me as soon as possible.' },
      { sec: 40, timeDisplay: '00:40', speaker: 'AICA', text: 'Voice note recorded and dispatched to Duty Pharmacist Mr. Sharma. Ticket #VM-1187 logged.', tag: 'Ticket Dispatched' },
    ],
  },
  {
    id: 'log-2027',
    rowNum: 5,
    callerNumber: '+91 98115 ••561',
    callerName: 'Sanjay Aggarwal',
    patientMrn: 'VH-2024-5561',
    doctorName: 'Billing Liaison Supervisor',
    intent: 'Billing dispute — tariff discrepancy',
    department: 'Billing',
    urgency: 'priority',
    durationSec: 88,
    timestamp: 'Today, 09:05 AM',
    shift: 'morning',
    outcome: 'no_answer_redirect',
    outcomeLabel: 'Redirected — front desk unavailable',
    confidence: 'low',
    confidenceScore: 44,
    sentimentScore: 65,
    hisAction: 'Attempted staff transfer; desk line busy. Automated callback ticket #BIL-5561 generated for Billing Supervisor.',
    hisBookingId: 'BIL-5561',
    audioDurationText: '1:28',
    summary: 'Patient questioned difference between initial surgery estimate and final discharge invoice. Transferred to billing desk; line unanswered after 45s.',
    flaggedForReview: true,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'My discharge bill shows OT consumable charges that were not in the insurance pre-authorization quote.' },
      { sec: 14, timeDisplay: '00:14', speaker: 'AICA', text: 'I understand your concern regarding consumable line items. Transferring you directly to Billing Supervisor Mr. Agarwal.', tag: 'Transfer Initiated' },
      { sec: 45, timeDisplay: '00:45', speaker: 'AICA', text: 'Billing lines are currently busy assisting patients at the counter. I have generated Priority Dispute Ticket #BIL-5561 for an immediate supervisor callback within 30 minutes.', tag: 'Unanswered Handoff' },
      { sec: 68, timeDisplay: '01:08', speaker: 'Caller', text: 'Okay, make sure someone calls me back today.' },
    ],
  },

  // Handled patient calls
  {
    id: 'h-101',
    rowNum: 6,
    callerNumber: '+91 98101 ••821',
    callerName: 'Anita Sharma',
    patientMrn: 'VH-2024-8821',
    doctorName: 'Dr. K. Rao (Cardio)',
    intent: 'OPD Appointment Confirmation',
    department: 'Cardiology',
    urgency: 'routine',
    durationSec: 42,
    timestamp: 'Today, 08:40 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 96,
    sentimentScore: 98,
    hisAction: 'HIS Outpatient slot confirmed in Dr. Rao schedule (OPD-204). SMS voucher sent.',
    hisBookingId: 'CR-8821',
    audioDurationText: '0:42',
    summary: 'Patient confirmed tomorrow morning consultation with Chief Cardiologist Dr. K. Rao at 10:30 AM.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Hello, I want to book Dr. Rao for tomorrow morning.' },
      { sec: 7, timeDisplay: '00:07', speaker: 'AICA', text: 'Good morning. Dr. Rao has open OPD slots tomorrow at 10:30 AM and 11:15 AM in Block A. Which slot would you prefer?', tag: 'Slot Recommendation' },
      { sec: 18, timeDisplay: '00:18', speaker: 'Caller', text: '10:30 AM works best for me.' },
      { sec: 23, timeDisplay: '00:23', speaker: 'AICA', text: 'Slot reserved for 10:30 AM tomorrow. Booking ID #CR-8821 has been dispatched to your mobile via SMS.', tag: 'HIS Confirmation' },
      { sec: 35, timeDisplay: '00:35', speaker: 'Caller', text: 'Thank you very much!' },
      { sec: 38, timeDisplay: '00:38', speaker: 'AICA', text: 'You are welcome. Have a healthy day ahead.' },
    ],
  },
  {
    id: 'h-102',
    rowNum: 7,
    callerNumber: '+91 98112 ••304',
    callerName: 'Ramesh Verma',
    patientMrn: 'VH-2024-3104',
    doctorName: 'Dr. Shalini Verma (Surg)',
    intent: 'Cashless TPA Pre-authorization',
    department: 'Billing',
    urgency: 'routine',
    durationSec: 88,
    timestamp: 'Today, 08:15 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 91,
    sentimentScore: 94,
    hisAction: 'Star Health empanelment validated; digital TPA checklist & e-form link sent.',
    hisBookingId: 'TPA-3104',
    audioDurationText: '1:28',
    summary: 'Caller inquired on Star Health policy coverage for laparoscopic surgery. AICA verified empanelment and sent pre-auth document requirements.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'Is Star Health insurance accepted for cashless laparoscopic surgery at Venkateshwar?' },
      { sec: 12, timeDisplay: '00:12', speaker: 'AICA', text: 'Yes, Star Health is on our empanelled cashless TPA network with 2-4 hours pre-authorization turnaround.', tag: 'Empanelment Verified' },
      { sec: 28, timeDisplay: '00:28', speaker: 'Caller', text: 'What documents do I need to bring to the TPA desk on admission day?' },
      { sec: 36, timeDisplay: '00:36', speaker: 'AICA', text: 'Please bring your policy e-card, government photo ID, doctor clinical advice slip, and initial investigation reports.', tag: 'Checklist Delivered' },
      { sec: 62, timeDisplay: '01:02', speaker: 'Caller', text: 'Can you text me this list?' },
      { sec: 66, timeDisplay: '01:06', speaker: 'AICA', text: 'Sent to your phone right now. You can also upload them in advance via our patient portal.' },
      { sec: 80, timeDisplay: '01:20', speaker: 'Caller', text: 'Great, thanks for the fast answer.' },
    ],
  },
  {
    id: 'h-103',
    rowNum: 8,
    callerNumber: '+91 99103 ••120',
    callerName: 'Sunil Mehta',
    patientMrn: 'VH-2024-9120',
    doctorName: 'Dr. Sunil Mehta (Radiology)',
    intent: '3T MRI Brain Contrast Slot & Fasting',
    department: 'Radiology',
    urgency: 'priority',
    durationSec: 54,
    timestamp: 'Yesterday, 06:12 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 94,
    sentimentScore: 96,
    hisAction: 'RIS Radiology appointment booked for 3T MRI Brain Contrast at 9:30 AM tomorrow. Prep instructions sent.',
    hisBookingId: 'RAD-9120',
    audioDurationText: '0:54',
    summary: 'Booked 3T MRI Brain with contrast for tomorrow morning. Confirmed 4-hour fasting guidelines and creatinine lab prerequisites.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'I need to book an MRI brain with contrast. When is the earliest slot?' },
      { sec: 10, timeDisplay: '00:10', speaker: 'AICA', text: 'Our 3T MRI suite has an opening at 9:30 AM tomorrow. A recent serum creatinine test and 4-hour fasting are required.', tag: 'Clinical Protocol' },
      { sec: 26, timeDisplay: '00:26', speaker: 'Caller', text: 'Yes, I have the creatinine report from yesterday. Please book 9:30 AM.' },
      { sec: 34, timeDisplay: '00:34', speaker: 'AICA', text: 'Slot confirmed for 9:30 AM in Radiology Basement Level 1. Preparation checklist dispatched to WhatsApp.', tag: 'RIS Booking Confirmed' },
      { sec: 48, timeDisplay: '00:48', speaker: 'Caller', text: 'Perfect, thank you.' },
    ],
  },
  {
    id: 'h-104',
    rowNum: 9,
    callerNumber: '+91 98118 ••723',
    callerName: 'Kavita Chawla',
    patientMrn: 'VH-2024-7723',
    doctorName: 'Dr. R. K. Singhal (Emergency)',
    intent: 'Acute Chest Discomfort Emergency',
    department: 'Emergency',
    urgency: 'emergency',
    durationSec: 24,
    timestamp: 'Yesterday, 04:45 PM',
    shift: 'evening',
    outcome: 'triage',
    outcomeLabel: 'Priority Emergency Dispatch',
    confidence: 'high',
    confidenceScore: 99,
    sentimentScore: 90,
    hisAction: 'Instant Red Alert triage handoff to Trauma Bay Duty Officer. Bay 3 prepped.',
    hisBookingId: 'ER-7723',
    audioDurationText: '0:24',
    summary: 'Caller reported acute radiating chest discomfort. AICA triggered zero-wait emergency routing to ER triage within 4 seconds.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Emergency! My father has severe chest pressure and is sweating profusely!' },
      { sec: 8, timeDisplay: '00:08', speaker: 'AICA', text: 'Connecting you immediately to the Emergency Triage Physician. Keep the patient sitting upright and calm. Transferring now.', tag: 'Priority Red Dispatch' },
      { sec: 19, timeDisplay: '00:19', speaker: 'AICA', text: '[Connected to Venkateshwar Emergency Bay 01]' },
    ],
  },
  {
    id: 'h-105',
    rowNum: 10,
    callerNumber: '+91 98184 ••048',
    callerName: 'Priya Iyer',
    patientMrn: 'VH-2024-1048',
    doctorName: 'Dr. Priya Nambiar (Gen Med)',
    intent: 'Thyroid Rx Refill & Home Delivery',
    department: 'Pharmacy',
    urgency: 'routine',
    durationSec: 46,
    timestamp: 'Yesterday, 03:20 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 92,
    sentimentScore: 97,
    hisAction: 'Thyroid Rx verified in HIS; Home Delivery Order #PH-491 dispatched.',
    hisBookingId: 'PH-1048',
    audioDurationText: '0:46',
    summary: 'Patient requested refill of monthly thyroid prescription. AICA verified active prescription on file and scheduled doorstep courier dispatch.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Can I get a refill of my Thyronorm 75mcg delivered to Sector 18 Dwarka?' },
      { sec: 10, timeDisplay: '00:10', speaker: 'AICA', text: 'I see your active prescription from Dr. Nambiar on file. Would you like standard 3-hour doorstep delivery?', tag: 'Rx Verified' },
      { sec: 24, timeDisplay: '00:24', speaker: 'Caller', text: 'Yes, standard delivery to the address on record.' },
      { sec: 29, timeDisplay: '00:29', speaker: 'AICA', text: 'Order #PH-491 logged with Venkateshwar 24/7 Pharmacy. Cashless payment link sent via SMS.', tag: 'Order Dispatched' },
    ],
  },
  {
    id: 'h-106',
    rowNum: 11,
    callerNumber: '+91 98106 ••114',
    callerName: 'Gurpreet Singh',
    patientMrn: 'VH-2024-6114',
    doctorName: 'Hospital Hospitality Desk',
    intent: 'Wheelchair Porter Request at Gate 2',
    department: 'OPD',
    urgency: 'priority',
    durationSec: 34,
    timestamp: 'Yesterday, 01:05 PM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 97,
    sentimentScore: 99,
    hisAction: 'Hospital Hospitality porter #12 dispatched to Gate 2 arrival portico.',
    hisBookingId: 'HOSP-6114',
    audioDurationText: '0:34',
    summary: 'Elderly patient arriving by car in 10 minutes needed wheelchair assist at Main Portico Gate 2.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'We are arriving at Gate 2 in 10 minutes with an 82-year-old patient who cannot walk.' },
      { sec: 11, timeDisplay: '00:11', speaker: 'AICA', text: 'Wheelchair assistance requested. Porter #12 is on standby at Gate 2 Portico. What is your car registration number?', tag: 'Porter Dispatched' },
      { sec: 22, timeDisplay: '00:22', speaker: 'Caller', text: 'Silver Honda City, DL 9C 4421.' },
      { sec: 27, timeDisplay: '00:27', speaker: 'AICA', text: 'Noted for Porter #12. Drive safely.' },
    ],
  },
  {
    id: 'h-107',
    rowNum: 12,
    callerNumber: '+91 99105 ••399',
    callerName: 'Manish Bhatia',
    patientMrn: 'VH-2024-5399',
    doctorName: 'Dr. S. Chadha (Ortho)',
    intent: 'Ortho Knee Replacement Consultation',
    department: 'Orthopedics',
    urgency: 'routine',
    durationSec: 68,
    timestamp: 'Yesterday, 11:40 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 93,
    sentimentScore: 95,
    hisAction: 'OPD appointment booked with Dr. S. Chadha, Joint Replacement Chief.',
    hisBookingId: 'ORT-5399',
    audioDurationText: '1:08',
    summary: 'Booked consultation for second opinion on bilateral knee osteoarthritis with Senior Joint Replacement Surgeon Dr. Chadha.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'Looking to consult Chief Orthopedic Surgeon Dr. Chadha for knee replacement opinion.' },
      { sec: 14, timeDisplay: '00:14', speaker: 'AICA', text: 'Dr. Chadha conducts specialty joint clinics on Tuesdays and Thursdays at 3:00 PM. Would you like this Thursday?', tag: 'Specialist Clinic' },
      { sec: 32, timeDisplay: '00:32', speaker: 'Caller', text: 'Thursday 3:00 PM works. Please carry forward my existing X-rays.' },
      { sec: 40, timeDisplay: '00:40', speaker: 'AICA', text: 'Confirmed for Thursday 3:00 PM in Orthopedic OPD Suite 112. Bring prior radiological imaging for doctor review.', tag: 'HIS Slot Locked' },
    ],
  },
  {
    id: 'h-108',
    rowNum: 13,
    callerNumber: '+91 98113 ••412',
    callerName: 'Vikram Joshi',
    patientMrn: 'VH-2024-4412',
    doctorName: 'Inpatient Billing Desk',
    intent: 'Inpatient Room Tariff Query',
    department: 'Billing',
    urgency: 'priority',
    durationSec: 112,
    timestamp: '2 days ago, 04:15 PM',
    shift: 'evening',
    outcome: 'redirected',
    outcomeLabel: 'Redirected to staff',
    confidence: 'review',
    confidenceScore: 78,
    sentimentScore: 82,
    hisAction: 'Warm handoff to Inpatient Billing Counselor Mr. Sharma with transcribed inquiry.',
    hisBookingId: 'BIL-4412',
    audioDurationText: '1:52',
    summary: 'Caller requested itemized breakdown of Twin Sharing vs Deluxe Private Room packages. AICA provided base rates and transferred for custom package negotiation.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'What is the package difference between Twin Sharing and Single Deluxe for cardiac catheterization?' },
      { sec: 16, timeDisplay: '00:16', speaker: 'AICA', text: 'Twin Sharing base is ₹5,800/day and Single Deluxe is ₹9,500/day, including standard nursing. For comprehensive package quotes with consumables, connecting you to Inpatient Billing Desk.', tag: 'Tariff Quoted' },
      { sec: 45, timeDisplay: '00:45', speaker: 'Caller', text: 'Yes, please connect me.' },
      { sec: 50, timeDisplay: '00:50', speaker: 'AICA', text: 'Connecting you now to Senior Counselor Mr. Sharma. Your inquiry notes have been transferred.', tag: 'Warm Transfer' },
    ],
  },
  {
    id: 'h-109',
    rowNum: 14,
    callerNumber: '+91 98109 ••219',
    callerName: 'Neha Gupta',
    patientMrn: 'VH-2024-2219',
    doctorName: 'Dr. Alok Bansal (Pediatrics)',
    intent: 'Pediatric 6-in-1 Hexaxim Vaccine',
    department: 'OPD',
    urgency: 'routine',
    durationSec: 44,
    timestamp: '2 days ago, 02:30 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 95,
    sentimentScore: 98,
    hisAction: 'Pediatric vaccination desk informed for 4:00 PM walk-in administration.',
    hisBookingId: 'PED-2219',
    audioDurationText: '0:44',
    summary: 'Confirmed cold-chain availability of pediatric 6-in-1 combination vaccine. Booked token #14 for Dr. Bansal clinic.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Do you have the Hexaxim 6-in-1 vaccine available in Pediatrics today?' },
      { sec: 8, timeDisplay: '00:08', speaker: 'AICA', text: 'Yes, certified cold-chain stocks of Hexaxim are in stock until 7:00 PM today in Pediatric OPD Block B.' },
      { sec: 20, timeDisplay: '00:20', speaker: 'Caller', text: 'Can we walk in around 4:00 PM?' },
      { sec: 24, timeDisplay: '00:24', speaker: 'AICA', text: 'Walk-in token #14 reserved with Dr. Alok Bansal for 4:00 PM. Please bring the child vaccination yellow card.' },
    ],
  },
  {
    id: 'h-110',
    rowNum: 15,
    callerNumber: '+91 98114 ••902',
    callerName: 'Deepak Roy',
    patientMrn: 'VH-2024-4192',
    doctorName: 'ICU Nursing Supervisor',
    intent: 'ICU Evening Visiting Pass Policy',
    department: 'Cardiology',
    urgency: 'routine',
    durationSec: 32,
    timestamp: '2 days ago, 11:20 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 97,
    sentimentScore: 95,
    hisAction: 'ICU pass policy guidance provided; Visitor e-pass QR code delivered.',
    hisBookingId: 'ICU-4192',
    audioDurationText: '0:32',
    summary: 'Patient attendant requested visiting hours and pass limits for Coronary ICU Floor 3.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'What time are evening visitors allowed in the 3rd floor Cardiac ICU?' },
      { sec: 8, timeDisplay: '00:08', speaker: 'AICA', text: 'Evening visiting hours for Cardiac ICU are 5:00 PM to 6:30 PM. One attendant is permitted at a time.' },
      { sec: 22, timeDisplay: '00:22', speaker: 'Caller', text: 'Can I get the security entry QR on my phone?' },
      { sec: 26, timeDisplay: '00:26', speaker: 'AICA', text: 'Visitor QR pass sent to your WhatsApp. Please scan at the Level 3 security checkpoint.' },
    ],
  },
  {
    id: 'h-111',
    rowNum: 16,
    callerNumber: '+91 98117 ••834',
    callerName: 'Manoj Tiwari',
    patientMrn: 'VH-2024-7834',
    doctorName: 'Medical Records Dept (MRD)',
    intent: 'Discharge Summary & Stamped Invoice',
    department: 'Billing',
    urgency: 'routine',
    durationSec: 74,
    timestamp: '3 days ago, 04:50 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 93,
    sentimentScore: 96,
    hisAction: 'Certified stamped discharge invoice dispatched to verified patient email.',
    hisBookingId: 'MRD-7834',
    audioDurationText: '1:14',
    summary: 'Caller needed itemized stamped invoice for Max Bupa post-hospitalization reimbursement claim. AICA generated stamped PDF securely.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'I need an official stamped copy of my mother discharge bill for insurance reimbursement.' },
      { sec: 12, timeDisplay: '00:12', speaker: 'AICA', text: 'I have located the verified discharge records for Mrs. Kanti Tiwari. Stamped digital statement has been emailed to your registered email.' },
      { sec: 40, timeDisplay: '00:40', speaker: 'Caller', text: 'Received the email! That saved me a trip to Dwarka.' },
      { sec: 45, timeDisplay: '00:45', speaker: 'AICA', text: 'Glad to assist. Wishing your mother a swift recovery.' },
    ],
  },
  {
    id: 'h-112',
    rowNum: 17,
    callerNumber: '+91 99101 ••590',
    callerName: 'Devendra Pal',
    patientMrn: 'VH-2024-5590',
    doctorName: 'Dr. R. K. Singhal (Emergency)',
    intent: 'Dwarka Expressway Trauma Inbound',
    department: 'Emergency',
    urgency: 'emergency',
    durationSec: 18,
    timestamp: '3 days ago, 01:10 PM',
    shift: 'morning',
    outcome: 'triage',
    outcomeLabel: 'Priority Emergency Dispatch',
    confidence: 'high',
    confidenceScore: 99,
    sentimentScore: 91,
    hisAction: 'Code Red Trauma Team Alpha pre-activated; Bay 02 resuscitation team assembled.',
    hisBookingId: 'TR-5590',
    audioDurationText: '0:18',
    summary: 'Inbound ambulance paramedic notified of multiple trauma victims incoming in 6 minutes. AICA pre-activated emergency bay.',
    flaggedForReview: false,
    transcript: [
      { sec: 1, timeDisplay: '00:01', speaker: 'Caller', text: 'Ambulance 108 arriving in 5 minutes with a road accident trauma victim!' },
      { sec: 6, timeDisplay: '00:06', speaker: 'AICA', text: 'Connecting directly to Trauma Bay 02 phone. Trauma surgeons notified. Ramp doors opening.' },
      { sec: 14, timeDisplay: '00:14', speaker: 'AICA', text: '[Connected to Trauma Bay Lead Doctor]' },
    ],
  },
  {
    id: 'h-113',
    rowNum: 18,
    callerNumber: '+91 98103 ••312',
    callerName: 'Gaurav Kapoor',
    patientMrn: 'VH-2024-3312',
    doctorName: 'Dr. Rajiv Passey (Nephro)',
    intent: 'Hemodialysis Unit Slot Confirmation',
    department: 'Nephrology',
    urgency: 'routine',
    durationSec: 48,
    timestamp: '3 days ago, 11:20 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 95,
    sentimentScore: 96,
    hisAction: 'Bed 4 Hemodialysis unit scheduled for Thursday 8:00 AM.',
    hisBookingId: 'DIA-3312',
    audioDurationText: '0:48',
    summary: 'Patient verified recurring dialysis slot for Thursday morning. AICA confirmed technician availability.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'Hi, confirming if my dialysis machine is booked for Thursday morning.' },
      { sec: 8, timeDisplay: '00:08', speaker: 'AICA', text: 'Yes, Mr. Kapoor. Dialysis Unit Bed 04 is confirmed for Thursday at 8:00 AM under Dr. Passey.', tag: 'Unit Confirmed' },
      { sec: 20, timeDisplay: '00:20', speaker: 'Caller', text: 'Thank you, see you Thursday.' },
    ],
  },
  {
    id: 'h-114',
    rowNum: 19,
    callerNumber: '+91 98119 ••884',
    callerName: 'Neelam Batra',
    patientMrn: 'VH-2024-8884',
    doctorName: 'Dr. Neha Kapoor (Pediatrics)',
    intent: 'MMR & Typhoid Child Vaccine',
    department: 'Pediatrics',
    urgency: 'routine',
    durationSec: 55,
    timestamp: '3 days ago, 09:40 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 98,
    sentimentScore: 99,
    hisAction: 'Pediatric vaccination token #PED-8884 issued with Cold Chain verification.',
    hisBookingId: 'PED-8884',
    audioDurationText: '0:55',
    summary: 'Mother called to schedule 15-month vaccination for her infant. AICA booked pediatric OPD slot.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'I need to book the 15-month MMR booster shot for my son with Dr. Neha.' },
      { sec: 9, timeDisplay: '00:09', speaker: 'AICA', text: 'Dr. Neha Kapoor is available tomorrow between 10 AM and 1 PM in Pediatric OPD Room 12.', tag: 'Vaccine Slot' },
      { sec: 22, timeDisplay: '00:22', speaker: 'Caller', text: 'Please book at 11 AM.' },
      { sec: 26, timeDisplay: '00:26', speaker: 'AICA', text: 'Booked. Token #PED-8884 sent via SMS with cold chain vaccine guidelines.', tag: 'Token Issued' },
    ],
  },
  {
    id: 'h-115',
    rowNum: 20,
    callerNumber: '+91 98108 ••671',
    callerName: 'Kishore Chandra',
    patientMrn: 'VH-2024-6671',
    doctorName: 'Dr. I. P. Arora (Ortho)',
    intent: 'Knee Replacement Post-Op Dressing',
    department: 'Orthopedics',
    urgency: 'priority',
    durationSec: 64,
    timestamp: '4 days ago, 04:15 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 92,
    sentimentScore: 94,
    hisAction: 'Ortho OPD Room 6 priority follow-up token confirmed.',
    hisBookingId: 'ORT-6671',
    audioDurationText: '1:04',
    summary: 'Post-op knee arthroplasty patient scheduled staple removal and wound dressing check.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'My father had knee replacement 10 days ago, Dr. Arora asked us to come for stitch removal.' },
      { sec: 11, timeDisplay: '00:11', speaker: 'AICA', text: 'Dr. Arora is running joint replacement follow-ups on Friday 4:00 PM. Token #ORT-6671 has been reserved.', tag: 'Post-Op Follow-up' },
      { sec: 25, timeDisplay: '00:25', speaker: 'Caller', text: 'We will be there at 4 PM. Thank you.' },
    ],
  },
  {
    id: 'h-116',
    rowNum: 21,
    callerNumber: '+91 98115 ••290',
    callerName: 'Meenakshi Sundaram',
    patientMrn: 'VH-2024-2290',
    doctorName: 'Dr. S. K. Gupta (Oncology)',
    intent: 'PET-CT Scan Prep Guidelines',
    department: 'Oncology',
    urgency: 'priority',
    durationSec: 82,
    timestamp: '4 days ago, 02:30 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 96,
    sentimentScore: 98,
    hisAction: 'Nuclear Medicine PET-CT fasting instructions dispatched via SMS and WhatsApp.',
    hisBookingId: 'PET-2290',
    audioDurationText: '1:22',
    summary: 'Patient called for 6-hour fasting and hydration instructions prior to morning whole-body PET-CT scan.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'I have a whole body PET-CT scheduled for tomorrow. What are the food instructions?' },
      { sec: 10, timeDisplay: '00:10', speaker: 'AICA', text: 'Strict 6-hour fasting with no carbohydrates or sugar is required. Only plain water is permitted. Avoid heavy exercise today.', tag: 'Clinical Protocol' },
      { sec: 28, timeDisplay: '00:28', speaker: 'Caller', text: 'Can I take my morning blood pressure pill?' },
      { sec: 33, timeDisplay: '00:33', speaker: 'AICA', text: 'Yes, with a sip of plain water. Diabetic medications should be withheld until after the scan.', tag: 'Medication Guidance' },
    ],
  },
  {
    id: 'h-117',
    rowNum: 22,
    callerNumber: '+91 98102 ••445',
    callerName: 'Tariq Ahmed',
    patientMrn: 'VH-2024-4445',
    doctorName: 'Dr. Anjali Mehta (Radiology)',
    intent: 'MRI Brain with Contrast Screening',
    department: 'Radiology',
    urgency: 'routine',
    durationSec: 70,
    timestamp: '4 days ago, 11:15 AM',
    shift: 'morning',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 93,
    sentimentScore: 95,
    hisAction: 'Creatinine eGFR level 1.0 verified; 3T MRI Brain slot locked.',
    hisBookingId: 'MRI-4445',
    audioDurationText: '1:10',
    summary: 'Patient verified serum creatinine report on file before contrast MRI appointment.',
    flaggedForReview: false,
    transcript: [
      { sec: 2, timeDisplay: '00:02', speaker: 'Caller', text: 'I submitted my blood test for kidney function. Is it approved for the contrast MRI?' },
      { sec: 10, timeDisplay: '00:10', speaker: 'AICA', text: 'Yes, Mr. Ahmed. Your serum creatinine is 1.0 mg/dL, which is within the safe range for IV contrast. Slot locked for 11:30 AM.', tag: 'eGFR Verified' },
      { sec: 25, timeDisplay: '00:25', speaker: 'Caller', text: 'Excellent, coming now.' },
    ],
  },
  {
    id: 'h-118',
    rowNum: 23,
    callerNumber: '+91 98110 ••923',
    callerName: 'Shweta Bhardwaj',
    patientMrn: 'VH-2024-0923',
    doctorName: 'Dr. Manisha Ranjan (Gynae)',
    intent: 'Maternity Delivery Package Inquiry',
    department: 'Obstetrics & Gynaecology',
    urgency: 'routine',
    durationSec: 95,
    timestamp: '5 days ago, 05:40 PM',
    shift: 'evening',
    outcome: 'resolved',
    outcomeLabel: 'Resolved by AICA',
    confidence: 'high',
    confidenceScore: 97,
    sentimentScore: 99,
    hisAction: 'Venkateshwar Cradle Normal & C-Section package brochure sent to patient mobile.',
    hisBookingId: 'MAT-0923',
    audioDurationText: '1:35',
    summary: 'Caller inquired about LDR suite delivery packages, cashless TPA tie-ups, and pediatric neonatologist coverage.',
    flaggedForReview: false,
    transcript: [
      { sec: 3, timeDisplay: '00:03', speaker: 'Caller', text: 'Hello, could you share the package details for delivery in Venkateshwar Cradle?' },
      { sec: 11, timeDisplay: '00:11', speaker: 'AICA', text: 'Venkateshwar Cradle offers Normal and Cesarean delivery packages with LDR suites, 24/7 NICU standby, and cashless coverage with all major insurers.', tag: 'Maternity Package' },
      { sec: 30, timeDisplay: '00:30', speaker: 'Caller', text: 'Can you send the room tariff brochure on WhatsApp?' },
      { sec: 35, timeDisplay: '00:35', speaker: 'AICA', text: 'Comprehensive brochure sent to this number. Our maternity concierge will assist you on OPD visit.', tag: 'Brochure Sent' },
    ],
  },
  {
    id: 'h-119',
    rowNum: 24,
    callerNumber: '+91 99112 ••109',
    callerName: 'Gurpreet Singh',
    patientMrn: 'VH-2024-2109',
    doctorName: 'Emergency Control Room',
    intent: 'Acute Breathing Distress Ambulance',
    department: 'Emergency',
    urgency: 'emergency',
    durationSec: 26,
    timestamp: '5 days ago, 08:05 AM',
    shift: 'morning',
    outcome: 'triage',
    outcomeLabel: 'Priority Emergency Dispatch',
    confidence: 'high',
    confidenceScore: 99,
    sentimentScore: 92,
    hisAction: 'Advanced Cardiac Life Support (ACLS) Ambulance #04 dispatched to Janakpuri.',
    hisBookingId: 'AMB-2109',
    audioDurationText: '0:26',
    summary: 'Caller reported elderly COPD patient with severe hypoxia. AICA dispatched GPS-tracked ventilator ambulance in 12 seconds.',
    flaggedForReview: false,
    transcript: [
      { sec: 1, timeDisplay: '00:01', speaker: 'Caller', text: 'Ambulance needed immediately! Patient cannot breathe and oxygen level is dropping!' },
      { sec: 6, timeDisplay: '00:06', speaker: 'AICA', text: 'ACLS Ambulance 04 dispatched with portable ventilator to your location. Keep caller on speaker with Emergency Physician Dr. Singhal.', tag: 'ACLS Dispatched' },
      { sec: 18, timeDisplay: '00:18', speaker: 'AICA', text: '[Emergency Doctor Connected]' },
    ],
  },
]

type SortField = 'rowNum' | 'timestamp' | 'callerName' | 'department' | 'doctorName' | 'durationSec' | 'outcome' | 'confidenceScore'

export function HandledCallsPage({
  onNavigate,
}: {
  onNavigate: (id: string, filter?: CallLogSeed) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const seed = searchParamsToCallLogSeed(searchParams)

  // Call Records State
  const [entries, setEntries] = useState<HandledCallRecord[]>(MOCK_HANDLED_CALLS)

  // Spreadsheet Filters initialized from URL seed or defaults
  const [search, setSearchState] = useState(seed.search ?? '')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedDoctor, setSelectedDoctor] = useState('all')
  const [selectedOutcome, setSelectedOutcomeState] = useState(seed.outcome ?? 'all')
  const [selectedConfidence, setSelectedConfidenceState] = useState<string>(seed.confidence ?? 'all')
  const [selectedShift, setSelectedShift] = useState('all')
  const [selectedUrgency, setSelectedUrgency] = useState('all')
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('rowNum')
  const [sortAsc, setSortAsc] = useState(true)

  // Drawer & Audio Playback State
  const [selectedCall, setSelectedCall] = useState<HandledCallRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [copiedTranscript, setCopiedTranscript] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep URL in sync
  const setSearch = (val: string) => {
    setSearchState(val)
    setSearchParams(
      callLogSeedToSearchParams({
        search: val || undefined,
        outcome: selectedOutcome === 'all' ? undefined : (selectedOutcome as any),
        confidence: selectedConfidence === 'all' ? undefined : (selectedConfidence as any),
      }),
      { replace: true }
    )
  }

  const setSelectedOutcome = (val: string) => {
    setSelectedOutcomeState(val)
    setSearchParams(
      callLogSeedToSearchParams({
        search: search || undefined,
        outcome: val === 'all' ? undefined : (val as any),
        confidence: selectedConfidence === 'all' ? undefined : (selectedConfidence as any),
      }),
      { replace: true }
    )
  }

  const setSelectedConfidence = (val: string) => {
    setSelectedConfidenceState(val)
    setSearchParams(
      callLogSeedToSearchParams({
        search: search || undefined,
        outcome: selectedOutcome === 'all' ? undefined : (selectedOutcome as any),
        confidence: val === 'all' ? undefined : (val as any),
      }),
      { replace: true }
    )
  }

  // Synchronize when navigating with URL parameters (e.g. from Dashboard drill-downs)
  useEffect(() => {
    const s = searchParamsToCallLogSeed(searchParams)
    if (s.search !== undefined) setSearchState(s.search)
    if (s.outcome !== undefined) setSelectedOutcomeState(s.outcome)
    if (s.confidence !== undefined) setSelectedConfidenceState(s.confidence)
  }, [searchParams])

  // Filtered and sorted dataset
  const filteredCalls = useMemo(() => {
    let list = entries.filter((call) => {
      const matchDept = selectedDept === 'all' || call.department.toLowerCase() === selectedDept.toLowerCase()
      const matchDoctor = selectedDoctor === 'all' || call.doctorName.toLowerCase().includes(selectedDoctor.toLowerCase())
      const matchOutcome = selectedOutcome === 'all' || call.outcome === selectedOutcome
      const matchConfidence = selectedConfidence === 'all' || call.confidence === selectedConfidence
      const matchShift = selectedShift === 'all' || call.shift === selectedShift
      const matchUrgency = selectedUrgency === 'all' || call.urgency === selectedUrgency
      const matchFlagged = !onlyFlagged || call.flaggedForReview
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        call.callerName.toLowerCase().includes(q) ||
        call.callerNumber.includes(q) ||
        call.intent.toLowerCase().includes(q) ||
        call.patientMrn.toLowerCase().includes(q) ||
        call.doctorName.toLowerCase().includes(q) ||
        call.hisBookingId.toLowerCase().includes(q) ||
        call.transcript.some((t) => t.text.toLowerCase().includes(q))
      return matchDept && matchDoctor && matchOutcome && matchConfidence && matchShift && matchUrgency && matchFlagged && matchSearch
    })

    list.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (typeof aVal === 'string') {
        return sortAsc
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string)
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return list
  }, [entries, selectedDept, selectedDoctor, selectedOutcome, selectedConfidence, selectedShift, selectedUrgency, onlyFlagged, search, sortField, sortAsc])

  // Sheet Pagination State (10 records per sheet)
  const PAGE_SIZE = 10
  const [activeSheet, setActiveSheet] = useState<number>(1)

  // Reset to Sheet 1 whenever filters or search change
  useEffect(() => {
    setActiveSheet(1)
  }, [search, selectedDept, selectedDoctor, selectedOutcome, selectedConfidence, selectedShift, selectedUrgency, onlyFlagged])

  const totalSheets = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE))
  const safeSheet = Math.min(Math.max(1, activeSheet), totalSheets)
  const startIndex = (safeSheet - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredCalls.length)
  const currentSheetCalls = filteredCalls.slice(startIndex, startIndex + PAGE_SIZE)

  // Audio playback simulator timer
  useEffect(() => {
    if (!isPlayingAudio || !selectedCall) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const maxSec = selectedCall.durationSec

    timerRef.current = setInterval(() => {
      setCurrentTimeSec((prev) => {
        if (prev >= maxSec) {
          setIsPlayingAudio(false)
          return 0
        }
        return prev + 1
      })
    }, 1000 / playbackSpeed)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlayingAudio, playbackSpeed, selectedCall])

  // Escape key handler to close slide-over drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false)
        setIsPlayingAudio(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  const handleOpenCall = (call: HandledCallRecord, autoPlay: boolean = false) => {
    setSelectedCall(call)
    setIsDrawerOpen(true)
    setCurrentTimeSec(0)
    setIsPlayingAudio(autoPlay)

    // Synchronize active sheet if opened patient is on a different sheet
    const callIdx = filteredCalls.findIndex((c) => c.id === call.id)
    if (callIdx >= 0) {
      const targetSheet = Math.floor(callIdx / PAGE_SIZE) + 1
      if (targetSheet !== activeSheet) {
        setActiveSheet(targetSheet)
      }
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setIsPlayingAudio(false)
  }

  // Next / Previous patient navigation inside drawer
  const currentIndex = useMemo(() => {
    if (!selectedCall) return -1
    return filteredCalls.findIndex((c) => c.id === selectedCall.id)
  }, [selectedCall, filteredCalls])

  const handlePrevPatient = () => {
    if (currentIndex > 0) {
      handleOpenCall(filteredCalls[currentIndex - 1], false)
    }
  }

  const handleNextPatient = () => {
    if (currentIndex >= 0 && currentIndex < filteredCalls.length - 1) {
      handleOpenCall(filteredCalls[currentIndex + 1], false)
    }
  }

  const handleToggleFlagReview = (callId: string) => {
    setEntries((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, flaggedForReview: !c.flaggedForReview } : c))
    )
    if (selectedCall?.id === callId) {
      setSelectedCall((prev) => (prev ? { ...prev, flaggedForReview: !prev.flaggedForReview } : null))
    }
    setToastMessage('Call review flag updated.')
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const handleExportCsv = () => {
    const columns = [
      'Row #',
      'Timestamp',
      'Caller Name',
      'Phone Number',
      'UHID/MRN',
      'Department',
      'Attending Doctor',
      'Inquiry Intent',
      'Outcome',
      'Confidence',
      'Confidence %',
      'Duration (s)',
      'HIS Booking ID',
      'HIS Recorded Action',
      'Flagged for Review',
    ]
    const rows = filteredCalls.map((c) => [
      c.rowNum,
      c.timestamp,
      c.callerName,
      c.callerNumber,
      c.patientMrn,
      c.department,
      c.doctorName,
      c.intent,
      c.outcomeLabel,
      c.confidence,
      `${c.confidenceScore}%`,
      c.durationSec,
      c.hisBookingId,
      c.hisAction,
      c.flaggedForReview ? 'YES' : 'NO',
    ])
    downloadCsv(`aica_clinical_telephony_ledger_${new Date().toISOString().slice(0, 10)}.csv`, columns, rows)
    setToastMessage(`Exported ${rows.length} patient records to Excel Spreadsheet (.csv)`)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleCopyTranscript = () => {
    if (!selectedCall) return
    const text = selectedCall.transcript
      .map((t) => `[${t.timeDisplay}] ${t.speaker}: ${t.text}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopiedTranscript(true)
    setToastMessage('Conversation transcript copied to clipboard!')
    setTimeout(() => {
      setCopiedTranscript(false)
      setToastMessage(null)
    }, 3000)
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-ink-teal px-4 py-3 text-xs text-white shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-3">
          <CheckIcon className="h-4 w-4 text-sage" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-mist/60 hover:text-white"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Excel Sheet Header & Command Strip */}
      <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
                <VoiceRecordingIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold text-body">
                    AICA Handled Calls & Unified Telephony Ledger
                  </h1>
                  <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    EXCEL SHEET FORMAT
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Complete repository of inbound patient calls with full recordings, transcripts, HIS bookings, and clinical outcomes.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <DownloadIcon className="h-3.5 w-3.5 text-emerald-700" />
              Export to Excel (.xlsx / .csv)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="rounded-xl border border-hairline bg-canvas px-3 py-1.5 text-xs font-semibold text-muted hover:text-body transition-colors cursor-pointer"
            >
              Dashboard Overview →
            </button>
          </div>
        </div>

        {/* Excel Metric Summary Strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-xs">
          <div className="rounded-xl border border-hairline bg-canvas p-2.5 flex items-center justify-between">
            <span className="text-muted">Total Handled:</span>
            <span className="font-mono font-bold text-body">4,604 calls</span>
          </div>
          <div className="rounded-xl border border-hairline bg-canvas p-2.5 flex items-center justify-between">
            <span className="text-muted">Filtered In View:</span>
            <span className="font-mono font-bold text-pulse">{filteredCalls.length} rows</span>
          </div>
          <div className="rounded-xl border border-hairline bg-canvas p-2.5 flex items-center justify-between">
            <span className="text-muted">Auto-Resolved:</span>
            <span className="font-mono font-bold text-sage">86.5% FCR</span>
          </div>
          <div className="rounded-xl border border-hairline bg-canvas p-2.5 flex items-center justify-between">
            <span className="text-muted">Avg Handling:</span>
            <span className="font-mono font-bold text-body">52s AHT</span>
          </div>
          <div className="rounded-xl border border-hairline bg-canvas p-2.5 flex items-center justify-between col-span-2 sm:col-span-1">
            <span className="text-muted">Flagged for Review:</span>
            <span className="font-mono font-bold text-amber">
              {entries.filter((c) => c.flaggedForReview).length} calls
            </span>
          </div>
        </div>

        {/* Hospital-Grade Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input (Spreadsheet Formula Bar / Find) */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, phone, UHID, doctor, booking #…"
                className="input w-full pl-8 py-1.5 text-xs"
              />
            </div>

            {/* Department Filter Dropdown */}
            <Dropdown
              value={selectedDept}
              onChange={setSelectedDept}
              icon={<FilterIcon className="h-3.5 w-3.5" />}
              size="sm"
              variant="compact"
              options={[
                { value: 'all', label: 'All Departments', dotColor: '#1677b8' },
                { value: 'cardiology', label: 'Cardiology', dotColor: '#dc2626' },
                { value: 'radiology', label: 'Radiology & Imaging', dotColor: '#8b5cf6' },
                { value: 'billing', label: 'Cashless TPA & Billing', dotColor: '#f59e0b' },
                { value: 'emergency', label: 'Emergency & Triage', dotColor: '#e11d48' },
                { value: 'pharmacy', label: '24/7 Pharmacy', dotColor: '#10b981' },
                { value: 'orthopedics', label: 'Orthopedics', dotColor: '#3b82f6' },
                { value: 'opd', label: 'OPD Clinics', dotColor: '#075a91' },
                { value: 'general medicine', label: 'General Medicine', dotColor: '#0d9488' },
              ]}
            />

            {/* Doctor / Specialist Dropdown */}
            <Dropdown
              value={selectedDoctor}
              onChange={setSelectedDoctor}
              size="sm"
              variant="compact"
              options={[
                { value: 'all', label: 'All Attending Doctors' },
                { value: 'Rao', label: 'Dr. K. Rao (Cardiology)' },
                { value: 'Chadha', label: 'Dr. S. Chadha (Orthopedics)' },
                { value: 'Sunil', label: 'Dr. Sunil Mehta (Radiology)' },
                { value: 'Bansal', label: 'Dr. Alok Bansal (Pediatrics)' },
                { value: 'Nambiar', label: 'Dr. Priya Nambiar (Gen Med)' },
                { value: 'Singhal', label: 'Dr. R. K. Singhal (Emergency)' },
                { value: 'Verma', label: 'Dr. Shalini Verma (Surgery)' },
                { value: 'Nurse', label: 'Nurse Triage Station' },
                { value: 'Pharmacy', label: 'Pharmacy Duty Desk' },
                { value: 'Billing', label: 'Billing Supervisor' },
              ]}
            />

            {/* Resolution Outcome Dropdown (Supports all outcomes from call log) */}
            <Dropdown
              value={selectedOutcome}
              onChange={setSelectedOutcome}
              size="sm"
              variant="compact"
              options={[
                { value: 'all', label: 'All Resolution Outcomes' },
                { value: 'resolved', label: 'Resolved by AICA', dotColor: '#1e9e67' },
                { value: 'redirected', label: 'Redirected to staff', dotColor: '#1677b8' },
                { value: 'voicemail', label: 'Voicemail taken', dotColor: '#42b9d5' },
                { value: 'no_answer_redirect', label: 'Redirected — no answer', dotColor: '#d9383a' },
                { value: 'triage', label: 'Priority Emergency Dispatch', dotColor: '#e11d48' },
              ]}
            />

            {/* Confidence Filter Dropdown */}
            <Dropdown
              value={selectedConfidence}
              onChange={setSelectedConfidence}
              size="sm"
              variant="compact"
              options={[
                { value: 'all', label: 'All Confidence' },
                { value: 'high', label: 'High Confidence (90%+)', dotColor: '#1e9e67' },
                { value: 'review', label: 'Review Tier (60-89%)', dotColor: '#f59e0b' },
                { value: 'low', label: 'Low Confidence (<60%)', dotColor: '#d9383a' },
              ]}
            />

            {/* Quick Flagged Review Toggle */}
            <button
              type="button"
              onClick={() => setOnlyFlagged((prev) => !prev)}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                onlyFlagged
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-canvas text-muted border-hairline hover:text-body'
              }`}
            >
              <AlertTriangleIcon className="h-3 w-3 text-amber" />
              <span>Flagged ({entries.filter((c) => c.flaggedForReview).length})</span>
            </button>
          </div>

          {(search || selectedDept !== 'all' || selectedDoctor !== 'all' || selectedOutcome !== 'all' || selectedConfidence !== 'all' || selectedShift !== 'all' || selectedUrgency !== 'all' || onlyFlagged) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedDept('all')
                setSelectedDoctor('all')
                setSelectedOutcome('all')
                setSelectedConfidence('all')
                setSelectedShift('all')
                setSelectedUrgency('all')
                setOnlyFlagged(false)
              }}
              className="text-xs text-pulse hover:underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* FULL-WIDTH EXCEL SHEET SPREADSHEET TABLE GRID (NO HORIZONTAL SCROLL) */}
      <div className="w-full flex flex-col rounded-2xl border border-hairline bg-surface shadow-xs overflow-hidden">
        {/* Spreadsheet Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-hairline text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-800">Clinical_Telephony_Master_Ledger.xlsx</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 font-mono text-[11px]">
              Showing {filteredCalls.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredCalls.length} records (10 per range)
            </span>
          </div>

          {/* Quick range switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rows:</span>
            <div className="inline-flex rounded-lg bg-slate-200/90 p-0.5 border border-slate-300 shadow-2xs">
              {Array.from({ length: totalSheets }, (_, i) => i + 1).map((sNum) => (
                <button
                  key={sNum}
                  type="button"
                  onClick={() => setActiveSheet(sNum)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    safeSheet === sNum
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                  }`}
                >
                  {(sNum - 1) * PAGE_SIZE + 1}–{Math.min(sNum * PAGE_SIZE, filteredCalls.length)}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted italic ml-2 hidden lg:inline">Click any patient or row to open recording →</span>
          </div>
        </div>

        {/* Table Container without Horizontal Scroll */}
        <div className="w-full max-h-[740px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs table-auto">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-300 select-none shadow-2xs">
              <tr>
                <th
                  onClick={() => handleSort('rowNum')}
                  className="py-2.5 px-2.5 w-10 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  #
                </th>
                <th
                  onClick={() => handleSort('callerName')}
                  className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  Patient Name {sortField === 'callerName' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('timestamp')}
                  className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  Date / Time {sortField === 'timestamp' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Phone & MRN
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  Department {sortField === 'department' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('doctorName')}
                  className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  Doctor {sortField === 'doctorName' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Clinical Inquiry
                </th>
                <th
                  onClick={() => handleSort('outcome')}
                  className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  Status {sortField === 'outcome' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('durationSec')}
                  className="py-2.5 px-2.5 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200"
                >
                  Duration {sortField === 'durationSec' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200">
                  Token
                </th>
                <th className="py-2.5 px-3 text-center">
                  Audio & Transcript
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted">
                    No patient call records match the active Excel spreadsheet filters.
                  </td>
                </tr>
              ) : (
                currentSheetCalls.map((call) => {
                  const isSelected = selectedCall?.id === call.id && isDrawerOpen

                  return (
                    <tr
                      key={call.id}
                      onClick={() => handleOpenCall(call, false)}
                      className={`transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-50/90 font-medium'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200 bg-slate-50/50">
                        {call.rowNum}
                      </td>

                      {/* Patient Name (Clickable link highlighted) */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-pulse hover:underline">
                        <div className="flex items-center gap-1.5">
                          <span>{call.callerName}</span>
                          {call.flaggedForReview && (
                            <span className="text-amber" title="Flagged for review">
                              <AlertTriangleIcon className="h-3 w-3" />
                            </span>
                          )}
                          {isSelected && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-pulse animate-ping" />
                          )}
                        </div>
                      </td>

                      {/* Time / Date */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {call.timestamp}
                      </td>

                      {/* Phone / MRN */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        <div>{call.callerNumber}</div>
                        <span className="text-[10px] text-muted">MRN: {call.patientMrn}</span>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium text-body">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              call.department === 'Cardiology'
                                ? 'bg-red-500'
                                : call.department === 'Radiology'
                                  ? 'bg-purple-500'
                                  : call.department === 'Billing'
                                    ? 'bg-amber-500'
                                    : call.department === 'Emergency'
                                      ? 'bg-rose-600'
                                      : call.department === 'Orthopedics'
                                        ? 'bg-blue-500'
                                        : 'bg-emerald-500'
                            }`}
                          />
                          {call.department}
                        </span>
                      </td>

                      {/* Doctor Assigned */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-800 whitespace-nowrap">
                        {call.doctorName}
                      </td>

                      {/* Clinical Intent */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700 truncate max-w-[180px] xl:max-w-[240px]" title={call.intent}>
                        {call.intent}
                      </td>

                      {/* Outcome Status */}
                      <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            call.outcome === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : call.outcome === 'triage'
                                ? 'bg-rose-100 text-rose-800'
                                : call.outcome === 'voicemail'
                                  ? 'bg-sky-100 text-sky-800'
                                  : call.outcome === 'no_answer_redirect'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {call.outcomeLabel}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {call.durationSec}s
                      </td>

                      {/* HIS Booking Token */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        #{call.hisBookingId}
                      </td>

                      {/* Audio & Transcript Trigger Button */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenCall(call, true)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-pulse/10 hover:bg-pulse hover:text-white px-2.5 py-1 text-[11px] font-semibold text-pulse transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="text-[10px]">▶</span>
                          <span>Recording</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* SLIDE-OVER OVERLAY DRAWER: RECORDING PLAYER + TRANSCRIPT */}
      {isDrawerOpen && selectedCall && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-ink-teal/40 backdrop-blur-[1px] animate-in fade-in-50"
            onClick={handleCloseDrawer}
            aria-hidden="true"
          />

          {/* Slide-Over Drawer Container */}
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl md:max-w-2xl flex-col border-l border-hairline bg-surface shadow-2xl outline-none animate-in slide-in-from-right duration-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`Recording & Transcript for ${selectedCall.callerName}`}
          >
            {/* Drawer Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline bg-slate-50 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pulse text-white shadow-xs">
                  <PhoneIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-body">
                      {selectedCall.callerName}
                    </h2>
                    <span className="rounded bg-white border border-hairline px-2 py-0.5 text-xs font-mono text-muted">
                      MRN: {selectedCall.patientMrn}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        selectedCall.outcome === 'resolved'
                          ? 'bg-sage/15 text-sage'
                          : selectedCall.outcome === 'triage'
                            ? 'bg-critical/15 text-critical'
                            : selectedCall.outcome === 'voicemail'
                              ? 'bg-signal/15 text-signal'
                              : 'bg-pulse/15 text-pulse'
                      }`}
                    >
                      {selectedCall.outcomeLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {selectedCall.callerNumber} · {selectedCall.timestamp} · {selectedCall.department} ({selectedCall.doctorName})
                  </p>
                </div>
              </div>

              {/* Drawer Top Navigation & Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevPatient}
                  disabled={currentIndex <= 0}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-body disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Previous patient call"
                >
                  ←
                </button>
                <span className="font-mono text-xs text-faint">
                  {currentIndex + 1} / {filteredCalls.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextPatient}
                  disabled={currentIndex >= filteredCalls.length - 1}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-body disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Next patient call"
                >
                  →
                </button>
                <div className="h-4 w-px bg-hairline mx-1" />
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  aria-label="Close drawer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-body transition-colors cursor-pointer"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Clinical Query Card & Review Flag Button */}
              <div className="rounded-xl border border-hairline bg-canvas p-3 text-xs flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                    Inquiry Reason & Context:
                  </span>
                  <p className="mt-1 font-semibold text-body text-sm">
                    {selectedCall.intent}
                  </p>
                  <p className="mt-1 text-muted text-[11px] leading-relaxed">
                    {selectedCall.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFlagReview(selectedCall.id)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold shrink-0 flex items-center gap-1 border transition-colors cursor-pointer ${
                    selectedCall.flaggedForReview
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-surface text-muted border-hairline hover:text-body'
                  }`}
                  title="Toggle Supervisor Review Flag"
                >
                  <AlertTriangleIcon className="h-3.5 w-3.5 text-amber" />
                  <span>{selectedCall.flaggedForReview ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              {/* 1. Voice Recording Audio Player */}
              <div className="rounded-2xl bg-ink-teal p-4 text-white shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlayingAudio((prev) => !prev)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform shadow-lg cursor-pointer ${
                        isPlayingAudio
                          ? 'bg-cyan text-ink-teal scale-105'
                          : 'bg-pulse text-white hover:scale-105'
                      }`}
                    >
                      {isPlayingAudio ? (
                        <span className="text-sm font-bold">❚❚</span>
                      ) : (
                        <span className="text-sm font-bold ml-0.5">▶</span>
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {isPlayingAudio ? 'Playing Telephony Audio' : 'Stereo Voice Recording'}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-mono text-cyan">
                          G.711u PBX
                        </span>
                      </div>
                      <p className="text-[10px] text-mist/70 font-mono mt-0.5">
                        Venkateshwar Inbound Trunk #4 · 8kHz Stereo
                      </p>
                    </div>
                  </div>

                  {/* Playback Speed Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg bg-white/10 p-0.5 text-[10px] font-mono font-bold">
                      {[1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPlaybackSpeed(s)}
                          className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                            playbackSpeed === s ? 'bg-white text-ink-teal' : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    <span className="font-mono text-xs font-semibold text-cyan w-14 text-right">
                      0:{currentTimeSec < 10 ? `0${currentTimeSec}` : currentTimeSec} / {selectedCall.audioDurationText}
                    </span>
                  </div>
                </div>

                {/* Animated Waveform & Scrubber */}
                <div className="mt-3.5">
                  <div className="flex items-center gap-1 h-7 px-1">
                    {[15, 32, 54, 82, 95, 68, 42, 28, 88, 98, 72, 45, 60, 84, 94, 52, 24, 65, 88, 44, 25, 50, 78, 90, 62, 38, 70, 85, 40, 20].map(
                      (val, idx) => {
                        const progressPct = (currentTimeSec / selectedCall.durationSec) * 100
                        const barPct = (idx / 30) * 100
                        const isPast = barPct <= progressPct

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setCurrentTimeSec(Math.round((idx / 30) * selectedCall.durationSec))
                              setIsPlayingAudio(true)
                            }}
                            className={`flex-1 rounded-full cursor-pointer transition-all duration-150 ${
                              isPast
                                ? 'bg-cyan'
                                : isPlayingAudio
                                  ? 'bg-white/40 hover:bg-white/70'
                                  : 'bg-white/20 hover:bg-white/50'
                            }`}
                            style={{
                              height: isPlayingAudio && isPast ? `${val}%` : `${Math.max(20, val * 0.7)}%`,
                            }}
                          />
                        )
                      }
                    )}
                  </div>

                  {/* Scrubber Bar */}
                  <div
                    className="mt-2 h-1.5 w-full rounded-full bg-white/20 cursor-pointer overflow-hidden"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const clickX = e.clientX - rect.left
                      const pct = clickX / rect.width
                      setCurrentTimeSec(Math.round(pct * selectedCall.durationSec))
                      setIsPlayingAudio(true)
                    }}
                  >
                    <div
                      className="h-full bg-cyan transition-all duration-150"
                      style={{
                        width: `${Math.min(100, (currentTimeSec / selectedCall.durationSec) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Full Conversation Transcript */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <SparklesIcon className="h-3.5 w-3.5 text-pulse" />
                    Speech-to-Text Clinical Dialogue ({selectedCall.transcript.length} turns)
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    className="text-xs font-medium text-pulse hover:underline cursor-pointer"
                  >
                    {copiedTranscript ? '✓ Copied' : 'Copy Dialogue'}
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5 rounded-2xl border border-hairline bg-canvas p-4">
                  {selectedCall.transcript.map((turn, tIdx) => {
                    const isTurnActive =
                      isPlayingAudio &&
                      currentTimeSec >= turn.sec &&
                      (tIdx === selectedCall.transcript.length - 1 || currentTimeSec < selectedCall.transcript[tIdx + 1].sec)

                    return (
                      <div
                        key={tIdx}
                        onClick={() => {
                          setCurrentTimeSec(turn.sec)
                          setIsPlayingAudio(true)
                        }}
                        className={`flex flex-col text-xs rounded-xl p-2.5 transition-all cursor-pointer ${
                          turn.speaker === 'AICA' ? 'items-end' : 'items-start'
                        } ${isTurnActive ? 'bg-pulse/10 ring-1 ring-pulse/40' : 'hover:bg-surface-hover/70'}`}
                        title="Click to jump audio to this moment"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] text-faint">
                            [{turn.timeDisplay}]
                          </span>
                          <span className={`font-semibold text-[11px] ${
                            turn.speaker === 'AICA' ? 'text-pulse' : 'text-body'
                          }`}>
                            {turn.speaker === 'AICA' ? '🤖 AICA Voice Bot' : `👤 ${selectedCall.callerName}`}
                          </span>
                          {turn.tag && (
                            <span className="rounded bg-sage/15 text-sage px-1 py-0.2 text-[9px] font-bold">
                              {turn.tag}
                            </span>
                          )}
                        </div>

                        <div
                          className={`max-w-[88%] rounded-xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                            turn.speaker === 'AICA'
                              ? 'bg-pulse text-white rounded-br-none'
                              : 'bg-surface border border-hairline text-body rounded-bl-none'
                          }`}
                        >
                          {turn.text}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3. Hospital Information System (HIS) Integration Card */}
              <div className="rounded-xl border border-hairline bg-surface-hover/60 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body">HIS Clinical Action Confirmed:</span>
                  <span className="font-mono font-bold text-pulse">#{selectedCall.hisBookingId}</span>
                </div>
                <p className="text-muted font-mono text-[11px] leading-relaxed">
                  {selectedCall.hisAction}
                </p>
                <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px]">
                  <span className="text-muted">
                    AI Clinical Confidence: <strong className="text-body font-mono">{selectedCall.confidenceScore}% ({selectedCall.confidence})</strong>
                  </span>
                  <span className="text-muted">
                    Caller Sentiment: <strong className="text-sage font-mono">{selectedCall.sentimentScore}%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="flex items-center justify-between border-t border-hairline bg-slate-50 px-6 py-3">
              <span className="font-mono text-xs text-muted">
                Audio Duration: {selectedCall.audioDurationText}
              </span>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="btn-secondary !py-1.5 !px-4 text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
