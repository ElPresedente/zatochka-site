import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as schema from './schema'
import { normalizePhone } from '../utils/validators'

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
    { key: 'map_embed_url', value: 'https://yandex.ru/map-widget/v1/org/ostry_kray/96290816208/?indoorLevel=1&ll=36.059345%2C52.971119&z=17' },
    { key: 'yandex_map_url', value: 'https://yandex.ru/maps/org/ostry_kray/96290816208/' },
    { key: 'yandex_reviews_widget_url', value: 'https://yandex.ru/maps-reviews-widget/96290816208?comments' },
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

  // --- Product categories ---
  const productCategoryNames = ['Кусачки', 'Ножницы', 'Пинцеты и пушеры', 'Расходники', 'Аппараты', 'Наборы']
  const categoryIdByName = new Map<string, number>()
  for (let i = 0; i < productCategoryNames.length; i++) {
    const [row] = await db.insert(schema.productCategories)
      .values({ name: productCategoryNames[i], sortOrder: i })
      .returning({ id: schema.productCategories.id, name: schema.productCategories.name })
    categoryIdByName.set(row.name, row.id)
  }

  // --- Products ---
  const defaultProducts = [
    {
      name: 'Кусачки ногтевые Zinger', category: 'Кусачки', price: 1850, stock: 12,
      description: 'Профессиональные ногтевые кусачки из нержавеющей стали. Идеальный срез, эргономичные ручки.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Материал', value: 'Нержавеющая сталь' }, { key: 'Длина', value: '13 см' }],
    },
    {
      name: 'Кусачки педикюрные Classic', category: 'Кусачки', price: 2200, stock: 8,
      description: 'Усиленные кусачки для педикюра, работают с толстыми ногтями.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Материал', value: 'Хирургическая сталь' }, { key: 'Длина', value: '16 см' }],
    },
    {
      name: 'Кусачки кутикульные Pro', category: 'Кусачки', price: 2400, stock: 15,
      description: 'Прецизионные кусачки для кутикулы. Острый режущий край, пружинный механизм.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Диаметр режущей части', value: '5 мм' }],
    },
    {
      name: 'Ножницы маникюрные прямые', category: 'Ножницы', price: 1200, stock: 20,
      description: 'Классические прямые маникюрные ножницы из немецкой стали.',
      photos: ['/images/services1.jpg'],
      specs: [{ key: 'Длина', value: '10 см' }, { key: 'Страна', value: 'Германия' }],
    },
    {
      name: 'Ножницы парикмахерские 6.0"', category: 'Ножницы', price: 2800, stock: 5,
      description: 'Профессиональные парикмахерские ножницы для точной стрижки.',
      photos: ['/images/services1.jpg'],
      specs: [{ key: 'Длина', value: '6 дюймов' }, { key: 'Тип', value: 'Прямые' }],
    },
    {
      name: 'Ножницы филировочные', category: 'Ножницы', price: 3200, stock: 7,
      description: 'Филировочные ножницы с 28 зубьями. Для естественного объёма и текстуры.',
      photos: ['/images/services1.jpg'],
      specs: [{ key: 'Зубьев', value: '28' }, { key: 'Длина', value: '6.5 дюймов' }],
    },
    {
      name: 'Пинцет косой Staleks', category: 'Пинцеты и пушеры', price: 780, stock: 25,
      description: 'Классический косой пинцет для точного захвата ресниц и бровей.',
      photos: ['/images/services2.jpg'],
      specs: [{ key: 'Тип', value: 'Косой' }],
    },
    {
      name: 'Пушер двусторонний', category: 'Пинцеты и пушеры', price: 850, stock: 18,
      description: 'Двусторонний пушер для отодвигания кутикулы. Лопатка + закруглённая форма.',
      photos: ['/images/services2.jpg'],
      specs: [{ key: 'Количество рабочих концов', value: '2' }],
    },
    {
      name: 'Твизер прямой', category: 'Пинцеты и пушеры', price: 920, stock: 10,
      description: 'Прямой твизер для укладки ресниц при наращивании.',
      photos: ['/images/services2.jpg'],
      specs: [{ key: 'Тип', value: 'Прямой' }, { key: 'Применение', value: 'Наращивание ресниц' }],
    },
    {
      name: 'Пилочки одноразовые (100 шт)', category: 'Расходники', price: 280, stock: 50,
      description: 'Набор одноразовых пилочек для маникюра. Зернистость 180/240.',
      photos: ['/images/services2.jpg'],
      specs: [{ key: 'Зернистость', value: '180/240' }, { key: 'Количество', value: '100 шт' }],
    },
    {
      name: 'Перчатки нитриловые (S)', category: 'Расходники', price: 350, stock: 100,
      description: 'Нитриловые перчатки без пудры. Размер S.',
      photos: ['/images/services2.jpg'],
      specs: [{ key: 'Материал', value: 'Нитрил' }, { key: 'Размер', value: 'S' }],
    },
    {
      name: 'Маски одноразовые (50 шт)', category: 'Расходники', price: 450, stock: 80,
      description: 'Трёхслойные одноразовые маски. Упаковка 50 штук.',
      photos: ['/images/services2.jpg'],
      specs: [{ key: 'Слоёв', value: '3' }, { key: 'Количество', value: '50 шт' }],
    },
    {
      name: 'Маникюрный аппарат Strong 210', category: 'Аппараты', price: 8900, stock: 3,
      description: 'Профессиональный маникюрный аппарат с регулировкой оборотов до 35000 об/мин.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Макс. обороты', value: '35 000 об/мин' }, { key: 'Мощность', value: '65 Вт' }],
    },
    {
      name: 'УФ-лампа 48W', category: 'Аппараты', price: 1650, stock: 6,
      description: 'UV/LED лампа для полимеризации гель-лака. 48 Вт, сенсорное управление.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Мощность', value: '48 Вт' }, { key: 'Тип', value: 'UV/LED' }],
    },
    {
      name: 'Набор маникюрный базовый', category: 'Наборы', price: 4200, stock: 4,
      description: 'Базовый набор для маникюра: ножницы, кусачки, пилочка, пушер, пинцет.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Предметов в наборе', value: '5' }],
    },
    {
      name: 'Набор профессиональный Premium', category: 'Наборы', price: 7500, stock: 2,
      description: 'Профессиональный набор из 10 инструментов в фирменном чехле.',
      photos: ['/images/block1.jpg'],
      specs: [{ key: 'Предметов в наборе', value: '10' }, { key: 'Чехол', value: 'В комплекте' }],
    },
  ]

  for (let i = 0; i < defaultProducts.length; i++) {
    const p = defaultProducts[i]
    const categoryId = categoryIdByName.get(p.category)
    if (!categoryId) {
      throw new Error(`Категория продукта не найдена: ${p.category}`)
    }
    await db.insert(schema.products).values({
      name: p.name,
      categoryId,
      price: p.price,
      stock: p.stock,
      description: p.description,
      photos: JSON.stringify(p.photos),
      specs: JSON.stringify(p.specs),
      active: true,
      sortOrder: i,
    })
  }

  // --- First admin (from .env) ---
  const adminPhoneRaw = process.env.ADMIN_PHONE
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminPhoneRaw && adminPassword) {
    const adminPhone = normalizePhone(adminPhoneRaw)
    if (!adminPhone) {
      throw new Error(`Некорректный ADMIN_PHONE: ${adminPhoneRaw}`)
    }
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const [adminUser] = await db.insert(schema.users).values({
      lastName: 'Администратор',
      firstName: 'Главный',
      phone: adminPhone,
      passwordHash,
    }).onConflictDoUpdate({
      target: schema.users.phone,
      set: { passwordHash },
    }).returning()
    await db.insert(schema.admins).values({ userId: adminUser.id }).onConflictDoNothing()
    console.log(`Admin created: ${adminPhone}`)
  }

  console.log('Seed complete!')
  await pool.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
