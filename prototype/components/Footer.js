// Shared Footer component
window.SiteFooter = function() {
  return React.createElement('footer', { style: {
    backgroundColor: 'rgb(36,35,35)',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
    padding: '32px 0',
    marginTop: 'auto',
  }},
    React.createElement('div', { style: {
      maxWidth: 1440, margin: '0 auto', padding: '0 48px',
      display: 'grid', gridTemplateColumns: '200px 1fr 1fr',
      gap: 40, boxSizing: 'border-box', alignItems: 'start',
    }},
      // Col 1 - logo
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }},
        React.createElement('img', { src: 'assets/logo_footer.png', alt: 'Острый край', style: { width: 120, height: 120, objectFit: 'contain' }}),
        React.createElement('span', { style: { fontSize: 16, color: '#fff', textAlign: 'center' }}, '2024 © Заточка Орел')
      ),
      // Col 2 - contacts + socials
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 }},
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 }},
          React.createElement('a', { href: 'tel:+79103043040', style: { display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none', fontSize: 18 }},
            React.createElement('img', { src: 'assets/phone_icon.png', style: { width: 20, height: 16, objectFit: 'contain', filter: 'invert(1)' }}),
            '+7 (910) 304-30-40'
          ),
          React.createElement('a', { href: 'mailto:zatochka_test@yandex.ru', style: { display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none', fontSize: 18 }},
            React.createElement('img', { src: 'assets/email_icon.png', style: { width: 20, height: 16, objectFit: 'contain', filter: 'invert(1)' }}),
            'zatochka_test@yandex.ru'
          )
        ),
        React.createElement('div', { style: { display: 'flex', gap: 14, marginTop: 8 }},
          ['VK', 'TG', 'WA'].map(s => React.createElement('div', { key: s, style: {
            width: 42, height: 42, borderRadius: '50%', backgroundColor: 'rgb(0,186,250)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff',
          }}, s))
        )
      ),
      // Col 3 - schedule + legal
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 }},
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 20, fontWeight: 500, marginBottom: 6 }}, 'График работы'),
          React.createElement('div', { style: { fontSize: 18, lineHeight: 1.6 }}, 'ПН-ПТ: 10:00–18:00'),
          React.createElement('div', { style: { fontSize: 18, lineHeight: 1.6 }}, 'СБ-ВС: Выходной')
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 }},
          React.createElement('a', { href: '#', style: { color: 'rgb(0,186,250)', fontSize: 16, textDecoration: 'none' }}, 'Публичная оферта'),
          React.createElement('span', { style: { color: '#aaa', fontSize: 14 }}, 'ИП Бельцев В. А.  ИНН: 575207208997')
        )
      )
    )
  );
};
