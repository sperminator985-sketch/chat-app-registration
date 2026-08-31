import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import Icon from '@/components/ui/icon';

const sections = [
  {
    title: 'Кто мы',
    body: 'Сайт «Чат-Общага» принадлежит и управляется компанией Siberia Art Ltd. Мы отвечаем за обработку персональных данных пользователей сайта и стараемся собирать их по минимуму.',
  },
  {
    title: 'Какие данные мы собираем',
    body: 'При регистрации — ник, пароль в зашифрованном виде, контрольный вопрос и ответ на него. По желанию — аватар, пол, возраст, город и текст о себе. Автоматически — IP-адрес, дата последнего входа и технические данные браузера.',
  },
  {
    title: 'Зачем нам эти данные',
    body: 'Чтобы создать вашу учётную запись, показывать вас другим жильцам в чате, восстанавливать доступ при потере пароля, защищать сайт от спама и нарушителей, а также считать общую статистику посещаемости.',
  },
  {
    title: 'Кому мы передаём данные',
    body: 'Никому. Мы не продаём, не сдаём в аренду и не передаём ваши данные третьим лицам, кроме случаев, прямо предусмотренных законом. Данные хранятся на серверах, расположенных на территории Российской Федерации.',
  },
  {
    title: 'Что видят другие пользователи',
    body: 'Ваш ник, аватар, указанные в профиле сведения и ваши сообщения в общих комнатах. Личные сообщения видны только вам и вашему собеседнику. Не публикуйте в чате то, что не хотите показывать посторонним.',
  },
  {
    title: 'Cookie и хранилище браузера',
    body: 'Мы используем cookie и локальное хранилище браузера, чтобы вы оставались авторизованы между визитами и чтобы запоминались ваши настройки — например, включён ли звук уведомлений.',
  },
  {
    title: 'Сколько мы храним данные',
    body: 'Пока существует ваша учётная запись. Если вы попросите удалить профиль, мы удалим ваши данные в течение 30 дней, кроме тех, которые обязаны хранить по закону.',
  },
  {
    title: 'Ваши права',
    body: 'Вы можете в любой момент изменить данные профиля, отозвать согласие на обработку и потребовать удаления учётной записи. Для этого напишите нам или обратитесь к администрации чата.',
  },
  {
    title: 'Дети',
    body: 'Сайт не предназначен для лиц младше 14 лет. Если нам станет известно, что учётная запись создана ребёнком младше указанного возраста, мы удалим её.',
  },
  {
    title: 'Изменения политики',
    body: 'Мы можем обновлять эту политику. Актуальная версия всегда доступна на этой странице. Дата последнего обновления: 31 августа 2026 года.',
  },
];

const Privacy = () => {
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
          Политика <span className="text-primary">конфиденциальности</span>
        </h1>
        <p className="mt-4 text-[clamp(0.86rem,1.4vw,1.05rem)] leading-[1.5] text-muted-foreground">
          Коротко и по делу: какие данные собирает «Чат-Общага», зачем они нужны и что вы можете с
          ними сделать.
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

        <p className="mt-8 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          © 2026 Siberia Art Ltd.
        </p>
      </div>
    </div>
  );
};

export default Privacy;