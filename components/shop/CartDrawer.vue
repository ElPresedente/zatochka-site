<script setup lang="ts">
import type { CartItem } from '~/composables/useCart'

const props = defineProps<{
  cart: CartItem[]
  totalPrice: number
  comment: string
  authRequired: boolean
  authenticated: boolean
  loading: boolean
  error: string
  productStock: (id: number) => number
  pickupAddress?: string
  pickupMapsUrl?: string
  userEmail?: string | null
  settings?: Record<string, string>
  cartGoods?: CartItem[]
}>()

const emit = defineEmits<{
  close: []
  setQty: [cartKey: string, qty: number, stock: number]
  remove: [cartKey: string]
  clear: []
  checkout: [params: CheckoutParams]
  'update:comment': [value: string]
}>()

export interface CheckoutParams {
  paymentMethod: 'cash' | 'online_card'
  email: string
  deliveryMethod: 'pickup' | 'delivery'
  deliveryScope?: 'orel' | 'russia'
  deliveryAddress?: string
  deliveryCoords?: { lat: number; lon: number }
  deliveryCost: number
  cdekPvzCode?: string
  cdekPvzAddress?: string
  cdekPvzCity?: string
  cdekPvzCityCode?: number
  cdekTariffCode?: number
  cdekDeliveryDaysMin?: number
  cdekDeliveryDaysMax?: number
}

const { formatPrice } = useFormatters()
const config = useRuntimeConfig()

// Steps
const step = ref<'cart' | 'checkout'>('cart')
const deliveryType = ref<'pickup' | 'delivery'>('pickup')
const deliveryScope = ref<'orel' | 'russia'>('orel')

// Payment
const paymentMethod = ref<'cash' | 'online_card'>('online_card')
const emailInput = ref('')
const emailTouched = ref(false)

// Orel delivery
const addressInput = ref('')
const addressSuggestions = ref<string[]>([])
const showSuggestions = ref(false)
const suggestLoading = ref(false)
const selectedAddress = ref('')
const selectedCoords = ref<{ lat: number; lon: number } | null>(null)
const addressInZone = ref<boolean | null>(null)
const orelPolygon = ref<[number, number][] | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onAddressBlur() {
  setTimeout(() => { showSuggestions.value = false }, 200)
}

// CDEK (доставка по России): город → ПВЗ города → выбор
interface CdekCity { code: number; city: string; region: string; lon: number; lat: number }
interface CdekOffice { code: string; name: string; address: string; city: string; lon: number; lat: number; workTime: string; type: string }
interface OfficeGroup { key: string; lon: number; lat: number; offices: CdekOffice[] }

const cityQuery = ref('')
const cityResults = ref<CdekCity[]>([])
const showCityResults = ref(false)
const cityLoading = ref(false)
const selectedCity = ref<CdekCity | null>(null)
const offices = ref<CdekOffice[]>([])
const officesStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const tariffLoading = ref(false)
const cdekPvz = ref<{ code: string; address: string; city: string } | null>(null)
const cdekTariff = ref<{ code: number; sum: number; daysMin: number; daysMax: number } | null>(null)
let cityDebounce: ReturnType<typeof setTimeout> | null = null

// Map state — Орёл
const mapContainerRef = ref<HTMLElement | null>(null)
const mapStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
let mapInstance: any = null
let mapPlacemark: any = null
let ymapsReadyPromise: Promise<void> | null = null

// Map state — СДЭК (карта города с ПВЗ)
const cdekMapContainerRef = ref<HTMLElement | null>(null)
const cdekMapStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
let cdekMapInstance: any = null
let officeMarkers: { key: string; group: OfficeGroup; el: HTMLElement; marker: any }[] = []
let popupMarker: any = null
const activeOfficeCode = ref<string | null>(null)

// Грузы для расчёта тарифа (вес/габариты — фикс., как и в проверке заказа на сервере)
const cdekGoods = computed(() => props.cart.map(() => ({ weight: 1000, length: 10, width: 10, height: 10 })))

// Delivery thresholds from settings
const orelFee = computed(() => Number(props.settings?.delivery_orel_fee ?? 200))
const orelFreeThreshold = computed(() => Number(props.settings?.delivery_orel_free_threshold ?? 3000))

// Goods-only total (for Oryol delivery threshold, excluding services)
const goodsTotal = computed(() => {
  return props.cart.reduce((sum, item) => {
    const svcTotal = item.services.reduce((s, sv) => s + sv.price, 0)
    return sum + (item.price - svcTotal) * item.qty
  }, 0)
})

const orelDeliveryCost = computed(() => {
  if (addressInZone.value !== true) return 0
  return goodsTotal.value >= orelFreeThreshold.value ? 0 : orelFee.value
})

const cdekDeliveryCost = computed(() => cdekTariff.value?.sum ?? 0)

const deliveryCost = computed(() => {
  if (deliveryType.value === 'pickup') return 0
  if (deliveryScope.value === 'orel') return orelDeliveryCost.value
  return cdekDeliveryCost.value
})

const totalWithDelivery = computed(() => props.totalPrice + deliveryCost.value)

watch(() => props.userEmail, (val) => {
  if (val && !emailInput.value) emailInput.value = val
}, { immediate: true })

watch(() => props.cart.length, (len) => {
  if (len === 0) step.value = 'cart'
})

function resetCdekState() {
  cityQuery.value = ''
  cityResults.value = []
  showCityResults.value = false
  selectedCity.value = null
  offices.value = []
  officesStatus.value = 'idle'
  cdekPvz.value = null
  cdekTariff.value = null
  cdekMapStatus.value = 'idle'
  cdekMapInstance = null
  officeMarkers = []
  popupMarker = null
  activeOfficeCode.value = null
}

// Reset delivery state on scope change
watch(deliveryScope, () => {
  selectedAddress.value = ''
  selectedCoords.value = null
  addressInZone.value = null
  mapStatus.value = 'idle'
  mapInstance = null
  resetCdekState()
})

watch(deliveryType, () => {
  if (deliveryType.value === 'pickup') {
    mapStatus.value = 'idle'
    mapInstance = null
    resetCdekState()
  }
  else {
    // Доставка — только оплата картой онлайн (наличными нельзя).
    paymentMethod.value = 'online_card'
  }
})

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput.value.trim()))
const emailError = computed(() => emailTouched.value && paymentMethod.value === 'online_card' && !emailValid.value)

const canCheckout = computed(() => {
  if (paymentMethod.value === 'online_card' && !emailValid.value) return false
  if (deliveryType.value === 'delivery') {
    if (deliveryScope.value === 'orel') {
      return !!selectedAddress.value && addressInZone.value === true
    }
    if (deliveryScope.value === 'russia') {
      return !!cdekPvz.value
    }
  }
  return true
})

function handleCheckout() {
  emailTouched.value = true
  if (!canCheckout.value) return
  emit('checkout', {
    paymentMethod: paymentMethod.value,
    email: emailInput.value.trim(),
    deliveryMethod: deliveryType.value,
    deliveryScope: deliveryType.value === 'delivery' ? deliveryScope.value : undefined,
    deliveryAddress: deliveryType.value === 'delivery' && deliveryScope.value === 'orel' ? selectedAddress.value : undefined,
    deliveryCoords: deliveryType.value === 'delivery' && deliveryScope.value === 'orel' ? selectedCoords.value ?? undefined : undefined,
    deliveryCost: deliveryCost.value,
    cdekPvzCode: cdekPvz.value?.code,
    cdekPvzAddress: cdekPvz.value?.address,
    cdekPvzCity: cdekPvz.value?.city,
    cdekPvzCityCode: selectedCity.value?.code,
    cdekTariffCode: cdekTariff.value?.code,
    cdekDeliveryDaysMin: cdekTariff.value?.daysMin,
    cdekDeliveryDaysMax: cdekTariff.value?.daysMax,
  })
}

// ── Yandex Maps v3 lazy loading ──
// В v3: координаты [lon, lat] (GeoJSON), глобал window.ymaps3,
// карта через addChild(), suggest через ymaps3.suggest().

function ensureYmaps3(): Promise<void> {
  if (!import.meta.client) return Promise.resolve()
  const win = window as any
  // ymaps3 уже загружен (нами или CDEK-виджетом) — всегда берём актуальный ready,
  // перезаписывая возможный старый rejected ymapsReadyPromise.
  if (win.ymaps3) {
    ymapsReadyPromise = win.ymaps3.ready as Promise<void>
    return ymapsReadyPromise
  }
  // Загрузка уже в процессе
  if (ymapsReadyPromise) return ymapsReadyPromise
  const apiKey = config.public.yandexMapsJsApiKey
  if (!apiKey) return Promise.reject(new Error('YANDEX_MAPS_JS_API_KEY not set'))
  ymapsReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.setAttribute('data-ymaps', '1')
    // v3-загрузчик не принимает отдельный ключ саджеста (suggest_apikey/любое имя → HTTP 400,
    // из-за чего срабатывал script.onerror → "[ymaps3] init failed"). В v3 ymaps3.suggest
    // авторизуется основным JS-API-ключом — продукт «Геосаджест» включается на тот же ключ.
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`
    script.onload = () => win.ymaps3.ready.then(resolve).catch(reject)
    script.onerror = (err) => {
      ymapsReadyPromise = null  // Сбрасываем, чтобы следующая попытка могла повторить загрузку
      reject(err)
    }
    document.head.appendChild(script)
  })
  return ymapsReadyPromise
}

function makeMarkerEl(inZone: boolean | null): HTMLElement {
  const el = document.createElement('div')
  const color = inZone === false ? '#dc2626' : '#0988bd'
  el.style.cssText = `width:14px;height:14px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translate(-50%,-50%)`
  return el
}

async function initOrelMap() {
  if (mapStatus.value === 'ready' || mapStatus.value === 'loading') return
  mapStatus.value = 'loading'
  try {
    await ensureYmaps3()

    if (!orelPolygon.value) {
      try {
        const data = await $fetch<{ coords: [number, number][] }>('/api/delivery/orel-polygon')
        orelPolygon.value = data.coords
      }
      catch { /* use null polygon */ }
    }

    await nextTick()
    if (!mapContainerRef.value) { mapStatus.value = 'error'; return }

    // Контролы (YMapZoomControl и пр.) не входят в ядро ymaps3 — они в отдельном пакете
    // @yandex/ymaps3-controls, который грузится через ymaps3.import(). Для карты-показа зоны
    // они не нужны: зум скроллом и перетаскивание работают по умолчанию.
    const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapFeature, YMapMarker } = (window as any).ymaps3

    mapInstance = new YMap(mapContainerRef.value, {
      location: { center: [36.059345, 52.971119], zoom: 11 },
    })
    mapInstance.addChild(new YMapDefaultSchemeLayer({}))
    mapInstance.addChild(new YMapDefaultFeaturesLayer({}))

    // Полигон хранится как [lat, lon][] — конвертируем в v3 [lon, lat][]
    if (orelPolygon.value) {
      const ring = orelPolygon.value.map(([lat, lon]) => [lon, lat])
      const polygon = new YMapFeature({
        geometry: { type: 'Polygon', coordinates: [ring] },
        style: { fill: '#0988bd1a', stroke: [{ color: '#0988bd', width: 2 }] },
      })
      mapInstance.addChild(polygon)
    }

    if (selectedCoords.value) {
      const c = [selectedCoords.value.lon, selectedCoords.value.lat]
      mapPlacemark = new YMapMarker({ coordinates: c }, makeMarkerEl(addressInZone.value))
      mapInstance.addChild(mapPlacemark)
      mapInstance.update({ location: { center: c, zoom: 15 } })
    }

    mapStatus.value = 'ready'
  }
  catch (err) {
    console.error('[ymaps3] init failed', err)
    mapStatus.value = 'error'
  }
}

async function geocodeAndSelect(address: string) {
  selectedAddress.value = address
  addressInput.value = address
  selectedCoords.value = null
  addressInZone.value = null

  try {
    const result = await $fetch<{ coords: { lat: number; lon: number } | null; inZone: boolean | null }>(
      '/api/delivery/geocode',
      { query: { q: address } },
    )
    if (!result.coords) return
    selectedCoords.value = result.coords
    addressInZone.value = result.inZone

    if (mapInstance) {
      const { YMapMarker } = (window as any).ymaps3
      const c = [result.coords.lon, result.coords.lat]
      if (mapPlacemark) mapInstance.removeChild(mapPlacemark)
      mapPlacemark = new YMapMarker({ coordinates: c }, makeMarkerEl(result.inZone))
      mapInstance.addChild(mapPlacemark)
      mapInstance.update({ location: { center: c, zoom: 15 } })
    }
  }
  catch {
    // Geocoder unavailable — address text is still set, zone unknown
  }
}

function onAddressInput(val: string) {
  addressInput.value = val
  selectedAddress.value = ''
  selectedCoords.value = null
  addressInZone.value = null
  showSuggestions.value = false

  if (debounceTimer) clearTimeout(debounceTimer)
  if (val.trim().length < 3) { addressSuggestions.value = []; return }

  debounceTimer = setTimeout(async () => {
    const ymaps3 = (window as any).ymaps3
    if (!ymaps3) return
    suggestLoading.value = true
    try {
      const items: { title: { text: string }; subtitle?: { text: string } }[] = await ymaps3.suggest({
        text: 'Орёл, ' + val,
        boundingBox: { southWest: [35.90, 52.85], northEast: [36.25, 53.10] },
        results: 5,
      })
      addressSuggestions.value = items.map(i =>
        i.subtitle?.text ? `${i.title.text}, ${i.subtitle.text}` : i.title.text,
      )
      showSuggestions.value = addressSuggestions.value.length > 0
    }
    catch {
      addressSuggestions.value = []
    }
    finally {
      suggestLoading.value = false
    }
  }, 350)
}

async function selectSuggestion(addr: string) {
  showSuggestions.value = false
  await geocodeAndSelect(addr)
}

// ── СДЭК: выбор города → ПВЗ города → точка на карте/в списке ──
// Виджет СДЭК грузил все ~10 500 ПВЗ России разом (≈40 с фриза рендера). Вместо него
// свой пикер: грузим ПВЗ только выбранного города (даже Москва ≈ 486 точек).

function onCityInput(val: string) {
  cityQuery.value = val
  selectedCity.value = null
  offices.value = []
  officesStatus.value = 'idle'
  cdekPvz.value = null
  cdekTariff.value = null
  cdekMapStatus.value = 'idle'

  if (cityDebounce) clearTimeout(cityDebounce)
  if (val.trim().length < 2) { cityResults.value = []; showCityResults.value = false; return }

  cityDebounce = setTimeout(async () => {
    cityLoading.value = true
    try {
      cityResults.value = await $fetch<CdekCity[]>('/api/delivery/cdek-cities', { query: { q: val.trim() } })
      showCityResults.value = cityResults.value.length > 0
    }
    catch {
      cityResults.value = []
    }
    finally {
      cityLoading.value = false
    }
  }, 300)
}

function onCityBlur() {
  setTimeout(() => { showCityResults.value = false }, 200)
}

async function selectCity(city: CdekCity) {
  selectedCity.value = city
  cityQuery.value = city.city
  cityResults.value = []
  showCityResults.value = false
  cdekPvz.value = null
  cdekTariff.value = null
  offices.value = []
  officesStatus.value = 'loading'
  try {
    offices.value = await $fetch<CdekOffice[]>('/api/delivery/cdek-city-offices', { query: { cityCode: city.code } })
    officesStatus.value = 'ready'
    await initCdekMap()
  }
  catch {
    officesStatus.value = 'error'
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

// Группируем ПВЗ/постаматы по совпадающим координатам: на одном адресе часто стоят
// и ПВЗ, и постамат — рисуем ОДИН пин, по клику даём выбрать конкретный.
function groupOffices(list: CdekOffice[]): OfficeGroup[] {
  const map = new Map<string, OfficeGroup>()
  for (const o of list) {
    const key = `${o.lon.toFixed(5)},${o.lat.toFixed(5)}`
    let g = map.get(key)
    if (!g) { g = { key, lon: o.lon, lat: o.lat, offices: [] }; map.set(key, g) }
    g.offices.push(o)
  }
  return [...map.values()]
}

function groupSelected(group: OfficeGroup): boolean {
  return group.offices.some(o => o.code === cdekPvz.value?.code)
}

// Стиль обёртки пина: выбранный — крупнее, якорь — нижний кончик. Цвет — внутри SVG.
function applyMarkerStyle(el: HTMLElement, selected: boolean) {
  el.style.cssText = `cursor:pointer;line-height:0;transform-origin:center bottom;transform:translate(-50%,-100%)${selected ? ' scale(1.4)' : ''}`
}

let markerUid = 0
const PVZ_COLOR = '#16a34a'
const POSTAMAT_COLOR = '#0988bd'

// Пин-капля. Если в точке и ПВЗ, и постамат — заливка пополам (зелёный/синий).
function makeGroupMarkerEl(group: OfficeGroup, selected: boolean): HTMLElement {
  const hasPvz = group.offices.some(o => o.type !== 'POSTAMAT')
  const hasPostamat = group.offices.some(o => o.type === 'POSTAMAT')
  let defs = ''
  let fill: string
  if (hasPvz && hasPostamat) {
    const id = `pin${markerUid++}`
    defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="50%" stop-color="${PVZ_COLOR}"/><stop offset="50%" stop-color="${POSTAMAT_COLOR}"/></linearGradient></defs>`
    fill = `url(#${id})`
  }
  else {
    fill = hasPvz ? PVZ_COLOR : POSTAMAT_COLOR
  }
  const el = document.createElement('div')
  el.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" stroke="#fff" stroke-width="1.2" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">${defs}<path fill="${fill}" d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#fff" stroke="none"/></svg>`
  applyMarkerStyle(el, selected)
  return el
}

function repaintMarkers() {
  officeMarkers.forEach(m => applyMarkerStyle(m.el, groupSelected(m.group)))
}

function renderOfficeMarkers() {
  if (!cdekMapInstance) return
  const { YMapMarker } = (window as any).ymaps3
  officeMarkers.forEach(m => cdekMapInstance.removeChild(m.marker))
  officeMarkers = []
  for (const g of groupOffices(offices.value)) {
    const el = makeGroupMarkerEl(g, groupSelected(g))
    el.onclick = (e) => { e.stopPropagation(); openGroupPopup(g) }
    const marker = new YMapMarker({ coordinates: [g.lon, g.lat], zIndex: 2 }, el)
    cdekMapInstance.addChild(marker)
    officeMarkers.push({ key: g.key, group: g, el, marker })
  }
}

function closeOfficePopup() {
  if (popupMarker && cdekMapInstance) cdekMapInstance.removeChild(popupMarker)
  popupMarker = null
  activeOfficeCode.value = null
}

// Карточка точки: один офис — обычная карточка, несколько (ПВЗ+постамат) — список
// с отдельной кнопкой «Выбрать» у каждого.
function openGroupPopup(group: OfficeGroup) {
  if (!cdekMapInstance) return
  closeOfficePopup()
  activeOfficeCode.value = group.key

  const { YMapMarker } = (window as any).ymaps3
  const multi = group.offices.length > 1
  const el = document.createElement('div')
  el.style.cssText = `transform:translate(-50%,calc(-100% - 22px));width:${multi ? 205 : 192}px;max-height:240px;overflow-y:auto;background:#fff;border-radius:10px;box-shadow:0 5px 16px rgba(0,0,0,.22);font-size:11px;position:relative`

  const card = (o: CdekOffice, border: boolean) => {
    const typeLabel = o.type === 'POSTAMAT' ? 'Постамат' : 'Пункт выдачи'
    const typeColor = o.type === 'POSTAMAT' ? POSTAMAT_COLOR : PVZ_COLOR
    return `<div style="padding:10px${border ? ';border-top:1px solid #f0f0f0' : ''}">
      <div style="font-weight:600;color:${typeColor};font-size:9px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:3px">${typeLabel}</div>
      <div style="font-weight:600;color:#222;margin-bottom:3px;padding-right:12px">${escapeHtml(o.address)}</div>
      <div style="color:#777;margin-bottom:8px;line-height:1.3">${escapeHtml(o.workTime || 'Часы работы не указаны')}</div>
      <button data-select="${escapeHtml(o.code)}" style="width:100%;background:${typeColor};color:#fff;border:0;border-radius:7px;padding:6px;font-weight:600;cursor:pointer">Выбрать</button>
    </div>`
  }

  el.innerHTML
    = `<button data-close style="position:absolute;top:4px;right:6px;border:0;background:none;font-size:17px;line-height:1;color:#bbb;cursor:pointer;z-index:1">&times;</button>`
    + group.offices.map((o, i) => card(o, multi && i > 0)).join('')
    + `<div style="position:absolute;left:50%;bottom:-7px;width:14px;height:14px;background:#fff;transform:translateX(-50%) rotate(45deg);box-shadow:3px 3px 6px rgba(0,0,0,.08)"></div>`

  el.onclick = e => e.stopPropagation()
  ;(el.querySelector('[data-close]') as HTMLElement).onclick = (e) => { e.stopPropagation(); closeOfficePopup() }
  el.querySelectorAll('[data-select]').forEach((btn) => {
    const code = btn.getAttribute('data-select')
    const office = group.offices.find(o => o.code === code)
    ;(btn as HTMLElement).onclick = (e) => { e.stopPropagation(); if (office) selectOffice(office) }
  })

  popupMarker = new YMapMarker({ coordinates: [group.lon, group.lat], zIndex: 1000 }, el)
  cdekMapInstance.addChild(popupMarker)
  // Центрируем точку, чтобы карточка над пином не обрезалась краем карты
  cdekMapInstance.update({ location: { center: [group.lon, group.lat], duration: 200 } })
}

async function initCdekMap() {
  cdekMapStatus.value = 'loading'
  try {
    await ensureYmaps3()
    await nextTick()
    if (!cdekMapContainerRef.value || !selectedCity.value) { cdekMapStatus.value = 'error'; return }

    // При смене города уничтожаем прежнюю карту, чтобы не плодить инстансы на контейнере
    if (cdekMapInstance) { cdekMapInstance.destroy?.(); cdekMapInstance = null; officeMarkers = []; popupMarker = null; activeOfficeCode.value = null }

    const ymaps3 = (window as any).ymaps3
    const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapControls } = ymaps3
    cdekMapInstance = new YMap(cdekMapContainerRef.value, {
      location: { center: [selectedCity.value.lon, selectedCity.value.lat], zoom: 11 },
    })
    cdekMapInstance.addChild(new YMapDefaultSchemeLayer({}))
    cdekMapInstance.addChild(new YMapDefaultFeaturesLayer({}))

    // Кнопки зума (+/−) — отдельный пакет, грузится через ymaps3.import. Не критично:
    // если не загрузится, карта работает (зум колесом/жестами), поэтому в try/catch.
    try {
      const { YMapZoomControl } = await ymaps3.import('@yandex/ymaps3-controls@0.0.1')
      const controls = new YMapControls({ position: 'right' })
      controls.addChild(new YMapZoomControl({}))
      cdekMapInstance.addChild(controls)
    }
    catch (e) {
      console.warn('[cdek] zoom controls not loaded', e)
    }

    renderOfficeMarkers()
    cdekMapStatus.value = 'ready'
  }
  catch (err) {
    console.error('[cdek] map init failed', err)
    cdekMapStatus.value = 'error'
  }
}

async function selectOffice(office: CdekOffice) {
  cdekPvz.value = { code: office.code, address: office.address, city: office.city }
  cdekTariff.value = null
  closeOfficePopup()
  repaintMarkers() // выбранный пин — зелёный
  if (cdekMapInstance) cdekMapInstance.update({ location: { center: [office.lon, office.lat], zoom: 14 } })

  if (!selectedCity.value) return
  tariffLoading.value = true
  try {
    const t = await $fetch<{ code: number; sum: number; daysMin: number; daysMax: number }>(
      '/api/delivery/cdek-tariff',
      { method: 'POST', body: { cityCode: selectedCity.value.code, goods: cdekGoods.value } },
    )
    cdekTariff.value = t
  }
  catch {
    cdekTariff.value = null
  }
  finally {
    tariffLoading.value = false
  }
}

// Карта Орла авто-инициализируется при выборе зоны. Для СДЭК карта грузится
// после выбора города (в selectCity), поэтому здесь — только Орёл.
watch([deliveryScope, deliveryType], async ([scope, type]) => {
  if (type !== 'delivery') return
  await nextTick()
  if (scope === 'orel' && mapStatus.value === 'idle') {
    initOrelMap()
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200]" @click.self="emit('close')">
      <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-white shadow-2xl flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 lg:px-6 py-4 lg:py-5 border-b border-[#eee] shrink-0 relative">
          <template v-if="step === 'cart'">
            <div class="text-lg lg:text-xl font-bold">Корзина</div>
          </template>
          <template v-else>
            <button
              class="flex items-center gap-1.5 text-brand font-semibold text-sm hover:opacity-75 transition-opacity"
              @click="step = 'cart'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Корзина
            </button>
            <span class="absolute inset-x-0 text-center font-bold text-base lg:text-lg pointer-events-none">Оформление</span>
          </template>
          <button class="text-[#aaa] hover:text-[#333] text-2xl w-8 h-8 flex items-center justify-center shrink-0" @click="emit('close')">×</button>
        </div>

        <!-- ── ШАГ 1: КОРЗИНА ── -->
        <template v-if="step === 'cart'">
          <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center text-[#aaa] gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span class="text-lg">Корзина пуста</span>
          </div>

          <div v-else class="flex-1 overflow-y-auto px-4 lg:px-6 py-3 lg:py-4 flex flex-col gap-4">
            <div v-for="item in cart" :key="item.cartKey" class="flex gap-3 items-start">
              <div
                class="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-center bg-cover bg-[#f0f0f0] shrink-0"
                :style="`background-image: url('${item.photo || '/images/nofoto.jpg'}')`"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-[#222] leading-snug mb-0.5 line-clamp-2">{{ item.name }}</div>
                <div v-if="item.services.length > 0" class="flex flex-col gap-0.5 mb-1">
                  <span
                    v-for="svc in item.services"
                    :key="svc.id"
                    class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit font-medium"
                  >+ {{ svc.name }}</span>
                </div>
                <div class="text-brand font-bold">{{ formatPrice(item.price) }}</div>
                <div class="mt-2">
                  <ShopQtyInput
                    :qty="item.qty"
                    :stock="productStock(item.id)"
                    size="sm"
                    @update="emit('setQty', item.cartKey, $event, productStock(item.id))"
                  />
                </div>
              </div>
              <button class="text-[#ccc] hover:text-red-400 text-xl shrink-0" @click="emit('remove', item.cartKey)">×</button>
            </div>
          </div>

          <div v-if="cart.length > 0" class="border-t border-[#eee] px-4 lg:px-6 py-4 lg:py-5 flex flex-col gap-3 shrink-0">
            <div class="flex justify-between text-lg lg:text-xl font-bold">
              <span>Итого:</span>
              <span class="text-brand">{{ formatPrice(totalPrice) }}</span>
            </div>
            <button class="btn-primary py-3 lg:py-3.5 text-base lg:text-lg" @click="step = 'checkout'">
              Оформить заказ →
            </button>
            <NuxtLink
              v-if="!authenticated"
              to="/login?next=/shop"
              class="text-sm text-brand font-semibold text-center no-underline hover:underline"
            >
              Войти или зарегистрироваться
            </NuxtLink>
            <button class="text-sm text-[#aaa] hover:text-red-400 transition-colors text-center" @click="emit('clear')">
              Очистить корзину
            </button>
          </div>
        </template>

        <!-- ── ШАГ 2: ОФОРМЛЕНИЕ ── -->
        <template v-else>
          <div class="flex-1 overflow-y-auto px-4 lg:px-6 py-4 flex flex-col gap-5">

            <!-- Способ получения -->
            <div>
              <div class="text-xs font-semibold text-[#777] mb-2 uppercase tracking-wide">Способ получения</div>
              <div class="flex rounded-xl overflow-hidden border border-[#e0e0e0]">
                <button
                  class="flex-1 py-2.5 text-sm font-semibold transition-colors"
                  :class="deliveryType === 'pickup' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                  @click="deliveryType = 'pickup'"
                >Самовывоз</button>
                <button
                  class="flex-1 py-2.5 text-sm font-semibold border-l border-[#e0e0e0] transition-colors"
                  :class="deliveryType === 'delivery' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                  @click="deliveryType = 'delivery'"
                >Доставка</button>
              </div>
            </div>

            <!-- Самовывоз: адрес -->
            <template v-if="deliveryType === 'pickup'">
              <div class="bg-[#f7f9fb] border border-[#e0eaf2] rounded-xl px-4 py-3 flex flex-col gap-2">
                <div class="text-sm font-semibold text-[#333]">Адрес мастерской</div>
                <div v-if="pickupAddress" class="text-sm text-[#555]">{{ pickupAddress }}</div>
                <a
                  v-if="pickupMapsUrl"
                  :href="pickupMapsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-brand font-semibold hover:underline flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Открыть в Яндекс.Картах
                </a>
              </div>
            </template>

            <!-- Доставка: выбор зоны -->
            <template v-if="deliveryType === 'delivery'">
              <div>
                <div class="text-xs font-semibold text-[#777] mb-2 uppercase tracking-wide">Зона доставки</div>
                <div class="flex rounded-xl overflow-hidden border border-[#e0e0e0]">
                  <button
                    class="flex-1 py-2.5 text-sm font-semibold transition-colors"
                    :class="deliveryScope === 'orel' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                    @click="deliveryScope = 'orel'"
                  >По Орлу</button>
                  <button
                    class="flex-1 py-2.5 text-sm font-semibold border-l border-[#e0e0e0] transition-colors"
                    :class="deliveryScope === 'russia' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                    @click="deliveryScope = 'russia'"
                  >По России (СДЭК)</button>
                </div>
              </div>

              <!-- Доставка по Орлу -->
              <template v-if="deliveryScope === 'orel'">
                <!-- Address input with suggest -->
                <div class="relative">
                  <label class="block text-xs font-semibold text-[#777] mb-1.5 uppercase tracking-wide">
                    Адрес доставки <span class="text-red-400">*</span>
                  </label>
                  <input
                    :value="addressInput"
                    type="text"
                    autocomplete="off"
                    placeholder="Улица, дом, квартира"
                    class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                    :class="addressInZone === false ? 'border-red-400 focus:border-red-400' : 'border-[#ddd] focus:border-brand'"
                    @input="onAddressInput(($event.target as HTMLInputElement).value)"
                    @focus="showSuggestions = addressSuggestions.length > 0"
                    @blur="onAddressBlur"
                  />
                  <!-- Suggestions dropdown -->
                  <div
                    v-if="showSuggestions && addressSuggestions.length > 0"
                    class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e0e0e0] rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      v-for="(sug, i) in addressSuggestions"
                      :key="i"
                      class="w-full px-4 py-2.5 text-left text-sm border-b last:border-0 border-[#f0f0f0] hover:bg-[#f5f5f5] transition-colors"
                      @mousedown.prevent="selectSuggestion(sug)"
                    >{{ sug }}</button>
                  </div>
                  <!-- Zone status -->
                  <p v-if="addressInZone === false" class="text-xs text-red-500 mt-1">
                    Адрес за пределами зоны доставки. Выберите самовывоз или доставку по России.
                  </p>
                  <p v-else-if="addressInZone === true" class="text-xs text-green-600 mt-1">
                    Адрес в зоне доставки
                    <span v-if="orelDeliveryCost === 0"> — доставка бесплатна</span>
                    <span v-else> — стоимость доставки {{ formatPrice(orelDeliveryCost) }}</span>
                  </p>
                  <p v-else class="text-xs text-[#aaa] mt-1">Введите адрес и выберите из подсказок</p>
                </div>

                <!-- Map -->
                <div class="relative">
                  <div
                    v-if="mapStatus === 'idle'"
                    class="h-[220px] bg-[#f0f4f8] rounded-xl flex items-center justify-center cursor-pointer border border-[#e0e0e0] hover:border-brand transition-colors"
                    @click="initOrelMap"
                  >
                    <div class="flex flex-col items-center gap-2 text-[#888]">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span class="text-sm font-medium">Показать карту</span>
                    </div>
                  </div>
                  <div
                    v-if="mapStatus === 'loading'"
                    class="h-[220px] bg-[#f0f4f8] rounded-xl flex items-center justify-center border border-[#e0e0e0]"
                  >
                    <span class="text-sm text-[#888]">Загрузка карты…</span>
                  </div>
                  <div
                    v-if="mapStatus === 'error'"
                    class="h-[220px] bg-[#f0f4f8] rounded-xl flex items-center justify-center border border-[#e0e0e0]"
                  >
                    <span class="text-sm text-red-500">Не удалось загрузить карту. Введите адрес вручную.</span>
                  </div>
                  <div
                    id="orel-delivery-map"
                    ref="mapContainerRef"
                    class="h-[220px] rounded-xl overflow-hidden border border-[#e0e0e0]"
                    :class="mapStatus !== 'ready' ? 'hidden' : ''"
                  />
                </div>
              </template>

              <!-- Доставка по России (СДЭК): город → ПВЗ -->
              <template v-if="deliveryScope === 'russia'">
                <!-- Город получения с автодополнением -->
                <div class="relative">
                  <label class="block text-xs font-semibold text-[#777] mb-1.5 uppercase tracking-wide">
                    Город получения <span class="text-red-400">*</span>
                  </label>
                  <input
                    :value="cityQuery"
                    type="text"
                    autocomplete="off"
                    placeholder="Введите город"
                    class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                    @input="onCityInput(($event.target as HTMLInputElement).value)"
                    @focus="showCityResults = cityResults.length > 0"
                    @blur="onCityBlur"
                  >
                  <div
                    v-if="showCityResults && cityResults.length > 0"
                    class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e0e0e0] rounded-xl shadow-lg overflow-hidden max-h-[240px] overflow-y-auto"
                  >
                    <button
                      v-for="c in cityResults"
                      :key="c.code"
                      class="w-full px-4 py-2.5 text-left text-sm border-b last:border-0 border-[#f0f0f0] hover:bg-[#f5f5f5] transition-colors"
                      @mousedown.prevent="selectCity(c)"
                    >
                      {{ c.city }}<span class="text-[#999]"> — {{ c.region }}</span>
                    </button>
                  </div>
                  <p v-if="cityLoading" class="text-xs text-[#aaa] mt-1">Поиск города…</p>
                  <p v-else-if="!selectedCity" class="text-xs text-[#aaa] mt-1">Начните вводить город и выберите из списка</p>
                </div>

                <!-- Карта города с ПВЗ + статусы загрузки -->
                <template v-if="selectedCity">
                  <div
                    v-if="officesStatus === 'loading'"
                    class="h-[360px] bg-[#f0f4f8] rounded-xl flex items-center justify-center border border-[#e0e0e0]"
                  >
                    <span class="text-sm text-[#888]">Загрузка пунктов выдачи…</span>
                  </div>
                  <div
                    v-else-if="officesStatus === 'error'"
                    class="h-[360px] bg-[#f0f4f8] rounded-xl flex items-center justify-center border border-[#e0e0e0]"
                  >
                    <span class="text-sm text-red-500">Не удалось загрузить пункты выдачи.</span>
                  </div>
                  <template v-else-if="officesStatus === 'ready'">
                    <!-- Контейнер карты НЕ скрываем во время инициализации: ymaps3
                         замеряет размеры контейнера при создании, и если он display:none,
                         карта получает height:0 и не восстанавливается. Держим видимым. -->
                    <div v-if="offices.length > 0" class="relative">
                      <div
                        id="cdek-city-map"
                        ref="cdekMapContainerRef"
                        class="h-[360px] rounded-xl overflow-hidden border border-[#e0e0e0] bg-[#f0f4f8]"
                      />
                      <div
                        v-if="cdekMapStatus === 'loading'"
                        class="absolute inset-0 flex items-center justify-center text-sm text-[#888] pointer-events-none"
                      >Загрузка карты…</div>
                      <div
                        v-else-if="cdekMapStatus === 'error'"
                        class="absolute inset-0 flex items-center justify-center text-sm text-red-500 pointer-events-none"
                      >Карта недоступна — выберите ПВЗ из списка ниже</div>
                    </div>
                    <!-- Легенда цветов маркеров -->
                    <div v-if="offices.length > 0" class="flex items-center gap-4 text-xs text-[#888] -mt-1">
                      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Пункт выдачи</span>
                      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#0988bd]" /> Постамат</span>
                    </div>
                    <!-- Список ПВЗ -->
                    <div
                      v-if="offices.length > 0"
                      class="border border-[#e0e0e0] rounded-xl divide-y divide-[#f0f0f0] max-h-[260px] overflow-y-auto"
                    >
                      <button
                        v-for="o in offices"
                        :key="o.code"
                        class="w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-start gap-2"
                        :class="cdekPvz?.code === o.code ? 'bg-brand/10' : 'hover:bg-[#f7f9fb]'"
                        @click="selectOffice(o)"
                      >
                        <span
                          class="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5"
                          :class="o.type === 'POSTAMAT' ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'"
                        >{{ o.type === 'POSTAMAT' ? 'Постамат' : 'ПВЗ' }}</span>
                        <span class="min-w-0">
                          <span class="block font-semibold text-[#333]">{{ o.address }}</span>
                          <span class="block text-xs text-[#888] mt-0.5">{{ o.workTime }}</span>
                        </span>
                      </button>
                    </div>
                    <p v-else class="text-sm text-[#888]">В этом городе нет пунктов выдачи СДЭК.</p>
                  </template>
                </template>

                <!-- Выбранный ПВЗ + стоимость -->
                <div v-if="cdekPvz" class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
                  <div class="font-semibold text-green-800">ПВЗ выбран: {{ cdekPvz.city }}</div>
                  <div class="text-green-700 mt-0.5">{{ cdekPvz.address }}</div>
                  <div v-if="tariffLoading" class="text-green-600 mt-1">Расчёт стоимости…</div>
                  <div v-else-if="cdekTariff" class="text-green-600 mt-1 font-semibold">
                    Стоимость доставки: {{ formatPrice(cdekTariff.sum) }}
                    <span v-if="cdekTariff.daysMin">· {{ cdekTariff.daysMin }}–{{ cdekTariff.daysMax }} дн.</span>
                  </div>
                </div>
              </template>
            </template>

            <!-- Способ оплаты -->
            <div>
              <div class="text-xs font-semibold text-[#777] mb-2 uppercase tracking-wide">Способ оплаты</div>
              <div class="flex rounded-xl overflow-hidden border border-[#e0e0e0]">
                <button
                  class="flex-1 py-2.5 text-sm font-semibold transition-colors"
                  :class="paymentMethod === 'online_card' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                  @click="paymentMethod = 'online_card'"
                >Картой онлайн</button>
                <button
                  v-if="deliveryType === 'pickup'"
                  class="flex-1 py-2.5 text-sm font-semibold border-l border-[#e0e0e0] transition-colors"
                  :class="paymentMethod === 'cash' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                  @click="paymentMethod = 'cash'"
                >При получении</button>
              </div>
              <p v-if="paymentMethod === 'online_card'" class="text-xs text-[#888] mt-1.5 px-0.5">Безопасная оплата через ЮKassa</p>
              <p v-if="deliveryType === 'delivery'" class="text-xs text-[#888] mt-1.5 px-0.5">При доставке доступна только оплата картой онлайн</p>
            </div>

            <!-- Email для чека -->
            <div v-if="paymentMethod === 'online_card'">
              <label class="block text-xs font-semibold text-[#777] mb-1.5 uppercase tracking-wide">
                Email для чека <span class="text-red-400">*</span>
              </label>
              <input
                v-model="emailInput"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                :class="emailError ? 'border-red-400 focus:border-red-400' : 'border-[#ddd] focus:border-brand'"
                @blur="emailTouched = true"
              />
              <p v-if="emailError" class="text-xs text-red-500 mt-1">Укажите корректный email</p>
              <p v-else class="text-xs text-[#aaa] mt-1">Чек об оплате придёт на этот адрес</p>
            </div>

            <!-- Комментарий -->
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5 uppercase tracking-wide">Комментарий к заказу</label>
              <textarea
                :value="comment"
                rows="3"
                maxlength="1000"
                placeholder="Например: удобное время для звонка или пожелания по заказу"
                class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none"
                @input="emit('update:comment', ($event.target as HTMLTextAreaElement).value)"
              />
            </div>

            <div v-if="authRequired && !authenticated" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 leading-relaxed">
              Для оформления заказа нужно войти в аккаунт.
            </div>
            <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 leading-relaxed">
              {{ error }}
            </div>
          </div>

          <div class="border-t border-[#eee] px-4 lg:px-6 py-4 lg:py-5 flex flex-col gap-2 shrink-0">
            <!-- Delivery breakdown -->
            <div v-if="deliveryType === 'delivery' && deliveryCost > 0" class="flex justify-between text-sm text-[#666]">
              <span>Товары:</span>
              <span>{{ formatPrice(totalPrice) }}</span>
            </div>
            <div v-if="deliveryType === 'delivery'" class="flex justify-between text-sm text-[#666]">
              <span>Доставка:</span>
              <span :class="deliveryCost === 0 && (addressInZone === true || cdekPvz) ? 'text-green-600 font-semibold' : ''">
                {{ deliveryCost === 0 && deliveryType === 'delivery' && (addressInZone === true || cdekPvz) ? 'Бесплатно' : deliveryCost > 0 ? formatPrice(deliveryCost) : '—' }}
              </span>
            </div>
            <div class="flex justify-between text-lg lg:text-xl font-bold">
              <span>Итого:</span>
              <span class="text-brand">{{ formatPrice(totalWithDelivery) }}</span>
            </div>
            <button
              class="btn-primary py-3 lg:py-3.5 text-base lg:text-lg disabled:opacity-50"
              :disabled="loading || !canCheckout"
              @click="handleCheckout"
            >
              {{ loading ? 'Оформляем...' : paymentMethod === 'online_card' ? 'Оплатить онлайн' : 'Оформить заказ' }}
            </button>
            <NuxtLink
              v-if="!authenticated"
              to="/login?next=/shop"
              class="text-sm text-brand font-semibold text-center no-underline hover:underline"
            >
              Войти или зарегистрироваться
            </NuxtLink>
          </div>
        </template>

      </div>
    </div>
  </Teleport>
</template>
