import styled from '@emotion/styled'
import { useEffect, useState, type FormEvent } from 'react'
import {
  DIFFICULTY_OPTIONS,
  getTemplateById,
  splitDuration,
  toTotalMinutes,
  type ExerciseItem,
  type ExerciseTemplate,
} from '../data/exerciseTemplates'
import type { ExercisePayload } from '../store/useExerciseStore'

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`

const Title = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.03em;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
`

const FieldSpan = styled.span`
  display: block;
`

const Optional = styled.em`
  font-style: normal;
  font-weight: 600;
  color: #9ca3af;
`

const Input = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 14px;
  border: 1px solid var(--cal-border, #e5e7eb);
  background: #fff;
  color: inherit;
  box-sizing: border-box;

  &:focus {
    outline: 3px solid rgba(99, 102, 241, 0.35);
  }
`

const DurationRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`

const DurationPart = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
`

const Unit = styled.span`
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 800;
  color: #6b7280;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
`

const DifficultyFieldset = styled.fieldset`
  margin: 0;
  padding: 0;
  border: none;
`

const Legend = styled.legend`
  margin-bottom: 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--cal-text-dim, #6b7280);
`

const DifficultyOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`

const DiffOption = styled.label<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) => ($active ? 'transparent' : '#e5e7eb')};
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)'
      : '#f9fafb'};
  color: ${({ $active }) => ($active ? '#fff' : '#4b5563')};
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #dc2626;
`

const Actions = styled.div`
  display: flex;
  gap: 0.55rem;
`

const SecondaryBtn = styled.button`
  flex: 1;
  min-height: 48px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f3f4f6;
  font-size: 0.95rem;
  font-weight: 800;
  color: #374151;
  cursor: pointer;
`

const PrimaryBtn = styled.button`
  flex: 1.4;
  min-height: 48px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
  font-size: 0.95rem;
  font-weight: 900;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.28);
`

export interface ExerciseEntryFormProps {
  template?: ExerciseTemplate | null
  initialValues?: ExerciseItem | null
  onSubmit: (payload: ExercisePayload) => void
  onCancel: () => void
  submitLabel?: string
}

export default function ExerciseEntryForm({
  template,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = '저장',
}: ExerciseEntryFormProps) {
  const tpl = template || (initialValues ? getTemplateById(initialValues.type) : null)
  const defaults = tpl?.defaults ?? {}

  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [seconds, setSeconds] = useState('')
  const [reps, setReps] = useState('')
  const [sets, setSets] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialValues) {
      if (initialValues.minutes != null && initialValues.minutes !== 0) {
        const parts = splitDuration(initialValues.minutes)
        setHours(parts.hours ? String(parts.hours) : '')
        setMinutes(parts.minutes ? String(parts.minutes) : '')
      } else {
        setHours('')
        setMinutes('')
      }
      setDistance(
        initialValues.distance != null ? String(initialValues.distance) : '',
      )
      setSeconds(
        initialValues.seconds != null ? String(initialValues.seconds) : '',
      )
      setReps(initialValues.reps != null ? String(initialValues.reps) : '')
      setSets(initialValues.sets != null ? String(initialValues.sets) : '')
      setDifficulty(initialValues.difficulty ?? '')
      return
    }

    if (defaults.minutes != null) {
      const parts = splitDuration(defaults.minutes)
      setHours(parts.hours ? String(parts.hours) : '')
      setMinutes(parts.minutes ? String(parts.minutes) : '')
    } else {
      setHours('')
      setMinutes('')
    }
    setDistance(defaults.distance != null ? String(defaults.distance) : '')
    setSeconds(defaults.seconds != null ? String(defaults.seconds) : '')
    setReps(defaults.reps != null ? String(defaults.reps) : '')
    setSets(defaults.sets != null ? String(defaults.sets) : '')
    setDifficulty('')
    setError('')
  }, [tpl?.id, initialValues])

  if (!tpl) return null

  function positiveNumber(value: string): boolean {
    const n = Number(value)
    return Number.isFinite(n) && n > 0
  }

  function nonNegativeNumber(value: string): boolean {
    if (value === '' || value == null) return true
    const n = Number(value)
    return Number.isFinite(n) && n >= 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const payload: ExercisePayload = {
      type: tpl!.id,
      difficulty: difficulty || undefined,
    }

    if (tpl!.inputType === 'time') {
      if (!nonNegativeNumber(hours) || !nonNegativeNumber(minutes)) {
        setError('시간/분은 0 이상의 숫자로 입력해 주세요.')
        return
      }
      const totalMinutes = toTotalMinutes(Number(hours) || 0, Number(minutes) || 0)
      if (totalMinutes <= 0) {
        setError('시간 또는 분을 1 이상 입력해 주세요.')
        return
      }
      payload.minutes = totalMinutes
      if (distance !== '') {
        if (!positiveNumber(distance)) {
          setError('거리는 0보다 큰 숫자여야 합니다.')
          return
        }
        payload.distance = Number(distance)
      }
    }

    if (tpl!.inputType === 'timeSets') {
      if (!positiveNumber(seconds)) {
        setError('시간을 1초 이상 입력해 주세요.')
        return
      }
      if (!positiveNumber(sets)) {
        setError('세트를 1 이상 입력해 주세요.')
        return
      }
      payload.seconds = Number(seconds)
      payload.sets = Number(sets)
    }

    if (tpl!.inputType === 'repsSets') {
      if (!positiveNumber(reps)) {
        setError('횟수를 1회 이상 입력해 주세요.')
        return
      }
      if (!positiveNumber(sets)) {
        setError('세트를 1 이상 입력해 주세요.')
        return
      }
      payload.reps = Number(reps)
      payload.sets = Number(sets)
    }

    onSubmit(payload)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Title>{tpl.name}</Title>

      {tpl.inputType === 'time' && (
        <>
          <Field as="div">
            <FieldSpan>시간</FieldSpan>
            <DurationRow>
              <DurationPart>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                  aria-label="시간"
                />
                <Unit>시간</Unit>
              </DurationPart>
              <DurationPart>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  aria-label="분"
                />
                <Unit>분</Unit>
              </DurationPart>
            </DurationRow>
          </Field>
          <Field>
            <FieldSpan>
              거리 <Optional>(선택)</Optional>
            </FieldSpan>
            <Row>
              <Input
                type="number"
                inputMode="decimal"
                min={0.1}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="예: 3.2"
              />
              <Unit>km</Unit>
            </Row>
          </Field>
        </>
      )}

      {tpl.inputType === 'timeSets' && (
        <>
          <Field>
            <FieldSpan>시간</FieldSpan>
            <Row>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                placeholder="예: 5"
              />
              <Unit>{tpl.timeUnit}</Unit>
            </Row>
          </Field>
          <Field>
            <FieldSpan>세트</FieldSpan>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="예: 3"
            />
          </Field>
        </>
      )}

      {tpl.inputType === 'repsSets' && (
        <>
          <Field>
            <FieldSpan>횟수</FieldSpan>
            <Row>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="예: 3"
              />
              <Unit>회</Unit>
            </Row>
          </Field>
          <Field>
            <FieldSpan>세트</FieldSpan>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="예: 1"
            />
          </Field>
        </>
      )}

      <DifficultyFieldset>
        <Legend>
          운동 느낌 <Optional>(선택)</Optional>
        </Legend>
        <DifficultyOptions>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <DiffOption key={opt.id} $active={difficulty === opt.id}>
              <input
                type="radio"
                name="difficulty"
                value={opt.id}
                checked={difficulty === opt.id}
                onChange={() => setDifficulty(opt.id)}
              />
              <span>{opt.label}</span>
            </DiffOption>
          ))}
        </DifficultyOptions>
      </DifficultyFieldset>

      {error && <ErrorText>{error}</ErrorText>}

      <Actions>
        <SecondaryBtn type="button" onClick={onCancel}>
          취소
        </SecondaryBtn>
        <PrimaryBtn type="submit">{submitLabel}</PrimaryBtn>
      </Actions>
    </Form>
  )
}
