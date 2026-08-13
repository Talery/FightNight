import type { BiomeDefinition, BossAura, BossDefinition, EnemyArchetypeDefinition, EnemyBehaviorProfile, EnemyFactionDefinition, EquipSlot, EventCategory, HeroMutationDefinition, ItemAffix, ItemSetDefinition, PerkDefinition, StatBlock, Zone } from './types'

export const zones: Record<Zone, string> = {
  head: 'Голова',
  body: 'Корпус',
  legs: 'Ноги',
}

export const slotNames: Record<EquipSlot, string> = {
  weapon: 'Оружие',
  head: 'Голова',
  armor: 'Доспех',
  gloves: 'Перчатки',
  boots: 'Сапоги',
  trinket: 'Талисман',
}

const baseFirstNames = [
  'Арден', 'Варг', 'Морвен', 'Эйра', 'Кайр', 'Торвальд', 'Сив', 'Роган', 'Нера', 'Хольм',
  'Ильва', 'Крэг', 'Веспер', 'Бран', 'Астрид', 'Грейв', 'Лисса', 'Рун', 'Тарн', 'Мара',
]
const nameStems = ['Альд', 'Борг', 'Вел', 'Грим', 'Дор', 'Ерн', 'Жар', 'Зор', 'Ир', 'Кел', 'Лор', 'Мир', 'Норд', 'Орм', 'Пир', 'Рав', 'Скар', 'Тир', 'Уль', 'Фар', 'Хар', 'Цер', 'Шад', 'Яр']
const nameEndings = ['ан', 'вар', 'рик', 'мир', 'вель']
export const firstNames = [...new Set([...baseFirstNames, ...nameStems.flatMap((stem) => nameEndings.map((ending) => `${stem}${ending}`))])]

export const funnyNames = [
  'Глеб Не-Трогай', 'Сэр Хруст Коленный', 'Угрюм Пельменный', 'Пахом Без Сдачи',
  'Борис Последний Зуб', 'Федот Опять Не Тот', 'Жора Два Топора',
]

const baseEpithets = [
  'Пепельный', 'Безымянная', 'Костолом', 'из Чёрной Ямы', 'Собиратель Шрамов', 'Непрощённая',
  'Медвежья Длань', 'Шепчущий Стали', 'Последний из Норда', 'Голодная Тень', 'Сын Бури',
  'Дочь Ворона', 'Несломленный', 'Смеющаяся в Тени', 'с Медным Сердцем',
]
const epithetSubjects = ['Пепла', 'Шрамов', 'Ворона', 'Соли', 'Цепей', 'Тумана', 'Костей', 'Колокола', 'Чёрной Воды', 'Холодной Стали', 'Последнего Огня', 'Мёртвой Звезды', 'Слепой Луны', 'Красной Пыли', 'Немой Бури']
const epithetForms = ['вестник', 'гонец', 'наследник', 'страж', 'паломник', 'свидетель', 'палач', 'изгнанник']
export const epithets = [...new Set([...baseEpithets, ...epithetSubjects.flatMap((subject) => epithetForms.map((form) => `${form} ${subject}`))])]

const baseEnemyNames = [
  'Рик', 'Мира', 'Горн', 'Сайла', 'Тесак', 'Вельд', 'Кора', 'Ним', 'Одо', 'Фарра',
  'Кнут', 'Искра', 'Брог', 'Хель', 'Молчун', 'Распорядитель', 'Лом', 'Тирса',
]
const enemyStems = ['Бр', 'Вор', 'Гар', 'Драк', 'Ел', 'Жр', 'Зар', 'Кр', 'Лат', 'Мор', 'Нар', 'Ор', 'Пал', 'Рот', 'Сол', 'Тар']
const enemyEndings = ['ог', 'иса', 'вен', 'ра', 'хор', 'дун']
export const enemyNames = [...new Set([...baseEnemyNames, ...enemyStems.flatMap((stem) => enemyEndings.map((ending) => `${stem}${ending}`))])]

const baseEnemyTitles = [
  'могильный задира', 'беглая инквизиторша', 'псарня Безликого', 'ветеран соляных войн',
  'охотник за долгами', 'паломник красной луны', 'аренный мясник', 'собиратель трофеев',
  'последний страж', 'слепой дуэлянт', 'пепельный наёмник', 'бывший королевский палач',
]
const titleRoles = ['страж', 'охотник', 'палач', 'дуэлянт', 'сборщик', 'мясник', 'паломник', 'судья']
const titleObjects = ['соли', 'долгов', 'пепла', 'могил', 'вороньих клятв', 'колокольного звона', 'чумных вод', 'старой арены']
export const enemyTitles = [...new Set([...baseEnemyTitles, ...titleRoles.flatMap((role) => titleObjects.map((object) => `${role} ${object}`))])]

export const enemyTraits = [
  ['Кровопускатель', 'Первый попавший удар наносит больше урона.'],
  ['Черепаха', 'Толстая броня, но медленные атаки.'],
  ['Змеиный шаг', 'Чаще уклоняется от тяжёлых ударов.'],
  ['Берсерк', 'Становится опаснее, потеряв половину здоровья.'],
  ['Дурной глаз', 'Немного снижает удачу противника.'],
  ['Дуэлянт', 'Получает преимущество при повторе вашей зоны атаки.'],
]

export const enemyMutations = [
  ['Толстокожий', 'На 22% больше здоровья.', 'hp'],
  ['Закованный', '+2 брони.', 'armor'],
  ['Бешеный', '+2 силы удара.', 'power'],
  ['Проворный', '+2 ловкости.', 'agility'],
  ['Окровавленный', '+12% силы, но за него дают больше очков.', 'frenzy'],
  ['Пустоглазый', '+10% здоровья и +1 брони.', 'hollow'],
] as const

export const enemyFactions: EnemyFactionDefinition[] = [
  { id: 'chain', name: 'Орден Цепей', description: 'Закованные стражи и сборщики долгов.' },
  { id: 'salt', name: 'Соляные изгнанники', description: 'Наёмники, иссушенные белой пылью.' },
  { id: 'ash', name: 'Пепельный двор', description: 'Дворцовые мертвецы и их живые слуги.' },
  { id: 'mire', name: 'Чумной выводок', description: 'Твари болот и носители яда.' },
  { id: 'bell', name: 'Секта колокола', description: 'Шахтёры, слышащие чужой звон.' },
  { id: 'raven', name: 'Вороний круг', description: 'Дуэлянты, воры и слепые пророки.' },
]

export const enemyArchetypes: EnemyArchetypeDefinition[] = [
  { id: 'tank', name: 'Танк', description: 'Живучий и бронированный.', hpMultiplier: 1.25, powerMultiplier: 0.9, armorBonus: 3, agilityBonus: -1 },
  { id: 'assassin', name: 'Убийца', description: 'Быстрый и опасный без блока.', hpMultiplier: 0.82, powerMultiplier: 1.12, armorBonus: 0, agilityBonus: 4 },
  { id: 'berserker', name: 'Берсерк', description: 'Становится опаснее после ранений.', hpMultiplier: 1.08, powerMultiplier: 1.2, armorBonus: 0, agilityBonus: 0 },
  { id: 'duelist', name: 'Дуэлянт', description: 'Читает повторяющиеся удары.', hpMultiplier: 0.94, powerMultiplier: 1.05, armorBonus: 1, agilityBonus: 2 },
  { id: 'ranger', name: 'Стрелок', description: 'Давит точными выпадами.', hpMultiplier: 0.9, powerMultiplier: 1.08, armorBonus: 0, agilityBonus: 3 },
  { id: 'mystic', name: 'Мистик', description: 'Использует мистический урон.', hpMultiplier: 0.95, powerMultiplier: 1.1, armorBonus: 1, agilityBonus: 1 },
]

export const enemyBehaviorProfiles: EnemyBehaviorProfile[] = [
  { archetypeId: 'tank', description: 'Выдерживает обмен и отвечает тяжёлым ударом после проверки защиты.', patterns: [
    { id: 'guard-counter', trigger: 'after-guarded', weight: 4, sequence: ['strike', 'crushingBlow'], zones: ['body', 'head'] },
    { id: 'steady-pressure', trigger: 'default', weight: 2, sequence: ['strike', 'strike', 'crushingBlow'], zones: ['body', 'body', 'head'] },
  ] },
  { archetypeId: 'assassin', description: 'Чередует быстрые выпады и ядовитые серии, наказывая повтор.', patterns: [
    { id: 'marked-cut', trigger: 'player-repeat', weight: 4, sequence: ['strike', 'venomousCut'], zones: ['legs', 'head'] },
    { id: 'double-feint', trigger: 'default', weight: 2, sequence: ['venomousCut', 'strike', 'venomousCut'], zones: ['head', 'legs', 'body'] },
  ] },
  { archetypeId: 'berserker', description: 'После промаха или ранения ускоряет тяжёлую серию.', patterns: [
    { id: 'miss-rage', trigger: 'after-miss', weight: 5, sequence: ['crushingBlow', 'strike'], zones: ['head', 'body'] },
    { id: 'blood-rush', trigger: 'low-health', weight: 4, sequence: ['strike', 'crushingBlow', 'crushingBlow'], zones: ['body', 'head', 'head'] },
    { id: 'wild-swing', trigger: 'default', weight: 2, sequence: ['strike', 'crushingBlow'], zones: ['body', 'head'] },
  ] },
  { archetypeId: 'duelist', description: 'Проверяет защиту и меняет ритм против повторяющихся решений.', patterns: [
    { id: 'repeat-punish', trigger: 'player-repeat', weight: 5, sequence: ['strike', 'crushingBlow'], zones: ['body', 'head'] },
    { id: 'measured-three', trigger: 'default', weight: 3, sequence: ['strike', 'venomousCut', 'strike'], zones: ['legs', 'body', 'head'] },
  ] },
  { archetypeId: 'ranger', description: 'Сначала пристреливается, затем проводит ядовитый выпад.', patterns: [
    { id: 'hunter-mark', trigger: 'opening', weight: 4, sequence: ['strike', 'venomousCut'], zones: ['body', 'legs'] },
    { id: 'relocate-shot', trigger: 'default', weight: 3, sequence: ['strike', 'strike', 'venomousCut'], zones: ['head', 'body', 'legs'] },
  ] },
  { archetypeId: 'mystic', description: 'Телеграфирует особый приём и меняет цикл вместе с фазой.', patterns: [
    { id: 'ritual-burst', trigger: 'default', weight: 3, sequence: ['strike', 'arcaneBurst'], zones: ['body', 'head'] },
    { id: 'phase-ritual', trigger: 'phase-shift', weight: 5, sequence: ['arcaneBurst', 'strike', 'arcaneBurst'], zones: ['head', 'body', 'legs'] },
  ] },
]

const traitRoots = ['Кровавый', 'Костяной', 'Слепой', 'Голодный', 'Соляной', 'Пепельный', 'Цепной', 'Чумной', 'Чёрный', 'Медный']
const traitRoles = ['палач', 'страж', 'охотник', 'пророк', 'дуэлянт', 'мясник']
export const expandedEnemyTraits: Array<[string, string]> = traitRoots.flatMap((root) => traitRoles.map((role): [string, string] => [`${root} ${role}`, `${root} ${role} меняет привычный ритм боя.`]))

const mutationRoots = ['Толстокожий', 'Закованный', 'Бешеный', 'Проворный', 'Окровавленный', 'Пустоглазый', 'Костяной', 'Соляной', 'Воронёный', 'Чумной']
const mutationEffects = ['hp', 'armor', 'power', 'agility', 'frenzy', 'hollow'] as const
export const expandedEnemyMutations: Array<[string, string, typeof mutationEffects[number]]> = mutationRoots.flatMap((root, rootIndex) => Array.from({ length: 8 }, (_, index): [string, string, typeof mutationEffects[number]] => [
  `${root} ${index + 1}`, `${root} мутация меняет параметры противника.`, mutationEffects[(rootIndex + index) % mutationEffects.length],
]))

const bossRows: Array<[string, string, string, BossAura]> = [
  ['debt-judge', 'Судья Долга', 'владелец последней расписки', 'chain'], ['salt-matron', 'Соляная Матрона', 'мать белой пыли', 'salt'], ['ash-king', 'Король Пепла', 'сидящий на пустом троне', 'ash'], ['mire-mouth', 'Пасть Топи', 'собиратель костей', 'mire'], ['bell-father', 'Отец Колокола', 'слышащий глубже шахт', 'bell'], ['raven-duke', 'Вороний Герцог', 'дуэлянт без лица', 'raven'], ['chain-sister', 'Сестра Цепей', 'хранительница клейм', 'chain'], ['salt-giant', 'Соляной Великан', 'раздавивший караван', 'salt'], ['ash-bride', 'Пепельная Невеста', 'невеста пустого двора', 'ash'], ['mire-abbot', 'Топяной Аббат', 'пастырь чумы', 'mire'], ['bell-warden', 'Смотритель Шахты', 'страж последнего звонка', 'bell'], ['raven-seer', 'Вороний Провидец', 'видевший твоё имя', 'raven'],
]

export const bosses: BossDefinition[] = bossRows.map(([id, name, title, faction]) => ({ id, name, title, faction, aura: faction, portraitAsset: id, description: `${name} проходит через три боевые фазы.` }))

export const expeditionPlaces = [
  'Катакомбы Ржавых Святых', 'Провал Голода', 'Затонувший Острог', 'Костяной Тракт',
  'Подбрюшье Чёрной Цитадели', 'Шахты Глухого Колокола', 'Монастырь Пустых Лиц',
  'Соляные Ямы', 'Тропа Последнего Факела', 'Колодец Семи Приговоров',
]

export const expeditionConditions = [
  ['Кровавая луна', 'Враги бьют сильнее, награды богаче.'],
  ['Гнилой воздух', 'Лечение в походе ослаблено.'],
  ['Звон цепей', 'Элитные враги встречаются раньше.'],
  ['Благословение ворона', 'Удача чаще влияет на добычу.'],
  ['Долгая ночь', 'Враги живучее, но за них дают больше опыта.'],
  ['Пепельный дождь', 'Все начинают бой слегка раненными.'],
]

export const biomes: BiomeDefinition[] = [
  { id: 'catacombs', name: 'Катакомбы', description: 'Камень гасит лечение, но хранит схроны.', routeArt: 'catacombs', combatArt: 'catacombs', eventArt: 'catacombs', enemyHpMultiplier: 1.05, enemyPowerMultiplier: 1, healingMultiplier: 0.85 },
  { id: 'salt', name: 'Соляные ямы', description: 'Сухой воздух режет раны, враги хрупче.', routeArt: 'salt', combatArt: 'salt', eventArt: 'salt', enemyHpMultiplier: 0.92, enemyPowerMultiplier: 1.08, healingMultiplier: 0.72 },
  { id: 'citadel', name: 'Чёрная цитадель', description: 'Стражи носят тяжёлую броню и не прощают ошибок.', routeArt: 'citadel', combatArt: 'citadel', eventArt: 'citadel', enemyHpMultiplier: 1.16, enemyPowerMultiplier: 1.08, healingMultiplier: 1 },
  { id: 'marsh', name: 'Чумные топи', description: 'Яд здесь почти живой.', routeArt: 'marsh', combatArt: 'marsh', eventArt: 'marsh', enemyHpMultiplier: 1, enemyPowerMultiplier: 1.12, healingMultiplier: 0.9 },
  { id: 'monastery', name: 'Монастырь пустых лиц', description: 'Тишина благоволит осторожным.', routeArt: 'monastery', combatArt: 'monastery', eventArt: 'monastery', enemyHpMultiplier: 1.08, enemyPowerMultiplier: 0.96, healingMultiplier: 1.08 },
  { id: 'mines', name: 'Шахты колокола', description: 'Узкие ходы усиливают сокрушающие удары.', routeArt: 'mines', combatArt: 'mines', eventArt: 'mines', enemyHpMultiplier: 1.1, enemyPowerMultiplier: 1.1, healingMultiplier: 0.95 },
  { id: 'coast', name: 'Чёрный берег', description: 'Ветер несёт удачу и режет как стекло.', routeArt: 'coast', combatArt: 'coast', eventArt: 'coast', enemyHpMultiplier: 0.96, enemyPowerMultiplier: 1.04, healingMultiplier: 1.04 },
  { id: 'garden', name: 'Сад мёртвых свечей', description: 'Свет лечит живых и зовёт старые клятвы.', routeArt: 'garden', combatArt: 'garden', eventArt: 'garden', enemyHpMultiplier: 1.04, enemyPowerMultiplier: 1.02, healingMultiplier: 1.16 },
]

export const runBoons = [
  { id: 'red-hand', name: 'Красная длань', description: '+14% к наносимому урону до конца похода.', tone: 'boon', stat: 'heroPower', value: 0.14 },
  { id: 'stone-prayer', name: 'Каменная молитва', description: '+2 брони до конца похода.', tone: 'boon', stat: 'heroArmor', value: 2 },
  { id: 'kind-embers', name: 'Добрые угли', description: 'Лечение в походе сильнее на 35%.', tone: 'boon', stat: 'healing', value: 0.35 },
  { id: 'raven-eye', name: 'Глаз ворона', description: '+3 удачи для событий и добычи.', tone: 'boon', stat: 'luck', value: 3 },
  { id: 'witness-mark', name: 'Метка свидетеля', description: '+18% рейтинговых очков.', tone: 'boon', stat: 'score', value: 0.18 },
] as const

export const runCurses = [
  { id: 'hungry-dark', name: 'Голодная тьма', description: 'Враги наносят на 15% больше урона.', tone: 'curse', stat: 'enemyPower', value: 0.15 },
  { id: 'bone-moon', name: 'Костяная луна', description: 'У врагов на 18% больше здоровья.', tone: 'curse', stat: 'enemyHp', value: 0.18 },
  { id: 'cold-ash', name: 'Холодный пепел', description: 'Лечение слабее на 30%.', tone: 'curse', stat: 'healing', value: -0.3 },
  { id: 'crooked-fate', name: 'Кривая судьба', description: '−3 удачи в событиях и добыче.', tone: 'curse', stat: 'luck', value: -3 },
] as const

export const perks: PerkDefinition[] = [
  { id: 'iron-hide', name: 'Железная кожа', description: 'Первый полученный в бою удар наносит на 40% меньше урона.', icon: '⬡', branch: 'defense', tier: 1 },
  { id: 'grave-luck', name: 'Могильная удача', description: 'При создании трофея удача считается на 4 выше.', icon: '◆', branch: 'luck', tier: 1 },
  { id: 'wolf-sinew', name: 'Волчьи жилы', description: 'Тяжёлые удары наносят на 15% больше урона.', icon: '牙', branch: 'strength', tier: 1 },
  { id: 'rat-step', name: 'Крысиный шаг', description: 'Шанс заранее прочитать намерение врага повышен на 20%.', icon: '〽', branch: 'agility', tier: 1 },
  { id: 'blood-price', name: 'Цена крови', description: 'Открывает приём «Кровопускание»: +35% урона и сильное кровотечение на 3 хода.', icon: '滴', branch: 'curse', tier: 1 },
  { id: 'second-breath', name: 'Второе дыхание', description: 'Открывает приём «Второе дыхание»: мгновенно возвращает 2 выносливости.', icon: '♨', branch: 'survival', tier: 1 },
  { id: 'scavenger', name: 'Падальщик', description: 'Продажа вещей приносит на 30% больше.', icon: '♜', branch: 'trade', tier: 1 },
  { id: 'thick-blood', name: 'Густая кровь', description: 'Лечебные расходники восстанавливают на 50% больше здоровья.', icon: '♥', branch: 'survival', tier: 2 },
  { id: 'executioner', name: 'Палач', description: 'Удары в голову чаще критические.', icon: '†', branch: 'strength', tier: 2 },
  { id: 'loaded-dice', name: 'Кости шулера', description: 'События с риском чаще заканчиваются удачно.', icon: '⚄', branch: 'luck', tier: 2 },
  { id: 'hard-lesson', name: 'Жестокий урок', description: '+20% опыта на сложности 6 и выше.', icon: '✦', branch: 'trade', tier: 2 },
  { id: 'last-word', name: 'Последнее слово', description: 'Один раз переживает смертельный удар с 1 HP.', icon: '☗', branch: 'curse', tier: 2 },
]

type TreePerk = Omit<PerkDefinition, 'id' | 'branch' | 'tier' | 'requires'>

const talentBranches: Array<[NonNullable<PerkDefinition['branch']>, TreePerk[]]> = [
  ['strength', [
    { name: 'Пролом', description: 'Тяжёлые удары игнорируют 3 брони противника.', icon: '⚔' },
    { name: 'Ломатель брони', description: 'Открывает приём «Ломатель брони»: защита цели снижается на 3 хода.', icon: '裂' },
    { name: 'Запах слабости', description: 'Тяжёлые удары наносят на 35% больше урона раненым ниже половины здоровья.', icon: '牙' },
  ]],
  ['agility', [
    { name: 'Ложный выпад', description: 'Финт больше не расходует выносливость.', icon: '〽' },
    { name: 'Ритм защиты', description: 'Угаданный блок возвращает 1 выносливость.', icon: '◇' },
    { name: 'Ответ тени', description: 'Уклонение немедленно ранит противника на 25% силы его удара.', icon: '↯' },
  ]],
  ['luck', [
    { name: 'Скользящее лезвие', description: 'Промах с вероятностью 35% превращается в скользящий удар с 40% урона.', icon: '⚄' },
    { name: 'Счастливый темп', description: 'Критический удар возвращает 1 выносливость.', icon: '✦' },
    { name: 'Два жребия', description: 'После победы добыча бросается дважды — остаётся более редкий предмет.', icon: '♢' },
  ]],
  ['defense', [
    { name: 'Глухая стойка', description: 'Угаданный блок пропускает лишь 12% урона вместо 22%.', icon: '⬡' },
    { name: 'Шипастый щит', description: 'Угаданный блок возвращает противнику 25% нанесённого урона.', icon: '♜' },
    { name: 'Чистый заслон', description: 'Угаданный блок не позволяет вражескому удару наложить состояние.', icon: '⊘' },
  ]],
  ['survival', [
    { name: 'Горькая кровь', description: 'Кровотечение, яд и горение наносят вдвое меньше урона.', icon: '♥' },
    { name: 'Жажда жизни', description: 'После победы восстанавливается 12% недостающего здоровья.', icon: '♨' },
    { name: 'Не сегодня', description: 'При здоровье ниже четверти входящий урон уменьшается на 25%.', icon: '☗' },
  ]],
  ['trade', [
    { name: 'Доля победителя', description: 'Победы приносят на 15% больше золота.', icon: '♜' },
    { name: 'Бережливый алхимик', description: 'Расходник с вероятностью 35% не исчезает после использования.', icon: '⚗' },
    { name: 'Право на трофей', description: 'Элитные противники и боссы дают ещё один бросок добычи.', icon: '♛' },
  ]],
]

export const treePerks: PerkDefinition[] = talentBranches.flatMap(([branch, nodes]) => nodes.map((node, index) => {
  const tier = index + 1
  return { ...node, id: `tree-${branch}-${tier}`, branch, tier, requires: tier > 1 ? [`tree-${branch}-${tier - 1}`] : [] }
}))

perks.push(...treePerks)

export const heroMutations: HeroMutationDefinition[] = [
  { id: 'ashen-lungs', name: 'Пепельные лёгкие', description: '+12 здоровья, но голос навсегда пахнет гарью.', statBonus: { maxHp: 12 } },
  { id: 'iron-bone', name: 'Железная кость', description: '+2 брони.', statBonus: { armor: 2 } },
  { id: 'raven-eye', name: 'Глаз ворона', description: '+2 удачи.', statBonus: { luck: 2 } },
  { id: 'red-tendon', name: 'Красная жила', description: '+2 силы.', statBonus: { strength: 2 } },
  { id: 'shadow-joint', name: 'Теневой сустав', description: '+2 ловкости.', statBonus: { agility: 2 } },
  { id: 'hollow-heart', name: 'Пустое сердце', description: '+8 здоровья и +1 брони.', statBonus: { maxHp: 8, armor: 1 } },
]

export const eventCategories = ['altar', 'traveler', 'trap', 'cache', 'curse', 'trade', 'strange-place', 'creature'] as const satisfies readonly EventCategory[]

export const eventTemplates = [
  {
    title: 'Колодец без эха', icon: '◉', category: 'strange-place' as EventCategory,
    description: 'На дне сухого колодца блестит монета. Верёвка выглядит старше местных костей.',
    choices: [
      ['Спуститься', 'Риск ради добычи', 'gamble', 22],
      ['Бросить свою монету', '−8 золота, но круг любит жертвы', 'score', 18],
    ],
  },
  {
    title: 'Раненый картограф', icon: '⌖', category: 'traveler' as EventCategory,
    description: 'Человек прижимает карту к груди и предлагает сделку, пока ещё способен говорить.',
    choices: [
      ['Перевязать', 'Отдать немного сил', 'hurt', 7],
      ['Забрать карту', 'Получить очки пути', 'score', 24],
    ],
  },
  {
    title: 'Стол трёх свечей', icon: '♨', category: 'altar' as EventCategory,
    description: 'На каменном столе горят три свечи. Одна пахнет мёдом, другая железом, третья — дождём.',
    choices: [
      ['Погасить железную', 'Восстановить здоровье', 'heal', 18],
      ['Погасить дождевую', 'Попытать удачу', 'item', 1],
      ['Не трогать', 'Небольшая награда за благоразумие', 'gold', 10],
    ],
  },
  {
    title: 'Дверь с зубами', icon: '▥', category: 'curse' as EventCategory,
    description: 'Каменная дверь просит назвать самое страшное поражение. Она явно умеет чуять ложь.',
    choices: [
      ['Ответить честно', 'Боль и ценный урок', 'hurt', 9],
      ['Солгать убедительно', 'Проверка удачи', 'gamble', 28],
    ],
  },
  {
    title: 'Клетка звездочёта', icon: '✦', category: 'traveler' as EventCategory,
    description: 'В железной клетке сидит старик и утверждает, что уже видел твою смерть. Купить другую он не предлагает.',
    choices: [
      ['Попросить подробности', 'Получить очки, но услышать лишнее', 'score', 26],
      ['Сломать замок', 'Проверка удачи и возможная добыча', 'gamble', 31],
    ],
  },
  {
    title: 'Река чёрного молока', icon: '≈', category: 'strange-place' as EventCategory,
    description: 'Тёплая белёсая вода течёт против уклона. На другом берегу лежит чья-то сумка.',
    choices: [
      ['Перейти вброд', 'Потерять здоровье, но заработать очки', 'hurt', 8],
      ['Идти вдоль берега', 'Небольшая безопасная прибыль', 'gold', 13],
    ],
  },
  {
    title: 'Чужая корона', icon: '♛', category: 'curse' as EventCategory,
    description: 'Корона висит в воздухе над грудой мокрого пепла. Внутри обода кто-то царапает ногтями.',
    choices: [
      ['Надеть', 'Сильный дар и новое проклятие', 'curse', 1],
      ['Разрубить', 'Получить рейтинговые очки', 'score', 34],
    ],
  },
] as const

export type ItemNameAgreement = 'masculine' | 'feminine' | 'neuter' | 'plural'
export interface ItemNoun { text: string; agreement: ItemNameAgreement }
export interface ItemMaterial { masculine: string; feminine: string; neuter: string; plural: string }

export const itemParts: Record<EquipSlot, { nouns: ItemNoun[]; icons: string[] }> = {
  weapon: { nouns: ['клинок', 'секач', 'молот', 'шип', 'фальшион'].map((text) => ({ text, agreement: 'masculine' })), icons: ['†', '⚔', 'ϟ'] },
  head: { nouns: [['шлем', 'masculine'], ['личина', 'feminine'], ['капюшон', 'masculine'], ['венец', 'masculine'], ['бацинет', 'masculine']].map(([text, agreement]) => ({ text, agreement })) as ItemNoun[], icons: ['⌂', '♙', '◈'] },
  armor: { nouns: [['бригантина', 'feminine'], ['кираса', 'feminine'], ['куртка', 'feminine'], ['кольчуга', 'feminine'], ['панцирь', 'masculine']].map(([text, agreement]) => ({ text, agreement })) as ItemNoun[], icons: ['♜', '▦', '⬡'] },
  gloves: { nouns: ['наручи', 'перчатки', 'когти', 'обмотки', 'рукавицы'].map((text) => ({ text, agreement: 'plural' })), icons: ['✊', '≋', '爪'] },
  boots: { nouns: ['сапоги', 'поножи', 'скороходы', 'башмаки', 'ступни'].map((text) => ({ text, agreement: 'plural' })), icons: ['♟', '〽', '⌁'] },
  trinket: { nouns: [['печать', 'feminine'], ['кость', 'feminine'], ['амулет', 'masculine'], ['осколок', 'masculine'], ['медальон', 'masculine']].map(([text, agreement]) => ({ text, agreement })) as ItemNoun[], icons: ['◆', '◉', '✦'] },
}

export const itemMaterials: ItemMaterial[] = [
  ['ржавый', 'ржавая', 'ржавое', 'ржавые'], ['костяной', 'костяная', 'костяное', 'костяные'],
  ['вороний', 'воронья', 'воронье', 'вороньи'], ['угольный', 'угольная', 'угольное', 'угольные'],
  ['серебряный', 'серебряная', 'серебряное', 'серебряные'], ['соляной', 'соляная', 'соляное', 'соляные'],
  ['могильный', 'могильная', 'могильное', 'могильные'], ['багровый', 'багровая', 'багровое', 'багровые'],
  ['лунный', 'лунная', 'лунное', 'лунные'], ['цепной', 'цепная', 'цепное', 'цепные'],
  ['чумной', 'чумная', 'чумное', 'чумные'], ['ведьмин', 'ведьмина', 'ведьмино', 'ведьмины'],
].map(([masculine, feminine, neuter, plural]) => ({ masculine, feminine, neuter, plural }))

export const itemSuffixes = [
  'должника', 'безымянного', 'из Ямы', 'тихой казни', 'последнего караула', 'слепой ярости',
  'вороньего часа', 'пепельного паломника', 'сбитых костяшек', 'семи зарубок',
]

const affixNames: Record<keyof StatBlock, string[]> = {
  strength: ['костолома', 'палача', 'красной длани', 'каменного удара'],
  agility: ['скорохода', 'теневого шага', 'лёгкой руки', 'прыгуна'],
  luck: ['ворона', 'шулера', 'слепой звезды', 'счастливого черепа'],
  armor: ['стража', 'закалённой стали', 'старой чешуи', 'железной молитвы'],
  maxHp: ['густой крови', 'живучести', 'долгой зимы', 'неумирания'],
}

const statNames: Record<keyof StatBlock, string> = { strength: 'Сила', agility: 'Ловкость', luck: 'Удача', armor: 'Броня', maxHp: 'Здоровье' }

export const itemAffixes: ItemAffix[] = (Object.entries(affixNames) as Array<[keyof StatBlock, string[]]>).flatMap(([stat, names]) => names.flatMap((name, nameIndex) => [1, 2, 3, 4, 5, 6].map((tier) => ({
  id: `${stat}-${nameIndex}-${tier}`, name: `Дар ${name}`, description: `Даёт ${statNames[stat]} +${stat === 'maxHp' ? tier * 3 : tier}.`, stat,
  value: stat === 'maxHp' ? tier * 3 : tier,
}))))

export const cursedAffixes: ItemAffix[] = (Object.keys(affixNames) as Array<keyof StatBlock>).map((stat) => ({
  id: `curse-${stat}`, name: `Проклятие утраты`, description: `${statNames[stat]} снижается.`, stat, value: stat === 'maxHp' ? -9 : -2, cursed: true,
}))

export const itemSets: ItemSetDefinition[] = [
  { id: 'raven', name: 'Убор ворона', required: 2, bonus: { luck: 3 }, description: '2 предмета: +3 удачи.' },
  { id: 'chain', name: 'Цепи должника', required: 2, bonus: { armor: 3 }, description: '2 предмета: +3 брони.' },
  { id: 'ash', name: 'Пепельная кожа', required: 2, bonus: { maxHp: 14 }, description: '2 предмета: +14 здоровья.' },
  { id: 'red', name: 'Красный обет', required: 2, bonus: { strength: 3 }, description: '2 предмета: +3 силы.' },
]

const relicNames = ['Корона без лица', 'Зеркало палача', 'Колокол пепла', 'Кость пророка', 'Сердце кургана', 'Чёрная нить', 'Ключ без двери', 'Соль забвения']
export const uniqueRelics = relicNames.flatMap((name, index) => (['strength', 'agility', 'luck', 'armor', 'maxHp'] as Array<keyof StatBlock>).map((stat, offset) => ({
  id: `relic-${index}-${stat}`, name, stat, value: stat === 'maxHp' ? 22 + offset : 4 + (offset % 3), description: `Уникальная реликвия «${name}».`,
})))

export const questVerbs = [
  'Утихомирить глубины', 'Собрать кровавую пошлину', 'Вернуть долг трактирщику',
  'Проверить старую карту', 'Оборвать цепь исчезновений', 'Оставить знак Круга',
]

const questStarts = ['Разоблачить', 'Охранять', 'Вернуть', 'Сжечь', 'Выследить', 'Освободить', 'Похоронить', 'Собрать', 'Остановить', 'Пережить', 'Сломать', 'Услышать']
const questTargets = ['старый долг', 'кровавый караван', 'цепного стража', 'вороний знак', 'соль из раны', 'имя должника', 'пепельный приказ', 'звон под землёй', 'письмо без печати']
export const questTemplates = questStarts.flatMap((start) => questTargets.map((target) => `${start} ${target}`))

export const generatedEventTemplates = Array.from({ length: 150 }, (_, index) => ({
  title: questTemplates[index % questTemplates.length], category: eventCategories[index % eventCategories.length],
  icon: ['◉', '⌖', '♨', '▥'][index % 4], description: `Случай «${questTemplates[index % questTemplates.length].toLowerCase()}» меняет ход этого похода.`,
  choices: [['Вмешаться', 'Риск ради очков', 'hurt', 5 + index % 6], ['Пройти мимо', 'Получить немного золота', 'gold', 7 + index % 8]] as [string, string, 'hurt' | 'gold', number][],
}))
