// Shared Header component
window.SiteHeader = function({ activePage }) {
  const pages = [
    { label: 'Главная', href: 'index.html' },
    { label: 'Услуги', href: 'services.html' },
    { label: 'Галерея', href: 'gallery.html' },
    { label: 'О нас', href: 'about.html' },
    { label: 'Магазин', href: 'shop.html' },
  ];
  return React.createElement('header', { style: {
    backgroundColor: '#fff',
    boxShadow: '0 1px 0 #e0e0e0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
  }},
    React.createElement('div', { style: {
      height: 110, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 48px', maxWidth: 1440, margin: '0 auto', width: '100%', boxSizing: 'border-box',
    }},
      React.createElement('a', { href: 'index.html', style: { display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }},
        React.createElement('img', { src: 'assets/logo.png', alt: 'Острый край', style: { width: 90, height: 90, objectFit: 'contain' } })
      ),
      React.createElement('nav', { style: { display: 'flex', gap: 8, alignItems: 'center' }},
        pages.map(p => React.createElement('a', {
          key: p.href,
          href: p.href,
          style: {
            display: 'inline-block',
            padding: '10px 18px',
            borderRadius: 10,
            backgroundColor: activePage === p.label ? 'rgb(0,186,250)' : 'transparent',
            border: activePage === p.label ? '3px solid rgb(0,186,250)' : '3px solid transparent',
            color: activePage === p.label ? '#fff' : '#000',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            textDecoration: 'none',
            transition: 'all .15s',
          },
          onMouseEnter: e => { if (activePage !== p.label) { e.target.style.backgroundColor = 'rgba(0,186,250,0.1)'; } },
          onMouseLeave: e => { if (activePage !== p.label) { e.target.style.backgroundColor = 'transparent'; } },
        }, p.label))
      ),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 }},
        React.createElement('a', { href: 'tel:+79103043040', style: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#000', fontSize: 16, fontFamily: 'Inter, sans-serif' }},
          React.createElement('img', { src: 'assets/phone_icon.png', style: { width: 20, height: 16, objectFit: 'contain' }}),
          '+7 (910) 304-30-40'
        ),
        React.createElement('a', { href: 'mailto:zatochka_test@yandex.ru', style: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#000', fontSize: 16, fontFamily: 'Inter, sans-serif' }},
          React.createElement('img', { src: 'assets/email_icon.png', style: { width: 20, height: 16, objectFit: 'contain' }}),
          'zatochka_test@yandex.ru'
        )
      )
    ),
    React.createElement('div', { style: { height: 20, backgroundColor: 'rgb(0,186,250)' }})
  );
};
