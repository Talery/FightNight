import { ArrowLeft, Sparkles } from 'lucide-react'
import { contentRegistry } from '../game/registry'
import type { GameState } from '../game/types'
import type { GameDispatch } from '../ui/types'
import { Tooltip } from '../components/Tooltip'
import { PerkArt } from '../components/game/PerkArt'
import { assetRegistry } from '../assets/registry'
import type { CSSProperties } from 'react'
import type { Hero, PerkDefinition } from '../game/types'

const branchNames = { strength: 'Сила', agility: 'Ловкость', luck: 'Удача', defense: 'Защита', survival: 'Выживание', trade: 'Торговля', curse: 'Проклятия' } as const
const talentArt = assetRegistry.scenes.locations.talents
type TalentBranchId = keyof typeof branchNames

export function TalentScreen({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const hero = state.hero!
  const branches = Object.entries(branchNames) as Array<[keyof typeof branchNames, string]>
  const backView = state.expedition ? 'expedition' : 'hub'
  const backLabel = state.expedition ? 'Вернуться к походу' : 'Вернуться в убежище'
  return <div className="location-screen screen-pad talent-screen" style={{ '--location-art': `url(${talentArt})` } as CSSProperties}>
    <header className="screen-heading"><button className="icon-button" aria-label={backLabel} onClick={() => dispatch({ type: 'NAVIGATE', view: backView })}><ArrowLeft /></button><span className="heading-icon"><Sparkles /></span><div><small>ОДНА ЖИЗНЬ · БЕЗ СБРОСА</small><h1>Печать развития</h1><p>Каждые три уровня Печать принимает новый знак. Продвигайся от внешних ветвей к их вершинам.</p></div></header>
    <div className="talent-legend"><span className="owned">✓ Изучено</span><span className="offered">Доступно сейчас</span><span>Не изучено</span></div>
    <div className="talent-sigil">
      <svg className="talent-sigil-lines" viewBox="0 0 1000 760" preserveAspectRatio="none" aria-hidden="true">
        <circle className="sigil-ring outer" cx="500" cy="274" r="270" />
        <circle className="sigil-ring inner" cx="500" cy="274" r="122" />
        <path className="sigil-trunk" d="M500 705 C470 590 530 455 500 274" />
        <path d="M500 274 C410 230 320 155 220 105" />
        <path d="M500 274 C590 230 680 155 780 105" />
        <path d="M500 274 C365 304 285 326 200 330" />
        <path d="M500 274 C635 304 715 326 800 330" />
        <path d="M500 274 C405 390 320 520 215 575" />
        <path d="M500 274 C595 390 680 520 785 575" />
        <path d="M500 274 C500 430 500 575 500 680" />
        <path className="sigil-roots" d="M500 705 C430 690 390 716 330 735 M500 705 C570 690 610 716 670 735" />
        {[['220', '105'], ['780', '105'], ['200', '330'], ['800', '330'], ['215', '575'], ['785', '575'], ['500', '680']].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" />)}
      </svg>
      <div className="talent-core" aria-label={`Уровень ${hero.level}. Изучено знаков: ${hero.perks.length}`}><Sparkles /><small>УРОВЕНЬ</small><strong>{hero.level}</strong><span>{hero.perks.length} знаков</span></div>
      {branches.map(([branch, label]) => <TalentBranch key={branch} branch={branch} label={label} hero={hero} offered={state.perkChoices} />)}
    </div>
  </div>
}

function TalentBranch({ branch, label, hero, offered }: { branch: TalentBranchId; label: string; hero: Hero; offered: string[] }) {
  const perks = contentRegistry.perks.filter((perk) => perk.branch === branch)
  if (!perks.length) return null
  return <section className={`talent-branch branch-${branch}`}><h2>{label}</h2><div>{perks.map((perk) => <TalentNode key={perk.id} perk={perk} hero={hero} offered={offered.includes(perk.id)} />)}</div></section>
}

function TalentNode({ perk, hero, offered }: { perk: PerkDefinition; hero: Hero; offered: boolean }) {
  const owned = hero.perks.includes(perk.id)
  const reachable = (perk.requires ?? []).every((id) => hero.perks.includes(id))
  const status = owned ? 'Изучено' : offered ? 'Доступно для выбора' : reachable ? 'Не изучено' : 'Заблокировано'
  return <Tooltip text={`${perk.name} · ${status}. ${perk.description}`}><span tabIndex={0} aria-label={`${perk.name}. ${status}`} className={owned ? 'owned' : offered ? 'offered' : reachable ? 'reachable' : 'locked'}><b><PerkArt perk={perk} /></b><small>{perk.tier}</small></span></Tooltip>
}
