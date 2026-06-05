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

// CDEK
const cdekPvz = ref<{ code: string; address: string; city: string } | null>(null)
const cdekTariff = ref<{ code: number; sum: number; daysMin: number; daysMax: number } | null>(null)

// Map state
const mapContainerRef = ref<HTMLElement | null>(null)
const cdekContainerRef = ref<HTMLElement | null>(null)
const mapStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const cdekStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
let mapInstance: any = null
let mapPlacemark: any = null
let ymapsReadyPromise: Promise<void> | null = null
let cdekWidgetInstance: any = null

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

// Reset delivery state on scope change
watch(deliveryScope, () => {
  selectedAddress.value = ''
  selectedCoords.value = null
  addressInZone.value = null
  cdekPvz.value = null
  cdekTariff.value = null
  mapStatus.value = 'idle'
  cdekStatus.value = 'idle'
  mapInstance = null
  cdekWidgetInstance = null
})

watch(deliveryType, () => {
  if (deliveryType.value === 'pickup') {
    mapStatus.value = 'idle'
    cdekStatus.value = 'idle'
    mapInstance = null
    cdekWidgetInstance = null
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

// ── CDEK widget lazy loading ──

async function initCdekWidget() {
  if (cdekStatus.value === 'ready' || cdekStatus.value === 'loading') return
  cdekStatus.value = 'loading'
  try {
    // CDEK widget v3 uses vue-yandex-maps@2.1.2 which loads Yandex Maps v3 (ymaps3) internally.
    // Don't pre-load ymaps v2.1 here — it uses a different global (ymaps vs ymaps3)
    // and mixing both on the same page causes the instability CDEK warns about.
    await ensureCdekScript()
    await nextTick()
    if (!cdekContainerRef.value) { cdekStatus.value = 'error'; return }

    const CDEKWidget = (window as any).CDEKWidget
    if (!CDEKWidget) { cdekStatus.value = 'error'; return }

    const goods = props.cart.map(item => ({
      weight: 1000,
      length: 10,
      width: 10,
      height: 10,
    }))

    cdekWidgetInstance = new CDEKWidget({
      root: cdekContainerRef.value.id,
      apiKey: config.public.yandexMapsJsApiKey,
      servicePath: '/api/delivery/cdek-proxy',
      // Координаты [lon, lat] Орла — избегаем строки, иначе виджет вызывает
      // geocode-maps.yandex.ru напрямую из браузера (ключ JS API для этого не подходит).
      defaultLocation: [36.059345, 52.971119],
      // from как строку CDEK не распознаёт (v2_sender_location_not_recognized).
      // Передаём объект с postal_code — он универсален (коды городов CDEK
      // могут отличаться между тестом и продом, индекс — нет).
      from: { country_code: 'RU', city: 'Орёл', postal_code: 302000 },
      // Только ПВЗ/постаматы. Курьер «до двери» отключён: он требует геокодирования
      // адреса получателя, а виджет геокодит своим JS-API-ключом (geocode-maps.yandex.ru
      // 403 — Геокодер HTTP API висит на отдельном ключе, не на JS API). Без курьера
      // геокодер не нужен, и уходит переключатель «До двери/До склада».
      hideDeliveryOptions: { door: true, office: false },
      goods,
      onReady() {
        cdekStatus.value = 'ready'
      },
      onChoose(_type: string, tariff: any, point: any) {
        cdekPvz.value = {
          code: point?.code ?? '',
          address: point?.address_full ?? point?.location?.address ?? '',
          city: point?.location?.city ?? point?.city ?? '',
        }
        cdekTariff.value = {
          code: tariff?.tariff_code ?? 0,
          sum: Math.round(tariff?.delivery_sum ?? 0),
          daysMin: tariff?.period_min ?? 0,
          daysMax: tariff?.period_max ?? 0,
        }
      },
    })
  }
  catch (err) {
    console.error('[cdek] widget init failed', err)
    cdekStatus.value = 'error'
  }
}

let cdekScriptPromise: Promise<void> | null = null
function ensureCdekScript(): Promise<void> {
  if (!import.meta.client) return Promise.resolve()
  if ((window as any).CDEKWidget) return Promise.resolve()
  if (cdekScriptPromise) return cdekScriptPromise
  cdekScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@cdek-it/widget@3'
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
  return cdekScriptPromise
}

// Watch for scope change to auto-init map/widget
watch([deliveryScope, deliveryType], async ([scope, type]) => {
  if (type !== 'delivery') return
  await nextTick()
  if (scope === 'orel' && mapStatus.value === 'idle') {
    initOrelMap()
  }
  else if (scope === 'russia' && cdekStatus.value === 'idle') {
    initCdekWidget()
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

              <!-- Доставка по России (CDEK) -->
              <template v-if="deliveryScope === 'russia'">
                <div
                  v-if="cdekStatus === 'idle'"
                  class="h-[280px] bg-[#f0f4f8] rounded-xl flex items-center justify-center cursor-pointer border border-[#e0e0e0] hover:border-brand transition-colors"
                  @click="initCdekWidget"
                >
                  <div class="flex flex-col items-center gap-2 text-[#888]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <span class="text-sm font-medium">Выбрать пункт выдачи СДЭК</span>
                  </div>
                </div>
                <div
                  v-if="cdekStatus === 'loading'"
                  class="h-[280px] bg-[#f0f4f8] rounded-xl flex items-center justify-center border border-[#e0e0e0]"
                >
                  <span class="text-sm text-[#888]">Загрузка виджета СДЭК…</span>
                </div>
                <div
                  v-if="cdekStatus === 'error'"
                  class="h-[280px] bg-[#f0f4f8] rounded-xl flex items-center justify-center border border-[#e0e0e0]"
                >
                  <span class="text-sm text-red-500">Не удалось загрузить виджет СДЭК.</span>
                </div>
                <div
                  id="cdek-widget-container"
                  ref="cdekContainerRef"
                  class="rounded-xl border border-[#e0e0e0]"
                  :class="cdekStatus !== 'ready' && cdekStatus !== 'loading' ? 'hidden' : ''"
                  style="min-height: 520px"
                />
                <!-- Selected PVZ info -->
                <div v-if="cdekPvz" class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
                  <div class="font-semibold text-green-800">ПВЗ выбран: {{ cdekPvz.city }}</div>
                  <div class="text-green-700 mt-0.5">{{ cdekPvz.address }}</div>
                  <div v-if="cdekTariff" class="text-green-600 mt-1 font-semibold">
                    Стоимость доставки: {{ formatPrice(cdekTariff.sum) }}
                    <span v-if="cdekTariff.daysMin">· {{ cdekTariff.daysMin }}–{{ cdekTariff.daysMax }} дн.</span>
                  </div>
                </div>
                <p v-else-if="cdekStatus !== 'idle'" class="text-xs text-[#aaa]">Выберите пункт выдачи на карте</p>
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
                  class="flex-1 py-2.5 text-sm font-semibold border-l border-[#e0e0e0] transition-colors"
                  :class="paymentMethod === 'cash' ? 'bg-brand text-white' : 'bg-white text-[#444] hover:bg-[#f5f5f5]'"
                  @click="paymentMethod = 'cash'"
                >Наличными</button>
              </div>
              <p v-if="paymentMethod === 'online_card'" class="text-xs text-[#888] mt-1.5 px-0.5">Безопасная оплата через ЮKassa</p>
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
