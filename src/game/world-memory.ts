import type { ExpeditionEvent, Hero } from './types'
import type { SeededRng } from './random'

interface MemoryStep { title: string; npc: string; description: string; choices: ExpeditionEvent['choices'] }
interface MemoryChain { id: string; steps: MemoryStep[] }

export const recurringNpcs = {
  mara: 'Мара, торговка пеплом', severin: 'Северин, слепой картограф', rook: 'Грач, наёмник без знамени',
} as const

const chains: MemoryChain[] = [
  { id: 'mara-debt', steps: [
    { title: 'Долг Мары', npc: 'mara', description: 'Мара просит вложить золото в караван, которого пока не существует.', choices: [{ label: 'Довериться', hint: 'Запомнить решение', kind: 'score', value: 10 }, { label: 'Отказать', hint: 'Сохранить дистанцию', kind: 'gold', value: 3 }] },
    { title: 'Караван Мары', npc: 'mara', description: 'Мара возвращается: на её телеге висит знак вашего прошлого решения.', choices: [{ label: 'Принять долю', hint: 'Прошлое решение приносит результат', kind: 'gold', value: 18 }, { label: 'Взять товаром', hint: 'Получить предмет', kind: 'item', value: 1 }] },
  ] },
  { id: 'map-blood', steps: [
    { title: 'Карта на коже', npc: 'severin', description: 'Северин предлагает карту, нарисованную кровью неизвестного бойца.', choices: [{ label: 'Изучить метки', hint: 'Запомнить путь', kind: 'score', value: 12 }, { label: 'Сжечь карту', hint: 'Разорвать цепь', kind: 'boon', value: 1 }] },
    { title: 'Место с карты', npc: 'severin', description: 'Стены совпадают с картой Северина. Здесь уже ждали вашего выбора.', choices: [{ label: 'Открыть нишу', hint: 'Получить материалы', kind: 'material', value: 5 }, { label: 'Сменить путь', hint: 'Сохранить здоровье', kind: 'heal', value: 14 }] },
  ] },
  { id: 'rook-banner', steps: [
    { title: 'Чужое знамя', npc: 'rook', description: 'Грач просит спрятать знамя павшего отряда.', choices: [{ label: 'Спрятать', hint: 'Грач запомнит помощь', kind: 'material', value: 2 }, { label: 'Продать знак', hint: 'Получить золото', kind: 'gold', value: 9 }] },
    { title: 'Отряд без знамени', npc: 'rook', description: 'Грач узнаёт знак — или место, где он должен был быть.', choices: [{ label: 'Встать рядом', hint: 'Получить благословение', kind: 'boon', value: 1 }, { label: 'Потребовать плату', hint: 'Получить золото', kind: 'gold', value: 14 }] },
  ] },
  { id: 'bell-seed', steps: [
    { title: 'Семя колокола', npc: 'mara', description: 'Мара продаёт металлическое семя, звенящее только рядом с ложью.', choices: [{ label: 'Купить обещанием', hint: 'Запомнить долг', kind: 'score', value: 8 }, { label: 'Раздавить', hint: 'Получить обломки', kind: 'material', value: 3 }] },
    { title: 'Росток звона', npc: 'severin', description: 'Северин слышит звон вашего прежнего решения сквозь камень.', choices: [{ label: 'Следовать звону', hint: 'Получить предмет', kind: 'item', value: 1 }, { label: 'Заглушить его', hint: 'Получить лечение', kind: 'heal', value: 12 }] },
  ] },
  { id: 'nameless-door', steps: [
    { title: 'Дверь без имени', npc: 'severin', description: 'Северин просит назвать дверь именем того, кого вы готовы забыть.', choices: [{ label: 'Назвать своим', hint: 'Рискнуть', kind: 'gamble', value: 12 }, { label: 'Оставить безымянной', hint: 'Сохранить тайну', kind: 'score', value: 9 }] },
    { title: 'Имя за дверью', npc: 'rook', description: 'Грач стоит по другую сторону и повторяет ваш прежний ответ слово в слово.', choices: [{ label: 'Ответить честно', hint: 'Получить благословение', kind: 'boon', value: 1 }, { label: 'Солгать снова', hint: 'Дар с ценой', kind: 'curse', value: 1 }] },
  ] },
]

export function nextWorldMemoryEvent(hero: Hero, rng: SeededRng): ExpeditionEvent | null {
  if (!rng.chance(.68)) return null
  const followups = chains.filter((chain) => hero.decisionFlags[`chain:${chain.id}`] === 1)
  const fresh = chains.filter((chain) => hero.decisionFlags[`chain:${chain.id}`] === undefined)
  const chain = followups.length ? rng.pick(followups) : fresh.length ? rng.pick(fresh) : null
  if (!chain) return null
  const stepIndex = hero.decisionFlags[`chain:${chain.id}`] === 1 ? 1 : 0
  const step = chain.steps[stepIndex]
  return { title: step.title, description: `${recurringNpcs[step.npc as keyof typeof recurringNpcs]}: ${step.description}`, icon: stepIndex ? '↻' : '✦', category: 'traveler', choices: step.choices }
}

export function recordWorldMemoryChoice(hero: Hero, eventTitle: string, choiceIndex: number): string {
  const chain = chains.find((candidate) => candidate.steps.some((step) => step.title === eventTitle))
  if (!chain) return ''
  const stepIndex = chain.steps.findIndex((step) => step.title === eventTitle)
  const step = chain.steps[stepIndex]
  hero.decisionFlags[`chain:${chain.id}`] = stepIndex === 0 ? 1 : 2
  hero.decisionFlags[`choice:${chain.id}:${stepIndex}`] = choiceIndex
  hero.npcRelations[step.npc] = (hero.npcRelations[step.npc] ?? 0) + (choiceIndex === 0 ? 1 : -1)
  return stepIndex === 0
    ? ` ${recurringNpcs[step.npc as keyof typeof recurringNpcs]} запомнит этот выбор.`
    : ` Это прямое следствие решения в событии «${chain.steps[0].title}». Цепочка завершена.`
}

export function worldMemoryJournal(hero: Hero): Array<{ id: string; state: 'open' | 'complete' }> {
  const journal: Array<{ id: string; state: 'open' | 'complete' }> = []
  for (const chain of chains) {
    const value = hero.decisionFlags[`chain:${chain.id}`]
    if (value === 1) journal.push({ id: chain.id, state: 'open' })
    if (value === 2) journal.push({ id: chain.id, state: 'complete' })
  }
  return journal
}
