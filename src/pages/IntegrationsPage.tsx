import { useState } from 'react'
import { mockDoctorAttendanceList, mockIntegrations } from '../data/mock'
import type { DoctorAttendanceRecord, Integration, IntegrationStatus } from '../types'
import {
  CameraIcon,
  FaceScanIcon,
  IntegrationsIcon,
  PhoneIcon,
} from '../components/icons'
import { Toggle } from '../components/Toggle'
import { useUiStore } from '../store/ui'

const STATUS_CONFIG: Record<
  IntegrationStatus,
  { label: string; className: string; dot: string }
> = {
  connected: { label: 'Connected', className: 'bg-sage/12 text-sage', dot: 'bg-sage' },
  disconnected: { label: 'Not connected', className: 'bg-muted/12 text-muted', dot: 'bg-muted' },
  error: { label: 'Needs attention', className: 'bg-critical/12 text-critical', dot: 'bg-critical' },
}

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const openDrawer = useUiStore((s) => s.openDrawer)
  const closeDrawer = useUiStore((s) => s.closeDrawer)

  function openManage(integration: Integration) {
    if (integration.id === 'doctor-attendance') {
      openDrawer({
        title: 'Biometric Face Recognition Roster',
        subtitle: 'Doctor Attendance & Real-Time OPD Availability',
        body: (
          <DoctorAttendanceDetail
            integration={integration}
            onConnected={() => {
              setIntegrations((prev) =>
                prev.map((it) =>
                  it.id === integration.id
                    ? { ...it, status: 'connected' }
                    : it,
                ),
              )
              closeDrawer()
            }}
            onDisconnected={() => {
              setIntegrations((prev) =>
                prev.map((it) =>
                  it.id === integration.id
                    ? { ...it, status: 'disconnected', detail: 'Attendance cameras disconnected.' }
                    : it,
                ),
              )
              closeDrawer()
            }}
          />
        ),
      })
      return
    }

    openDrawer({
      title: integration.name,
      subtitle: integration.category,
      body: (
        <IntegrationDetail
          integration={integration}
          onConnected={() => {
            setIntegrations((prev) =>
              prev.map((it) =>
                it.id === integration.id
                  ? {
                      ...it,
                      status: 'connected',
                      detail: 'Connected just now — syncing for the first time.',
                    }
                  : it,
              ),
            )
            closeDrawer()
          }}
          onDisconnected={() => {
            setIntegrations((prev) =>
              prev.map((it) =>
                it.id === integration.id
                  ? { ...it, status: 'disconnected', detail: 'Not connected.' }
                  : it,
              ),
            )
            closeDrawer()
          }}
        />
      ),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const status = STATUS_CONFIG[integration.status]
          const isAttendance = integration.id === 'doctor-attendance'

          if (isAttendance) {
            return (
              <div
                key={integration.id}
                className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface p-5 shadow-sm transition-all duration-150 hover:shadow-md md:col-span-2"
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                        <FaceScanIcon className="h-6 w-6" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-body">
                            {integration.name}
                          </p>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-pulse/10 px-2 py-0.5 text-[11px] font-semibold text-pulse">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pulse" />
                            Live Face Match Terminal
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
                          {integration.category}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-body">{integration.detail}</p>

                  {/* Real-time Telemetry & Doctor Availability Badges */}
                  <div className="mt-4 rounded-xl border border-hairline bg-canvas/60 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/80 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-body">
                        <CameraIcon className="h-4 w-4 text-primary" />
                        <span>Live Biometric Attendance Stream · 4 Terminals Active</span>
                      </div>
                      <span className="font-mono text-xs text-muted">
                        Match Confidence: 99.4% · Latency: 240ms
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg border border-hairline bg-surface p-2.5 text-center">
                        <p className="font-mono text-lg font-bold text-sage">18</p>
                        <p className="text-[11px] font-medium text-muted">Available in OPD</p>
                      </div>
                      <div className="rounded-lg border border-hairline bg-surface p-2.5 text-center">
                        <p className="font-mono text-lg font-bold text-amber">3</p>
                        <p className="text-[11px] font-medium text-muted">In OT / Surgery</p>
                      </div>
                      <div className="rounded-lg border border-hairline bg-surface p-2.5 text-center">
                        <p className="font-mono text-lg font-bold text-faint">1</p>
                        <p className="text-[11px] font-medium text-muted">Off-Site / Shift Over</p>
                      </div>
                      <div className="rounded-lg border border-hairline bg-surface p-2.5 text-center">
                        <p className="font-mono text-lg font-bold text-primary">100%</p>
                        <p className="text-[11px] font-medium text-muted">AICA Voice Auto-Sync</p>
                      </div>
                    </div>

                    {/* Live Detected Doctors preview chips */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted mr-1">
                        Recent Detections:
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/30 bg-sage/10 px-2.5 py-0.5 text-[11px] font-medium text-sage">
                        <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                        Dr. R. Sharma (Cardio) • OPD Suite 204
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Dr. S. Mehra (Pedia) • In OT 2
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/30 bg-sage/10 px-2.5 py-0.5 text-[11px] font-medium text-sage">
                        <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                        Dr. A. Verma (Ortho) • OPD Suite 108
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/30 bg-sage/10 px-2.5 py-0.5 text-[11px] font-medium text-sage">
                        <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                        Dr. A. Gupta (Medicine) • OPD Suite 102
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => openManage(integration)}
                    className="btn-primary !px-4 !py-1.5 text-xs font-semibold shadow-xs"
                  >
                    Manage Doctor Roster & Terminals
                  </button>
                  <button
                    type="button"
                    onClick={() => openManage(integration)}
                    className="btn-secondary !px-4 !py-1.5 text-xs font-semibold"
                  >
                    <CameraIcon className="h-3.5 w-3.5 text-muted" />
                    Live Camera Terminals
                  </button>
                </div>
              </div>
            )
          }

          const icon =
            integration.id === 'telephony' ? (
              <PhoneIcon className="h-5 w-5" />
            ) : (
              <IntegrationsIcon className="h-5 w-5" />
            )

          return (
            <div
              key={integration.id}
              className="flex items-start gap-4 rounded-2xl border border-hairline bg-surface p-5 shadow-sm transition-all duration-150 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-body">{integration.name}</p>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-muted">
                  {integration.category}
                </p>
                <p className="mt-2 text-sm text-muted">{integration.detail}</p>
                <button
                  type="button"
                  onClick={() => openManage(integration)}
                  className="btn-secondary mt-3 !px-3.5 !py-1.5 text-xs font-semibold"
                >
                  {integration.status === 'connected' ? 'Manage' : 'Connect'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DoctorAttendanceDetail({
  integration,
  onConnected,
  onDisconnected,
}: {
  integration: Integration
  onConnected: () => void
  onDisconnected: () => void
}) {
  const [doctors, setDoctors] = useState<DoctorAttendanceRecord[]>(mockDoctorAttendanceList)
  const [filter, setFilter] = useState<'all' | 'available' | 'in-ot' | 'checked-out'>('all')
  const [autoSync, setAutoSync] = useState(true)
  const [livenessCheck, setLivenessCheck] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const toggleDoctorStatus = (id: string) => {
    setDoctors((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc
        const nextStatus: DoctorAttendanceRecord['status'] =
          doc.status === 'available'
            ? 'in-ot'
            : doc.status === 'in-ot'
              ? 'checked-out'
              : 'available'
        return {
          ...doc,
          status: nextStatus,
          location:
            nextStatus === 'available'
              ? 'OPD Consultant Suite'
              : nextStatus === 'in-ot'
                ? 'Operating Theatre Wing'
                : 'Off-Site / Off-Duty',
        }
      }),
    )
  }

  const availableCount = doctors.filter((d) => d.status === 'available').length
  const inOtCount = doctors.filter((d) => d.status === 'in-ot').length
  const checkedOutCount = doctors.filter((d) => d.status === 'checked-out').length

  const filteredDoctors = doctors.filter((d) => {
    if (filter === 'all') return true
    return d.status === filter
  })

  function reconnect() {
    setConnecting(true)
    setTimeout(() => {
      setConnecting(false)
      onConnected()
    }, 800)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Banner */}
      <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FaceScanIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-body">
                Facial Biometric Attendance Stream
              </p>
              <p className="text-xs text-muted">
                Real-time physician presence detection across hospital gates
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/12 px-2.5 py-0.5 text-xs font-semibold text-sage">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" />
            Live Syncing
          </span>
        </div>

        {/* How AICA Uses This */}
        <div className="mt-3.5 rounded-lg border border-primary/20 bg-primary-light/40 p-3 text-xs text-body leading-relaxed">
          <span className="font-semibold text-primary-dark">How AICA Uses This: </span>
          When callers request a consultation or check if their specialist is available today, AICA
          checks this real-time biometric stream. If the doctor has scanned in at the OPD terminal,
          AICA offers immediate booking. If recognized in the OT suite, AICA informs callers they are
          in surgery and books follow-ups or transfers urgent triage calls.
        </div>
      </div>

      {/* Terminal Feeds Telemetry */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Active Face Recognition Terminals
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-hairline bg-canvas p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-body">OPD Block A Terminal</span>
              <span className="h-2 w-2 rounded-full bg-sage" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">30 FPS · 99.6% Match</p>
          </div>
          <div className="rounded-lg border border-hairline bg-canvas p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-body">OT Surgical Wing</span>
              <span className="h-2 w-2 rounded-full bg-sage" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">30 FPS · 98.9% Match</p>
          </div>
          <div className="rounded-lg border border-hairline bg-canvas p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-body">Main Entrance Gate 1</span>
              <span className="h-2 w-2 rounded-full bg-sage" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">30 FPS · 99.4% Match</p>
          </div>
          <div className="rounded-lg border border-hairline bg-canvas p-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-body">Maternity & Child Wing</span>
              <span className="h-2 w-2 rounded-full bg-sage" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">30 FPS · 99.2% Match</p>
          </div>
        </div>
      </div>

      {/* Doctor Availability Live Roster */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Live Physician Availability ({doctors.length})
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-hairline bg-canvas p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                filter === 'all' ? 'bg-surface font-semibold text-body shadow-xs' : 'text-muted'
              }`}
            >
              All ({doctors.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-surface font-semibold text-sage shadow-xs'
                  : 'text-muted'
              }`}
            >
              OPD ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('in-ot')}
              className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                filter === 'in-ot'
                  ? 'bg-surface font-semibold text-amber shadow-xs'
                  : 'text-muted'
              }`}
            >
              In OT ({inOtCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('checked-out')}
              className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                filter === 'checked-out'
                  ? 'bg-surface font-semibold text-faint shadow-xs'
                  : 'text-muted'
              }`}
            >
              Off-Site ({checkedOutCount})
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col divide-y divide-hairline rounded-xl border border-hairline bg-surface">
          {filteredDoctors.map((doc) => {
            const isAvail = doc.status === 'available'
            const isInOt = doc.status === 'in-ot'

            return (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-canvas/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-body">{doc.name}</p>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isAvail
                          ? 'bg-sage/12 text-sage'
                          : isInOt
                            ? 'bg-amber/15 text-amber-800'
                            : 'bg-muted/12 text-muted'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvail ? 'bg-sage' : isInOt ? 'bg-amber' : 'bg-muted'
                        }`}
                      />
                      {isAvail
                        ? 'Available (OPD Booking Open)'
                        : isInOt
                          ? 'In Surgery / OT'
                          : 'Off-Duty / Away'}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted mt-0.5">{doc.specialty}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-faint">
                    <span>📍 {doc.location}</span>
                    <span>📷 {doc.terminalName}</span>
                    <span>⏱ {doc.checkInTime}</span>
                    <span className="text-sage font-medium">✓ {doc.confidence}% match</span>
                  </div>
                </div>

                <button
                  type="button"
                  title="Click to simulate doctor status toggle"
                  onClick={() => toggleDoctorStatus(doc.id)}
                  className="btn-secondary shrink-0 !px-2.5 !py-1 text-xs"
                >
                  Simulate
                </button>
              </div>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-faint">
          Tip: Click "Simulate" on any doctor to toggle their facial check-in state and test how AICA
          switches booking slots dynamically.
        </p>
      </div>

      {/* Integration Automations & Settings */}
      <div className="rounded-xl border border-hairline bg-canvas p-3.5 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          AICA Biometric Dispatch Settings
        </p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-body">
              Auto-sync OPD booking slots on facial match
            </p>
            <p className="text-xs text-muted">
              Instantly activates caller booking as soon as the physician enters hospital terminals.
            </p>
          </div>
          <Toggle
            checked={autoSync}
            onChange={setAutoSync}
            label="Auto-sync booking slots"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-hairline/80 pt-3">
          <div>
            <p className="text-sm font-medium text-body">
              3D Liveness Detection (Anti-spoofing)
            </p>
            <p className="text-xs text-muted">
              Prevents photo/video spoofing at gates; enforces high-accuracy biometric verification.
            </p>
          </div>
          <Toggle
            checked={livenessCheck}
            onChange={setLivenessCheck}
            label="Liveness detection"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-hairline pt-4">
        {integration.status === 'connected' ? (
          <button type="button" onClick={onDisconnected} className="btn-danger">
            Disconnect Cameras
          </button>
        ) : (
          <button
            type="button"
            onClick={reconnect}
            disabled={connecting}
            className="btn-primary"
          >
            {connecting ? 'Reconnecting Cameras…' : 'Reconnect Terminals'}
          </button>
        )}
      </div>
    </div>
  )
}

function IntegrationDetail({
  integration,
  onConnected,
  onDisconnected,
}: {
  integration: Integration
  onConnected: () => void
  onDisconnected: () => void
}) {
  const [connecting, setConnecting] = useState(false)

  function connect() {
    setConnecting(true)
    setTimeout(onConnected, 900)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">{integration.detail}</p>
      <div className="rounded-xl border border-hairline bg-canvas p-3">
        <p className="text-xs text-muted">Category</p>
        <p className="mt-1 text-sm text-body">{integration.category}</p>
      </div>

      {integration.status === 'connected' ? (
        <button type="button" onClick={onDisconnected} className="btn-danger self-start">
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={connect}
          disabled={connecting}
          className="btn-primary self-start"
        >
          {connecting ? 'Connecting…' : integration.status === 'error' ? 'Reconnect' : 'Connect'}
        </button>
      )}
    </div>
  )
}
