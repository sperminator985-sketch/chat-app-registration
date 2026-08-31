import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import Icon from '@/components/ui/icon';

const sections = [
  {
    title: 'Общие положения',
    body: 'Это соглашение регулирует использование сайта «Чат-Общага», который принадлежит Siberia Art Ltd. Регистрируясь и пользуясь сайтом, вы подтверждаете, что прочитали соглашение и согласны с ним. Не согласны — просто не пользуйтесь сайтом.',
  },
  {
    title: 'Что такое «Чат-Общага»',
    body: 'Это бесплатный развлекательный чат для общения. Мы предоставляем площадку и комнаты, но не участвуем в разговорах и не отвечаем за то, что пишут другие пользователи.',
  },
  {
    title: 'Регистрация и учётная запись',
    body: 'Один человек — одна учётная запись. Пароль и ответ на контрольный вопрос вы храните сами, за действия под своим ником отвечаете тоже сами. Ник должен быть приличным и не выдавать вас за другого человека или за администрацию.',
  },
  {
    title: 'Правила поведения',
    body: 'Запрещено: оскорбления и травля, разжигание вражды, порнография, пропаганда наркотиков и насилия, спам и реклама вне барахолки, публикация чужих личных данных, накрутка и попытки взлома сайта. Полный список бытовых правил — в разделе «Правила общаги».',
  },
  {
    title: 'Ваш контент',
    body: 'Всё, что вы публикуете, остаётся вашим. Размещая сообщения, фото и аватары, вы разрешаете нам показывать их другим пользователям сайта. Вы гарантируете, что имеете право публиковать этот материал.',
  },
  {
    title: 'Модерация',
    body: 'Администрация может удалить любое сообщение, отключить звук, временно или навсегда заблокировать учётную запись за нарушение правил — без предупреждения и без объяснения причин. Решение о блокировке можно обжаловать, написав администрации.',
  },
  {
    title: 'Ответственность',
    body: 'Сайт предоставляется «как есть». Мы не гарантируем бесперебойную работу и не отвечаем за возможный ущерб от использования сайта, потерю сообщений или действия других пользователей. Договорённости и сделки между пользователями — их личное дело.',
  },
  {
    title: 'Персональные данные',
    body: 'Как мы обрабатываем ваши данные, описано в политике конфиденциальности. Она является неотъемлемой частью этого соглашения.',
  },
  {
    title: 'Прекращение доступа',
    body: 'Вы можете в любой момент перестать пользоваться сайтом и попросить удалить учётную запись. Мы можем закрыть доступ пользователю, нарушающему это соглашение, а также прекратить работу сервиса, предупредив об этом на сайте.',
  },
  {
    title: 'Изменения соглашения',
    body: 'Мы можем менять условия. Актуальная версия всегда на этой странице, продолжение использования сайта означает согласие с обновлениями. Дата последнего обновления: 31 августа 2026 года.',
  },
];

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[900px] px-5 py-12 md:px-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 border-2 border-foreground/40 px-4 py-2 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
        >
          <Icon name="ArrowLeft" size={16} />
          На главную
        </Link>

        <h1 className="mt-8 break-words text-[clamp(1.6rem,4.6vw,2.9rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          Пользовательское <span className="text-primary">соглашение</span>
        </h1>
        <p className="mt-4 text-[clamp(0.86rem,1.4vw,1.05rem)] leading-[1.5] text-muted-foreground">
          Правила игры простым языком: что можно, что нельзя и кто за что отвечает в «Чат-Общаге».
        </p>

        <div className="mt-10 border-t-2 border-foreground/25">
          {sections.map((s, i) => (
            <section key={s.title} className="border-b-2 border-foreground/25 py-6">
              <h2 className="flex items-start gap-4 font-display text-base font-extrabold uppercase tracking-[-0.01em]">
                <span className="font-mono text-sm text-secondary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </h2>
              <p className="mt-3 pl-10 text-[1rem] leading-[1.55] text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-3 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          © 2026 Siberia Art Ltd.
          <Link
            to="/privacy"
            className="underline underline-offset-4 transition-colors hover:text-secondary"
          >
            Политика конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Terms;
