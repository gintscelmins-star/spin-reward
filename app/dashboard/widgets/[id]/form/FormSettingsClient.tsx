'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import {
  updateFormSettings,
  upsertFormField,
  deleteFormField,
  reorderFormField,
} from '../../actions'
import type { ActionState } from '../../actions'

interface WheelRow {
  id: string
  name: string
  form_show_name: boolean
  form_show_phone: boolean
  form_require_name: boolean
  form_require_phone: boolean
  gdpr_text: string | null
  survey_enabled: boolean
}

interface FormField {
  id: string
  field_type: string
  label: string
  placeholder: string | null
  required: boolean
  sort_order: number
  active: boolean
}

interface Props {
  wheel: WheelRow
  fields: FormField[]
}

function Toggle({
  name,
  label,
  hint,
  defaultValue = false,
  onChange,
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: boolean
  onChange?: (v: boolean) => void
}) {
  const [on, setOn] = useState(defaultValue)
  return (
    <div className="flex items-start justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="ml-4 flex-shrink-0">
        <input type="hidden" name={name} value={on ? 'true' : 'false'} />
        <button
          type="button"
          onClick={() => {
            setOn(v => {
              onChange?.(!v)
              return !v
            })
          }}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            on ? 'bg-purple-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  question_text: 'Text Answer',
  question_select: 'Multiple Choice',
  question_rating: 'Rating (1–5)',
}

export default function FormSettingsClient({ wheel, fields }: Props) {
  const [showName, setShowName] = useState(wheel.form_show_name)
  const [showPhone, setShowPhone] = useState(wheel.form_show_phone)
  const [surveyEnabled, setSurveyEnabled] = useState(wheel.survey_enabled)
  const [settingsState, settingsAction, settingsPending] = useActionState<ActionState, FormData>(
    updateFormSettings,
    null
  )

  // Field modal state
  const [fieldOpen, setFieldOpen] = useState(false)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [fieldState, fieldAction, fieldPending] = useActionState<ActionState, FormData>(
    upsertFormField,
    null
  )
  const prevFieldPendingRef = useRef(false)

  useEffect(() => {
    if (prevFieldPendingRef.current && !fieldPending && !fieldState?.error) {
      setTimeout(() => { setFieldOpen(false); setEditingField(null) }, 0)
    }
    prevFieldPendingRef.current = fieldPending
  }, [fieldPending, fieldState])

  const nextSortOrder = fields.length > 0
    ? Math.max(...fields.map(f => f.sort_order)) + 1
    : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Main settings form */}
      <form action={settingsAction}>
        <input type="hidden" name="wheel_id" value={wheel.id} />

        <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-700 mb-1">Lead Form Fields</h2>
          <p className="text-xs text-gray-400 mb-4">Email is always collected. Toggle additional fields below.</p>

          <div className="divide-y divide-gray-50">
            <Toggle
              name="form_show_name"
              label="Collect name"
              defaultValue={wheel.form_show_name}
              onChange={v => setShowName(v)}
            />
            {showName && (
              <Toggle
                name="form_require_name"
                label="Require name"
                hint="If off, name is optional"
                defaultValue={wheel.form_require_name}
              />
            )}
            {!showName && <input type="hidden" name="form_require_name" value="false" />}

            <Toggle
              name="form_show_phone"
              label="Collect phone"
              defaultValue={wheel.form_show_phone}
              onChange={v => setShowPhone(v)}
            />
            {showPhone && (
              <Toggle
                name="form_require_phone"
                label="Require phone"
                hint="If off, phone is optional"
                defaultValue={wheel.form_require_phone}
              />
            )}
            {!showPhone && <input type="hidden" name="form_require_phone" value="false" />}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mt-4">
          <h2 className="text-base font-bold text-gray-700 mb-1">GDPR Consent</h2>
          <p className="text-xs text-gray-400 mb-3">Shown below the form. Leave blank to hide.</p>
          <textarea
            name="gdpr_text"
            rows={3}
            defaultValue={wheel.gdpr_text ?? ''}
            placeholder="I agree to receive marketing communications..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mt-4">
          <div className="divide-y divide-gray-50">
            <Toggle
              name="survey_enabled"
              label="Enable post-spin survey"
              hint="Show custom question fields after the wheel spin"
              defaultValue={wheel.survey_enabled}
              onChange={v => setSurveyEnabled(v)}
            />
          </div>
        </div>

        {settingsState?.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {settingsState.error}
          </div>
        )}
        {settingsState?.success && !settingsState?.error && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            Settings saved.
          </div>
        )}

        <button
          type="submit"
          disabled={settingsPending}
          className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
        >
          {settingsPending ? 'Saving...' : 'Save Form Settings'}
        </button>
      </form>

      {/* Survey fields section */}
      {surveyEnabled && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-700">Survey Questions</h2>
              <p className="text-xs text-gray-400">Shown after the user spins the wheel</p>
            </div>
            <button
              onClick={() => { setEditingField(null); setFieldOpen(true) }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              + Add Question
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">Order</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Question</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Required</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col">
                          <form action={reorderFormField}>
                            <input type="hidden" name="wheel_id" value={wheel.id} />
                            <input type="hidden" name="id" value={f.id} />
                            <input type="hidden" name="sort_order" value={f.sort_order} />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              disabled={i === 0}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none px-0.5"
                            >
                              ↑
                            </button>
                          </form>
                          <form action={reorderFormField}>
                            <input type="hidden" name="wheel_id" value={wheel.id} />
                            <input type="hidden" name="id" value={f.id} />
                            <input type="hidden" name="sort_order" value={f.sort_order} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              disabled={i === fields.length - 1}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none px-0.5"
                            >
                              ↓
                            </button>
                          </form>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{f.sort_order}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{f.label}</p>
                      {f.placeholder && (
                        <p className="text-xs text-gray-400">{f.placeholder}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {FIELD_TYPE_LABELS[f.field_type] ?? f.field_type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.required ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {f.required ? 'required' : 'optional'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setEditingField(f); setFieldOpen(true) }}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          Edit
                        </button>
                        <form action={deleteFormField}>
                          <input type="hidden" name="wheel_id" value={wheel.id} />
                          <input type="hidden" name="id" value={f.id} />
                          <button type="submit" className="text-xs text-red-400 hover:text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No survey questions yet — add one above
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Field modal */}
      {fieldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingField ? 'Edit Question' : 'Add Question'}
            </h2>

            {fieldState?.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {fieldState.error}
              </div>
            )}

            <form action={fieldAction} className="flex flex-col gap-3">
              <input type="hidden" name="wheel_id" value={wheel.id} />
              {editingField && <input type="hidden" name="id" value={editingField.id} />}
              <input
                type="hidden"
                name="sort_order"
                value={editingField?.sort_order ?? nextSortOrder}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="field_type"
                  defaultValue={editingField?.field_type ?? 'question_text'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  <option value="question_text">Text Answer</option>
                  <option value="question_select">Multiple Choice</option>
                  <option value="question_rating">Rating (1–5)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Label *</label>
                <input
                  name="label"
                  required
                  defaultValue={editingField?.label ?? ''}
                  placeholder="e.g. How did you hear about us?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                <input
                  name="placeholder"
                  defaultValue={editingField?.placeholder ?? ''}
                  placeholder="Optional hint text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required</label>
                <select
                  name="required"
                  defaultValue={String(editingField?.required ?? false)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  <option value="false">Optional</option>
                  <option value="true">Required</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFieldOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fieldPending}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  {fieldPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
