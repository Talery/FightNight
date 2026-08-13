import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowLeft,
  Axe,
  Backpack,
  Bolt,
  Bone,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  Crown,
  Diamond,
  Droplets,
  Eye,
  Flame,
  Footprints,
  Gem,
  Hand,
  Heart,
  Hexagon,
  Map,
  Orbit,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Timer,
  Zap,
} from 'lucide-react'
import hero from '../assets/dark-fighters/hero-0.webp'
import heroAlt from '../assets/dark-fighters/hero-3.webp'
import enemy from '../assets/dark-fighters/enemy-1.webp'
import enemyAlt from '../assets/dark-fighters/enemy-4.webp'
import arena from '../assets/biomes/catacombs/combat.webp'
import route from '../assets/biomes/catacombs/route.webp'
import blade from '../assets/items-v2/blade.webp'
import armor from '../assets/items-v2/armor.webp'
import bomb from '../assets/items-v2/bomb.webp'
import heal from '../assets/items-v2/heal.webp'
import relic from '../assets/items-v2/relic.webp'
import './concepts.css'

type Concept = {
  id: string
  number: string
  name: string
  genre: string
  thesis: string
  changes: string[]
  color: string
}

const concepts: Concept[] = [
  {
    id: 'body',
    number: '01',
    name: 'Живой поединок',
    genre: 'DIEGETIC COMBAT',
    thesis: 'Никакого интерфейсного шкафа. Игрок читает стойку врага и атакует прямо по его телу.',
    changes: ['зоны удара на персонаже', 'радиальное оружие', 'прогноз стойки в мире'],
    color: '#ff593d',
  },
  {
    id: 'deck',
    number: '02',
    name: 'Колода шрамов',
    genre: 'COMBAT DECKBUILDER',
    thesis: 'Вся боевая система превращается в сборку руки, цепочек и последствий на следующие ходы.',
    changes: ['карты приёмов вместо кнопок', 'видимая очередь врага', 'комбо из мастей тела'],
    color: '#efbd58',
  },
  {
    id: 'board',
    number: '03',
    name: 'Арена охоты',
    genre: 'TACTICAL POSITIONING',
    thesis: 'Бой становится короткой тактической головоломкой: дистанция, укрытия, направление и контроль пространства.',
    changes: ['поле из узлов', 'направление атаки', 'окружение как оружие'],
    color: '#79e2bd',
  },
  {
    id: 'fighter',
    number: '04',
    name: 'Последний раунд',
    genre: 'DARK ARCADE FIGHTER',
    thesis: 'Рогалик ощущается как жёсткий файтинг: темп, контрудары, комбо и огромная сценическая подача.',
    changes: ['реактивная шкала темпа', 'комбинации клавиш', 'контратака по таймингу'],
    color: '#fe3d7f',
  },
  {
    id: 'ritual',
    number: '05',
    name: 'Чёрная литургия',
    genre: 'RITUAL STRATEGY',
    thesis: 'Каждый ход — ритуал: игрок связывает руны, платит кровью и заранее видит цену решения.',
    changes: ['круг вместо панели', 'ресурсы как жертвы', 'ход собирается из трёх рун'],
    color: '#b594ff',
  },
]

const Bar = ({ value, className = '' }: { value: number; className?: string }) => (
  <span className={`rv-bar ${className}`}><i style={{ width: `${value}%` }} /></span>
)

const RuneButton = ({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) => (
  <button className={active ? 'is-active' : ''}>{icon}<span>{label}</span></button>
)

function BodyConcept() {
  return (
    <div className="rv-screen rv-body" style={{ '--scene': `url(${arena})` } as React.CSSProperties}>
      <div className="body-atmosphere" />
      <header className="body-top">
        <button className="body-back"><ArrowLeft /> ПОХОД</button>
        <div className="body-run"><small>ПОДБРЮШЬЕ ЧЁРНОЙ ЦИТАДЕЛИ</small><b>ЗАСАДА · ХОД 02</b></div>
        <div className="body-threat"><Eye /><span>СТОЙКА ПРОЧИТАНА</span><b>64%</b></div>
      </header>

      <div className="body-health body-health--hero">
        <span>БОРИС ПОСЛЕДНИЙ ЗУБ</span><b>61</b><Bar value={68} /><small>ВЫН. ◆◆◆◇</small>
      </div>
      <div className="body-health body-health--enemy">
        <span>БРОГ КОСТОЛОМ</span><b>74</b><Bar value={74} className="enemy" /><small>КРОВОТЕЧЕНИЕ ×2</small>
      </div>

      <img className="body-hero" src={hero} alt="Борис Последний Зуб" />
      <div className="body-enemy-wrap">
        <img className="body-enemy" src={enemy} alt="Брог Костолом" />
        <button className="body-target body-target--head"><Crosshair /><span>ГОЛОВА</span><b>22</b></button>
        <button className="body-target body-target--torso"><Crosshair /><span>КОРПУС</span><b>18</b></button>
        <button className="body-target body-target--legs"><Crosshair /><span>НОГИ</span><b>14</b></button>
      </div>

      <div className="body-prediction">
        <span>ПРОГНОЗ</span><i /><b>ВРАГ МЕТИТ В НОГИ</b><Footprints />
      </div>

      <div className="body-wheel">
        <button className="body-wheel-item wheel-fast"><Zap /><span>БЫСТРО</span></button>
        <button className="body-wheel-item wheel-heavy"><Axe /><span>ТЯЖЕЛО</span></button>
        <button className="body-wheel-item wheel-feint"><Eye /><span>ФИНТ</span></button>
        <button className="body-wheel-core"><Swords /><span>УДАР</span><small>−2 ◆</small></button>
      </div>
      <div className="body-hint">НАВЕДИТЕ НА ЧАСТЬ ТЕЛА · УДЕРЖИВАЙТЕ ДЛЯ ПРОГНОЗА</div>
    </div>
  )
}

type CombatCardProps = { suit: string; title: string; cost: number; text: string; tone: string; icon: ReactNode; selected?: boolean }
function CombatCard({ suit, title, cost, text, tone, icon, selected }: CombatCardProps) {
  return (
    <button className={`deck-card ${selected ? 'is-selected' : ''}`} style={{ '--card': tone } as React.CSSProperties}>
      <small>{suit}</small><b>{cost}</b><div className="deck-card-icon">{icon}</div><strong>{title}</strong><p>{text}</p><span>ПЕРЕТАЩИТЬ В ЦЕПЬ</span>
    </button>
  )
}

function DeckConcept() {
  return (
    <div className="rv-screen rv-deck">
      <header className="deck-top">
        <div className="deck-brand"><Diamond /><b>КОЛОДА ШРАМОВ</b><span>ЗАБЕГ 07</span></div>
        <div className="deck-resource"><Heart /><b>61</b><span>/ 82</span></div>
        <div className="deck-resource is-gold"><Gem /><b>3</b><span>фокуса</span></div>
        <button><Backpack /> 18</button>
      </header>

      <main className="deck-table">
        <section className="deck-enemy-zone" style={{ '--scene': `url(${arena})` } as React.CSSProperties}>
          <div className="deck-enemy-copy"><small>НАМЕРЕНИЕ ВРАГА</small><strong>СЛОМАТЬ СТОЙКУ</strong><p>18 урона · корпус</p></div>
          <img src={enemyAlt} alt="Брог Костолом" />
          <div className="deck-enemy-name"><span>БРОГ КОСТОЛОМ</span><b>74</b><Bar value={74} className="enemy" /></div>
          <div className="deck-intent"><Shield /><span>БЛОК</span><b>12</b></div>
          <div className="deck-intent is-next"><Axe /><span>СЛЕДОМ</span><b>?</b></div>
        </section>

        <section className="deck-chain">
          <div className="deck-chain-label"><span>ЦЕПЬ ХОДА</span><small>Соберите до трёх карт</small></div>
          <div className="deck-chain-slot filled"><Zap /><b>ВСКРЫТИЕ</b><small>−6 брони</small></div>
          <div className="deck-chain-link">+</div>
          <div className="deck-chain-slot"><span>2</span><small>следующая карта</small></div>
          <div className="deck-chain-link">+</div>
          <div className="deck-chain-slot"><span>3</span><small>финал цепи</small></div>
          <div className="deck-total"><small>ПРОГНОЗ</small><b>14–22</b><span>УРОНА</span></div>
          <button className="deck-play"><Bolt /> РАЗЫГРАТЬ</button>
        </section>

        <section className="deck-hand">
          <div className="deck-draw"><span>КОЛОДА</span><b>12</b></div>
          <CombatCard suit="ГОЛОВА · АТАКА" title="Клевец" cost={1} text="+40% урона по оглушённому" tone="#c34435" icon={<Axe />} />
          <CombatCard suit="КОРПУС · ТЕХНИКА" title="Вскрытие" cost={1} text="Снимает 6 брони. Даёт метку." tone="#d49b3d" icon={<Zap />} selected />
          <CombatCard suit="СТОЙКА · ЗАЩИТА" title="Глухой блок" cost={1} text="Блок 14. Сохраните 1 фокус." tone="#628b87" icon={<Shield />} />
          <CombatCard suit="НОГИ · ФИНТ" title="Подсечка" cost={2} text="Срывает следующий приём врага." tone="#7458a5" icon={<Footprints />} />
          <CombatCard suit="КРОВЬ · РИСК" title="Красный долг" cost={0} text="Потеряйте 5 здоровья. Возьмите 2." tone="#9c2949" icon={<Droplets />} />
          <div className="deck-discard"><span>СБРОС</span><b>4</b></div>
        </section>
      </main>
    </div>
  )
}

const boardCells = [
  { x: 1, y: 1, kind: 'wall' }, { x: 2, y: 1 }, { x: 3, y: 1, kind: 'fire' }, { x: 4, y: 1 }, { x: 5, y: 1 },
  { x: 1, y: 2 }, { x: 2, y: 2, kind: 'hero' }, { x: 3, y: 2, kind: 'range' }, { x: 4, y: 2 }, { x: 5, y: 2, kind: 'enemy' },
  { x: 1, y: 3 }, { x: 2, y: 3, kind: 'move' }, { x: 3, y: 3, kind: 'move' }, { x: 4, y: 3, kind: 'hazard' }, { x: 5, y: 3 },
  { x: 1, y: 4, kind: 'wall' }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4, kind: 'exit' },
]

function BoardConcept() {
  return (
    <div className="rv-screen rv-board" style={{ '--scene': `url(${route})` } as React.CSSProperties}>
      <header className="board-top">
        <div><small>ТАКТИЧЕСКАЯ СХВАТКА</small><b>АРЕНА ОХОТЫ</b></div>
        <div className="board-objective"><Target /><span>ЦЕЛЬ</span><b>Сломите Брога до обвала</b></div>
        <div className="board-round"><span>РАУНД</span><b>02</b><small>ДО ОБВАЛА: 4</small></div>
      </header>

      <aside className="board-initiative">
        <span>ПОРЯДОК ХОДА</span>
        <div className="is-current"><img src={hero} alt="" /><b>БОРИС</b><small>СЕЙЧАС</small></div>
        <div><img src={enemy} alt="" /><b>БРОГ</b><small>12</small></div>
        <div><Flame /><b>ОБВАЛ</b><small>08</small></div>
      </aside>

      <main className="board-field">
        <div className="board-grid">
          {boardCells.map((cell) => (
            <button
              className={`board-cell ${cell.kind ? `is-${cell.kind}` : ''}`}
              style={{ '--x': cell.x, '--y': cell.y } as React.CSSProperties}
              key={`${cell.x}-${cell.y}`}
              aria-label={`Ячейка ${cell.x}, ${cell.y}`}
            >
              {cell.kind === 'hero' && <><img src={hero} alt="Борис" /><i /><span>БОРИС</span></>}
              {cell.kind === 'enemy' && <><img src={enemy} alt="Брог" /><i /><span>БРОГ</span></>}
              {cell.kind === 'fire' && <Flame />}
              {cell.kind === 'hazard' && <Skull />}
              {cell.kind === 'exit' && <Crown />}
              {cell.kind === 'move' && <CircleDot />}
            </button>
          ))}
          <svg className="board-attack-line" viewBox="0 0 500 400" preserveAspectRatio="none"><path d="M155 155 C245 110 330 105 430 150" /><path d="M410 136 L432 150 L407 162" /></svg>
          <div className="board-damage-preview"><Crosshair /><b>72%</b><span>18–24 УРОНА</span></div>
        </div>
      </main>

      <aside className="board-inspector">
        <small>ВЫБРАНО</small><h2>Круговой выпад</h2><p>Атака по дуге на две клетки. Отталкивает цель к опасной зоне.</p>
        <div><span>ТОЧНОСТЬ</span><b>72%</b></div><Bar value={72} />
        <div><span>УРОН</span><b>18–24</b></div><Bar value={58} className="damage" />
        <div className="board-cost"><Footprints /> 2 хода <Diamond /> 1 выносливость</div>
        <button className="board-confirm"><Target /> ПРИМЕНИТЬ</button>
      </aside>

      <footer className="board-actions">
        <RuneButton icon={<Footprints />} label="ШАГ" />
        <RuneButton icon={<Swords />} label="ВЫПАД" active />
        <RuneButton icon={<Shield />} label="СТОЙКА" />
        <RuneButton icon={<Axe />} label="ТОЛЧОК" />
        <RuneButton icon={<Backpack />} label="ПРЕДМЕТ" />
        <div className="board-ap"><span>ОЧКИ ДЕЙСТВИЯ</span><b>◆ ◆ ◇</b></div>
      </footer>
    </div>
  )
}

function FighterConcept() {
  return (
    <div className="rv-screen rv-fighter" style={{ '--scene': `url(${arena})` } as React.CSSProperties}>
      <div className="fight-rays" />
      <header className="fight-hud">
        <div className="fight-player">
          <img src={heroAlt} alt="" /><div><small>ОБРЕЧЁННЫЙ 08</small><b>БОРИС</b><Bar value={64} /><span>◆◆◆◇ ВЫН.</span></div>
        </div>
        <div className="fight-round"><span>ROUND</span><b>2</b><small>ПЕРВАЯ КРОВЬ</small></div>
        <div className="fight-player fight-player--enemy">
          <img src={enemyAlt} alt="" /><div><small>КОСТОЛОМ 09</small><b>БРОГ</b><Bar value={73} className="enemy" /><span>ЯРОСТЬ ◆◆◇</span></div>
        </div>
      </header>

      <div className="fight-stage">
        <img className="fight-char fight-char--hero" src={heroAlt} alt="Борис" />
        <img className="fight-char fight-char--enemy" src={enemyAlt} alt="Брог" />
        <div className="fight-hit"><span>COUNTER</span><b>14</b><small>УРОНА</small></div>
        <div className="fight-combo"><span>3</span><b>HIT</b><small>×1.45</small></div>
        <div className="fight-read"><Eye /> НИЗКАЯ АТАКА</div>
      </div>

      <footer className="fight-controls">
        <div className="fight-moves">
          <small>ДОСТУПНЫЕ СВЯЗКИ</small>
          <button><kbd>Q</kbd><kbd>Q</kbd><kbd>E</kbd><span><b>РВАНАЯ РАНА</b><small>быстро · кровь</small></span></button>
          <button className="is-hot"><kbd>↓</kbd><kbd>W</kbd><kbd>E</kbd><span><b>ПОДСЕЧКА</b><small>контрит верх</small></span></button>
          <button><kbd>R</kbd><span><b>ТЯЖЁЛЫЙ</b><small>бронебойный</small></span></button>
        </div>
        <div className="fight-timing"><span>ОКНО КОНТРАТАКИ</span><div><i /><b /></div><small>НАЖМИТЕ <kbd>E</kbd> В ЗЕЛЁНОЙ ЗОНЕ</small></div>
        <div className="fight-keys"><RuneButton icon={<Shield />} label="Q БЛОК" /><RuneButton icon={<Swords />} label="E УДАР" active /><RuneButton icon={<Zap />} label="R СИЛЬНО" /></div>
      </footer>
      <div className="fight-title">ПОСЛЕДНИЙ<br />РАУНД</div>
    </div>
  )
}

const ritualNodes = [
  { id: 'blood', label: 'КРОВЬ', icon: <Droplets />, angle: 270, active: true },
  { id: 'bone', label: 'КОСТЬ', icon: <Bone />, angle: 330, active: true },
  { id: 'ash', label: 'ПЕПЕЛ', icon: <Flame />, angle: 30, active: true },
  { id: 'eye', label: 'ОКО', icon: <Eye />, angle: 90 },
  { id: 'iron', label: 'ЖЕЛЕЗО', icon: <Shield />, angle: 150 },
  { id: 'void', label: 'ПУСТОТА', icon: <Orbit />, angle: 210 },
]

function RitualConcept() {
  return (
    <div className="rv-screen rv-ritual">
      <div className="ritual-grain" />
      <header className="ritual-top">
        <div><small>ПЕПЕЛЬНЫЙ КРУГ · ЛИТУРГИЯ VII</small><b>СОБЕРИТЕ ПРИГОВОР</b></div>
        <div className="ritual-turn"><span>ХОД</span><b>II</b></div>
        <div><small>ЦЕНА РИТУАЛА</small><b className="ritual-price"><Heart /> −5 <Diamond /> −2</b></div>
      </header>

      <aside className="ritual-hero">
        <div className="ritual-portrait"><img src={hero} alt="Борис" /></div>
        <small>ПРИЗЫВАЮЩИЙ</small><h2>Борис<br />Последний Зуб</h2>
        <div><span>ПЛОТЬ</span><b>61 / 82</b></div><Bar value={68} />
        <div><span>ВОЛЯ</span><b>3 / 5</b></div><Bar value={60} className="will" />
        <p>«Каждый приговор оставляет шрам на том, кто его произнёс».</p>
      </aside>

      <main className="ritual-circle">
        <svg viewBox="0 0 500 500" aria-hidden="true">
          <circle cx="250" cy="250" r="198" /><circle cx="250" cy="250" r="132" /><circle cx="250" cy="250" r="72" />
          <path className="ritual-path" d="M250 52 L421 348 L79 348 Z" />
          <path className="ritual-path is-hot" d="M250 448 L79 152 L421 152 Z" />
        </svg>
        {ritualNodes.map((node) => {
          const radius = 39
          const x = 50 + radius * Math.cos((node.angle - 90) * Math.PI / 180)
          const y = 50 + radius * Math.sin((node.angle - 90) * Math.PI / 180)
          return <button className={`ritual-node ${node.active ? 'is-active' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} key={node.id}>{node.icon}<span>{node.label}</span></button>
        })}
        <button className="ritual-core"><Skull /><span>ПРОИЗНЕСТИ</span><b>«РАСКОЛ ПЛОТИ»</b></button>
        <div className="ritual-chain"><span><Droplets /> КРОВЬ</span><i>+</i><span><Bone /> КОСТЬ</span><i>+</i><span><Flame /> ПЕПЕЛ</span></div>
      </main>

      <aside className="ritual-enemy">
        <div className="ritual-portrait"><img src={enemy} alt="Брог" /></div>
        <small>ПРИГОВОРЁННЫЙ</small><h2>Брог<br />Костолом</h2>
        <div><span>ПЛОТЬ</span><b>74 / 100</b></div><Bar value={74} className="enemy" />
        <div className="ritual-prophecy"><Eye /><span>ИСХОД</span><b>24–31 урона</b><small>35%: немота на 2 хода</small></div>
      </aside>

      <footer className="ritual-footer"><span>ОТМЕНИТЬ РУНУ</span><i>КРУГ НЕ ЗАВЕРШЁН</i><span>КНИГА СОЧЕТАНИЙ · 18</span></footer>
    </div>
  )
}

const conceptScreens: Record<string, ReactNode> = {
  body: <BodyConcept />, deck: <DeckConcept />, board: <BoardConcept />, fighter: <FighterConcept />, ritual: <RitualConcept />,
}

export default function ConceptGallery() {
  const [active, setActive] = useState(0)
  const concept = concepts[active]
  const move = (direction: number) => setActive((current) => (current + direction + concepts.length) % concepts.length)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="rv-page" style={{ '--concept': concept.color } as React.CSSProperties}>
      <header className="rv-gallery-head">
        <a href="/" aria-label="Вернуться в игру"><ArrowLeft /> ИГРА</a>
        <div><small>ПЕПЕЛЬНЫЙ КРУГ · RADICAL REWORK</small><b>Пять разных игр из одной боевой системы</b></div>
        <span><b>{concept.number}</b> / 05</span>
      </header>

      <div className="rv-showcase">
        <aside className="rv-description">
          <span className="rv-concept-label">КОНЦЕПТ {concept.number}</span>
          <h1>{concept.name}</h1>
          <small>{concept.genre}</small>
          <p>{concept.thesis}</p>
          <ul>{concept.changes.map((change) => <li key={change}>{change}</li>)}</ul>
          <div className="rv-radical"><Activity /><span><b>МЕНЯЕТСЯ НЕ СКИН,</b><br />А СПОСОБ ИГРАТЬ</span></div>
        </aside>

        <div className="rv-frame">
          <div className="rv-frame-head"><span>PLAYABLE DIRECTION</span><i /><b>{concept.genre}</b></div>
          <div className="rv-frame-body">{conceptScreens[concept.id]}</div>
        </div>
      </div>

      <nav className="rv-nav" aria-label="Выбор концепта">
        <button className="rv-nav-arrow" onClick={() => move(-1)} aria-label="Предыдущий концепт"><ChevronLeft /></button>
        {concepts.map((item, index) => (
          <button className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} key={item.id}>
            <span>{item.number}</span><div><b>{item.name}</b><small>{item.genre}</small></div>
          </button>
        ))}
        <button className="rv-nav-arrow" onClick={() => move(1)} aria-label="Следующий концепт"><ChevronRight /></button>
      </nav>
    </div>
  )
}
