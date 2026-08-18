export type NickColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const nickColorClass: Record<NickColor, string> = {
  1: 'text-nick-1',
  2: 'text-nick-2',
  3: 'text-nick-3',
  4: 'text-nick-4',
  5: 'text-nick-5',
  6: 'text-nick-6',
  7: 'text-nick-7',
  8: 'text-nick-8',
};

export const nickBgClass: Record<NickColor, string> = {
  1: 'bg-nick-1',
  2: 'bg-nick-2',
  3: 'bg-nick-3',
  4: 'bg-nick-4',
  5: 'bg-nick-5',
  6: 'bg-nick-6',
  7: 'bg-nick-7',
  8: 'bg-nick-8',
};

export const nickColors: NickColor[] = [1, 2, 3, 4, 5, 6, 7, 8];

export type Room = {
  id: string;
  floor: string;
  title: string;
  about: string;
  online: number;
  icon: string;
};

export const rooms: Room[] = [
  {
    id: 'kuhnya',
    floor: '01',
    title: 'Кухня',
    about: 'Кто идёт за хлебом, чей суп выкипел и почему опять пахнет жареным.',
    online: 42,
    icon: 'CookingPot',
  },
  {
    id: 'kurilka',
    floor: '02',
    title: 'Курилка',
    about: 'Разговоры ни о чём в час ночи. Главный этаж всей общаги.',
    online: 87,
    icon: 'Cigarette',
  },
  {
    id: 'baraholka',
    floor: '03',
    title: 'Барахолка',
    about: 'Отдам чайник, куплю стул, поменяю конспект на пельмени.',
    online: 23,
    icon: 'Tag',
  },
  {
    id: 'ucheba',
    floor: '04',
    title: 'Учёба',
    about: 'ТГУ, ТПУ, ТУСУР. Сессия, лабы, «а кто был на паре?».',
    online: 51,
    icon: 'GraduationCap',
  },
  {
    id: 'tomsk',
    floor: '05',
    title: 'Томск',
    about: 'Город на связи: где вкусно, где холодно, где играют вживую.',
    online: 64,
    icon: 'MapPin',
  },
  {
    id: 'noch',
    floor: '06',
    title: 'Ночная',
    about: 'Свет не выключаем. Тем, кому не спится в минус тридцать.',
    online: 18,
    icon: 'Moon',
  },
];

export type OnlineUser = {
  nick: string;
  color: NickColor;
  status: string;
};

export const onlineUsers: OnlineUser[] = [
  { nick: 'вахтёрша_зина', color: 1, status: 'после 23:00 не шуметь' },
  { nick: 'Кипяток', color: 2, status: 'чайник свободен' },
  { nick: 'south_park_312', color: 3, status: 'учу матан' },
  { nick: 'Люська', color: 4, status: 'ушла за хлебом' },
  { nick: 'DJ_Общага', color: 5, status: 'ставит винил' },
  { nick: 'первокур', color: 6, status: 'ищет комнату 412' },
  { nick: 'Тётя_Валя', color: 7, status: 'печёт пирожки' },
  { nick: 'ночной_сторож', color: 8, status: 'не спит с 2003' },
  { nick: 'Пельмень', color: 3, status: 'варит' },
  { nick: 'сессия_близко', color: 2, status: 'AFK' },
];

export type Message = {
  id: number;
  nick: string;
  color: NickColor;
  time: string;
  text: string;
  me?: boolean;
  system?: boolean;
};

export const roomMessages: Record<string, Message[]> = {
  kuhnya: [
    { id: 1, nick: 'система', color: 8, time: '21:02', text: 'Вы вошли на этаж 01 — Кухня', system: true },
    { id: 2, nick: 'Тётя_Валя', color: 7, time: '21:03', text: 'Пирожки на подоконнике, берите по два, не жадничайте' },
    { id: 3, nick: 'Кипяток', color: 2, time: '21:04', text: 'чайник свободен, налетай' },
    { id: 4, nick: 'Люська', color: 4, time: '21:06', text: 'кто идёт за хлебом? возьмите батон, отдам завтра' },
    { id: 5, nick: 'Пельмень', color: 3, time: '21:07', text: 'я иду. кому ещё что?' },
    { id: 6, nick: 'вахтёрша_зина', color: 1, time: '21:09', text: 'ПОСЛЕ 23:00 НА КУХНЕ ТИШИНА. Это не обсуждается.' },
  ],
  kurilka: [
    { id: 1, nick: 'система', color: 8, time: '00:41', text: 'Вы вошли на этаж 02 — Курилка', system: true },
    { id: 2, nick: 'ночной_сторож', color: 8, time: '00:42', text: 'опять никто не спит, я так и знал' },
    { id: 3, nick: 'DJ_Общага', color: 5, time: '00:44', text: 'включаю что-нибудь медленное, окей?' },
    { id: 4, nick: 'south_park_312', color: 3, time: '00:45', text: 'окей но не громко, у меня зачёт в 8' },
    { id: 5, nick: 'Кипяток', color: 2, time: '00:47', text: 'зачёт в 8 это не жизнь это подвиг' },
  ],
  baraholka: [
    { id: 1, nick: 'система', color: 8, time: '18:20', text: 'Вы вошли на этаж 03 — Барахолка', system: true },
    { id: 2, nick: 'первокур', color: 6, time: '18:21', text: 'отдам чайник, работает, свистит только громко' },
    { id: 3, nick: 'Люська', color: 4, time: '18:23', text: 'беру! в какой комнате?' },
    { id: 4, nick: 'первокур', color: 6, time: '18:23', text: '412, стучать три раза' },
  ],
  ucheba: [
    { id: 1, nick: 'система', color: 8, time: '12:10', text: 'Вы вошли на этаж 04 — Учёба', system: true },
    { id: 2, nick: 'сессия_близко', color: 2, time: '12:11', text: 'кто был на матане? скиньте фото доски' },
    { id: 3, nick: 'south_park_312', color: 3, time: '12:12', text: 'был. доска пустая, он весь час рассказывал про рыбалку' },
    { id: 4, nick: 'Пельмень', color: 3, time: '12:14', text: 'лучшая пара семестра честно говоря' },
  ],
  tomsk: [
    { id: 1, nick: 'система', color: 8, time: '19:05', text: 'Вы вошли на этаж 05 — Томск', system: true },
    { id: 2, nick: 'DJ_Общага', color: 5, time: '19:06', text: 'на Ленина сегодня играют вживую, кто идёт' },
    { id: 3, nick: 'Тётя_Валя', color: 7, time: '19:08', text: 'минус двадцать восемь, оденьтесь как люди' },
    { id: 4, nick: 'Кипяток', color: 2, time: '19:09', text: 'мам, мне 24' },
  ],
  noch: [
    { id: 1, nick: 'система', color: 8, time: '03:12', text: 'Вы вошли на этаж 06 — Ночная', system: true },
    { id: 2, nick: 'ночной_сторож', color: 8, time: '03:13', text: 'свет горит на всех этажах. как всегда.' },
    { id: 3, nick: 'первокур', color: 6, time: '03:20', text: 'а тут вообще кто-то спит?' },
    { id: 4, nick: 'вахтёрша_зина', color: 1, time: '03:21', text: 'я сплю. и вы спите. отбой.' },
  ],
};

export const autoReplies: { nick: string; color: NickColor; text: string }[] = [
  { nick: 'Кипяток', color: 2, text: 'о, новенький! чайник вон там' },
  { nick: 'вахтёрша_зина', color: 1, text: 'записала. комната будет за вами.' },
  { nick: 'DJ_Общага', color: 5, text: 'принято, ставлю следующую' },
  { nick: 'Тётя_Валя', color: 7, text: 'ты поел вообще сегодня?' },
  { nick: 'south_park_312', color: 3, text: '+1, полностью согласен' },
  { nick: 'ночной_сторож', color: 8, text: 'слышу тебя, этаж не спит' },
];

export const rules = [
  {
    q: 'Ник — это навсегда',
    a: 'Занял ник — он твой. Цвет ника выбираешь сам при регистрации, менять можно раз в сутки. По нику тебя узнают на всех этажах, поэтому выбирай тот, за который не стыдно в 3 ночи.',
  },
  {
    q: 'После 23:00 капсом не орут',
    a: 'ЗАГЛАВНЫМИ БУКВАМИ — это крик. Вахтёрша Зина мутит на час без предупреждения. Днём — на своё усмотрение, но соседи всё слышат.',
  },
  {
    q: 'Реклама — только на барахолке',
    a: 'Продаёшь стул, ищешь соседа, отдаёшь чайник — этаж 03. В остальных комнатах объявления удаляются, автор идёт мыть виртуальный коридор.',
  },
  {
    q: 'Свои разборки — в личку',
    a: 'Личные сообщения открыты для всех зарегистрированных. Ссориться на общем этаже — дурной тон, за это в общаге не любят.',
  },
  {
    q: 'Регистрация — 40 секунд',
    a: 'Ник, пароль, цвет. Почта по желанию — нужна только чтобы восстановить пароль, если забудешь. Никаких анкет и паспортных данных.',
  },
];

export const stats = [
  { value: '18 400', label: 'жильцов зарегистрировано' },
  { value: '6', label: 'этажей с комнатами' },
  { value: '2 300', label: 'сообщений за сутки' },
  { value: '24/7', label: 'свет горит всегда' },
];
