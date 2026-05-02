import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const db = drizzle(pool, { schema })

async function seed() {
  console.log('Seeding database...')

  // --- Service categories & items ---
  const categories = [
    {
      title: 'Маникюрный инструмент',
      items: [
        ['Кусачки ногтевые (кутикульные)', '400 ₽'],
        ['Ножницы маникюрные прямые', '400 ₽'],
        ['Ножницы маникюрные изогнутые', '400 ₽'],
        ['Ножницы для кутикулы', '350–400 ₽'],
        ['Пушер', '250 ₽'],
        ['Книпсер', '200 ₽'],
        ['Пинцет для ресниц', '200 ₽'],
        ['Твизер', '200 ₽'],
        ['Кусачки педикюрные', '450–500 ₽'],
      ],
    },
    {
      title: 'Парикмахерский инструмент',
      items: [
        ['Ножницы парикмахерские прямые', '400 ₽'],
        ['Ножницы филировочные', '450 ₽'],
        ['Ножевой блок машинки для стрижки', '500 ₽'],
      ],
    },
    {
      title: 'Грумерский инструмент',
      items: [
        ['Ножницы грумерские прямые', 'от 550 ₽'],
        ['Ножницы грумерские изогнутые', 'от 550 ₽'],
        ['Ножницы грумерские филировочные', 'от 500 ₽'],
        ['Нож грумерский', 'от 100 ₽'],
      ],
    },
    {
      title: 'Домашний инструмент',
      items: [
        ['Ножи кухонные', 'от 300 ₽'],
        ['Ножницы домашние', 'от 300 ₽'],
        ['Ножницы портновские', 'от 300 ₽'],
        ['Ножницы садовые', 'от 300 ₽'],
        ['Топор', 'от 300 ₽'],
        ['Лопата', 'от 150 ₽'],
        ['Стамеска', 'от 250 ₽'],
        ['Рубанок', 'от 300 ₽'],
        ['Пила ручная', 'от 150 ₽'],
        ['Секатор', 'от 100–300 ₽'],
        ['Садовые ножницы-кусторез', 'от 100–300 ₽'],
      ],
    },
    {
      title: 'Ремонт маникюрных аппаратов',
      items: [
        ['Диагностика', '200 ₽'],
        ['Чистка аппарата', '200 ₽'],
        ['Замена 2-х подшипников', '1 100 ₽'],
        ['Замена ротора', '500 ₽'],
        ['Замена платы управления', '2 000 ₽'],
        ['Замена сетевого шнура', '300 ₽'],
        ['Прочие ремонтные работы', 'от 250 ₽'],
      ],
    },
    {
      title: 'Ремонт другой техники',
      items: [
        ['Ремонт машинки для стрижки', 'от 600 ₽'],
        ['Ремонт УФ-лампы', 'от 500 ₽'],
        ['Ремонт фена', 'от 600 ₽'],
        ['Прочее оборудование', 'от 1 000 ₽'],
      ],
    },
  ]

  for (let i = 0; i < categories.length; i++) {
    const { title, items } = categories[i]
    const [cat] = await db
      .insert(schema.serviceCategories)
      .values({ title, sortOrder: i })
      .returning()

    for (let j = 0; j < items.length; j++) {
      await db.insert(schema.serviceItems).values({
        categoryId: cat.id,
        name: items[j][0],
        price: items[j][1],
        sortOrder: j,
      })
    }
  }

  // --- Service notes ---
  const notes = [
    'Исправление геометрии полотен после падения: +20% к стоимости работ.',
    'Реставрация инструмента после некорректной заточки: +50% к стоимости работ.',
    'Цены на заточку или ремонт оборудования могут быть изменены после оценки проделанной работы мастером. Клиент извещается об изменении цены по телефону или лично при посещении мастерской.',
  ]
  for (let i = 0; i < notes.length; i++) {
    await db.insert(schema.serviceNotes).values({ content: notes[i], sortOrder: i })
  }

  // --- Workers ---
  await db.insert(schema.workers).values([
    { name: 'Владимир', role: 'Мастер-заточник', photo: '/images/vladimir.png', sortOrder: 0 },
    { name: 'Александр', role: 'Мастер по ремонту оборудования', photo: '/images/alexander.png', sortOrder: 1 },
  ])

  // --- Gallery sections ---
  const sections = ['Наши работы', 'Фото выставок', 'Наши сертификаты']
  for (let i = 0; i < sections.length; i++) {
    await db.insert(schema.gallerySections).values({ title: sections[i], sortOrder: i })
  }

  // --- Site settings ---
  await db.insert(schema.siteSettings).values([
    { key: 'phone', value: '+7 (910) 304-30-40' },
    { key: 'phone_href', value: 'tel:+79103043040' },
    { key: 'email', value: 'zatochka_test@yandex.ru' },
    { key: 'address', value: 'г. Орёл, ул. Полесская д. 2' },
    { key: 'map_embed_url', value: 'https://yandex.ru/map-widget/v1/?ll=36.067883%2C52.970466&z=16&pt=36.067883%2C52.970466%2Cpm2rdm~Острый+край&text=г.+Орёл%2C+ул.+Полесская+д.+2' },
    { key: 'legal_name', value: 'ИП Бельцев В. А.' },
    { key: 'inn', value: '575207208997' },
    { key: 'working_hours', value: JSON.stringify([
      { day: 'Понедельник', hours: '10:00–18:00' },
      { day: 'Вторник', hours: '10:00–18:00' },
      { day: 'Среда', hours: '10:00–18:00' },
      { day: 'Четверг', hours: '10:00–18:00' },
      { day: 'Пятница', hours: '10:00–18:00' },
      { day: 'Суббота', hours: 'Выходной' },
      { day: 'Воскресенье', hours: 'Выходной' },
    ]) },
  ])

  console.log('Seed complete!')
  await pool.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
