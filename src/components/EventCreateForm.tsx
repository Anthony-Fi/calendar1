"use client"

import { useState } from 'react'

type Category = { id: string; name: string }

type Props = {
  locale: 'en' | 'sv' | 'fi'
  categories: Category[]
  action: (formData: FormData) => Promise<void>
  canPublishNow?: boolean
}

function isValidTimezone(tz: string) {
  try {
    // throws if invalid
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format()
    return true
  } catch {
    return false
  }
}

export default function EventCreateForm({ locale, categories, action, canPublishNow = false }: Props) {
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const fd = new FormData(form)
    const nextErrors: string[] = []

    const title = String(fd.get('title') || '').trim()
    const startAt = String(fd.get('startAt') || '')
    const endAt = String(fd.get('endAt') || '')
    const timezone = String(fd.get('timezone') || '').trim()
    const isOnline = fd.get('isOnline') === 'on'
    const venueName = String(fd.get('venueName') || '').trim()
    const venueAddress = String(fd.get('venueAddress') || '').trim()
    const venueCity = String(fd.get('venueCity') || '').trim()
    const venuePostal = String(fd.get('venuePostalCode') || '').trim()
    const priceCents = String(fd.get('priceCents') || '').trim()
    const coverImage = String(fd.get('coverImage') || '').trim()

    if (!title || title.length < 3) nextErrors.push('Title must be at least 3 characters')
    if (!startAt) nextErrors.push('Start date/time is required')
    if (!endAt) nextErrors.push('End date/time is required')
    if (startAt && endAt) {
      const s = new Date(startAt).getTime()
      const eMs = new Date(endAt).getTime()
      if (isNaN(s) || isNaN(eMs)) nextErrors.push('Invalid date/time values')
      else if (eMs <= s) nextErrors.push('End must be after start')
    }
    if (!timezone) nextErrors.push('Timezone is required')
    else if (!isValidTimezone(timezone)) nextErrors.push('Invalid timezone (use IANA zone like Europe/Helsinki)')

    if (!isOnline) {
      if (!venueName) nextErrors.push('Location (venue name) is required for in-person events')
      if (!venueAddress) nextErrors.push('Address is required for in-person events')
      if (!venueCity) nextErrors.push('Town/City is required for in-person events')
      if (!venuePostal) nextErrors.push('Post code is required for in-person events')
    }

    if (priceCents) {
      const n = Number(priceCents)
      if (!Number.isInteger(n) || n < 0) nextErrors.push('Price must be a non-negative integer (in cents)')
    }
    if (coverImage) {
      try {
        new URL(coverImage)
      } catch {
        nextErrors.push('Cover image must be a valid URL')
      }
    }

    if (nextErrors.length > 0) {
      e.preventDefault()
      setErrors(nextErrors)
      return
    }

    setErrors([])
    setSubmitting(true)
    // allow normal submit to trigger server action
  }

  return (
    <form action={action as any} onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-medium mb-1">Please fix the following:</div>
          <ul className="list-disc ml-5 space-y-1">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm mb-1" htmlFor="title" title="A short, descriptive name for your event (min 3 characters)">Title</label>
        <input id="title" name="title" type="text" required className="w-full border rounded px-3 py-2" placeholder="e.g. JavaScript Meetup" />
        <p className="mt-1 text-xs text-gray-500">Minimum 3 characters.</p>
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="startAt" title="Event start (local to your system timezone unless otherwise translated by server)">Start</label>
          <input id="startAt" name="startAt" type="datetime-local" required className="w-full border rounded px-3 py-2" />
          <p className="mt-1 text-xs text-gray-500">Must be before end time.</p>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="endAt" title="Event end time">End</label>
          <input id="endAt" name="endAt" type="datetime-local" required className="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="timezone" title="Use an IANA timezone like Europe/Helsinki or America/New_York">Timezone (IANA)</label>
          <input id="timezone" name="timezone" type="text" placeholder="Europe/Helsinki" defaultValue="Europe/Helsinki" required className="w-full border rounded px-3 py-2" />
          <p className="mt-1 text-xs text-gray-500">Examples: Europe/Helsinki, America/New_York, UTC.</p>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="isOnline" name="isOnline" type="checkbox" className="h-4 w-4" />
          <label htmlFor="isOnline" title="Check if the event happens online (no physical venue)">Online event</label>
        </div>
      </div>

      <div>
        <div className="text-sm mb-2">Location (for in-person events)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="venueName">Location name</label>
            <input id="venueName" name="venueName" type="text" className="w-full border rounded px-3 py-2" placeholder="e.g. Community Hall" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="venueAddress">Address</label>
            <input id="venueAddress" name="venueAddress" type="text" className="w-full border rounded px-3 py-2" placeholder="Street and number" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="venueCity">Town/City</label>
            <input id="venueCity" name="venueCity" type="text" className="w-full border rounded px-3 py-2" placeholder="e.g. Loviisa" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="venuePostalCode">Post code</label>
            <input id="venuePostalCode" name="venuePostalCode" type="text" className="w-full border rounded px-3 py-2" placeholder="e.g. 07900" />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">Leave blank if the event is online.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="priceCents" title="Enter a non-negative integer; 0 or blank for free">Price (cents)</label>
          <input id="priceCents" name="priceCents" type="number" min={0} className="w-full border rounded px-3 py-2" />
          <p className="mt-1 text-xs text-gray-500">Example: 1500 = 15.00</p>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="coverImage" title="Publicly accessible URL to the event image">Cover image URL</label>
          <input id="coverImage" name="coverImage" type="url" className="w-full border rounded px-3 py-2" />
          <p className="mt-1 text-xs text-gray-500">Leave blank to use a placeholder image.</p>
        </div>
      </div>

      <div>
        <div className="text-sm mb-2" title="Tag your event to help discovery">Categories</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="categories" value={c.id} />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Create'}
        </button>
      </div>

      {canPublishNow && (
        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm" title="Publish immediately (skips Draft). Only available to moderators/admins.">
            <input type="checkbox" name="publishNow" />
            <span>Publish now</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">If checked, the event will be created as SCHEDULED.</p>
        </div>
      )}
    </form>
  )
}
